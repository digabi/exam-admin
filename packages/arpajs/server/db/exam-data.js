'use strict'

import { logger } from '../logger'
import _ from 'lodash'
import * as L from 'partial.lenses'
import R from 'ramda'
import BPromise from 'bluebird'
import SQL from 'sql-template-strings'

const { using } = BPromise
import { pgrm } from './local-pg-resource-management'
import * as utils from '@digabi/js-utils'
const {
  examValidatorAbitti: examValidator,
  exc: { AppError, DataError },
  generatePassphraseAsync
} = utils

import config from '../config/configParser'
import { parseExam } from '@digabi/exam-engine-mastering'
import { tryXmlMasteringWithShuffle } from '../exam/xml-mastering'

const assertSingleRowResponse = errorMsg => rows => {
  if (rows.length !== 1) {
    logger.error('More than one row found', { error: errorMsg })
    throw new AppError('More than one row found')
  }
  return rows[0]
}

const assertAtLeastOneRowResult = (errorMsg, status) => result => {
  if (result.rowCount === 0) {
    logger.error('Data was not found', { error: errorMsg })
    throw new AppError('Data was not found', status)
  }
  return result.rows
}

export const getExamContent = apId =>
  pgrm
    .queryRowsAsync(
      SQL` SELECT
          exam_uuid as "examUuid",
          held_exam_uuid as "heldExamUuid",
          title,
          content,
          content_xml as "contentXml",
          grading_structure as "gradingStructure"
        FROM exam
          natural join held_exam
          natural join answer_paper
        where answer_paper_id = ${apId} and deletion_date IS NULL`
    )
    .then(L.get(0))

export const getAccountForExamUuid = examUuid =>
  pgrm.queryRowsAsync(
    SQL` SELECT * from user_account 
      natural join exam
      where exam_uuid = ${examUuid}`
  )

export const doImpersonate = (userName, adminUserUsername) =>
  pgrm.queryRowsAsync(
    SQL`update session
set sess = jsonb_set(sess, '{passport,user}', (select to_jsonb(user_account_id :: text)
                                               from user_account
                                               where lower(user_account_username) = lower(${userName})))
where sid = (
select sid
from session
where sess -> 'passport' ->> 'user'=
      (select user_account_id::text
       from user_account
       where user_account_username = ${adminUserUsername})
order by expire desc limit 1
)`
  )

export const getExam = (examUuid, { includeDeleted } = { includeDeleted: false }) =>
  pgrm
    .queryRowsAsync(
      ` SELECT
          exam_uuid,
          content,
          content_xml,
          exam_language,
          title,
          locked,
          password,
          accessible,
          attachments_filename,
          content_valid,
          creation_date,
          deletion_date,
          CASE
            WHEN attachment.exam_uuid IS NULL
              THEN '[]'::json
            ELSE json_agg(attachment.display_name order by display_name)
          END AS attachments,
          CASE
            WHEN attachment.exam_uuid IS NULL
              THEN '{}'::json
            ELSE json_object_agg(COALESCE(attachment.display_name, ''), attachment.metadata order by display_name)
          END AS attachments_metadata,
          CASE
            WHEN attachment.exam_uuid IS NULL
              THEN '{}'::json
            ELSE json_object_agg(COALESCE(attachment.display_name, ''), attachment.mime_type order by display_name)
          END AS attachments_mimetype
        FROM exam NATURAL LEFT JOIN attachment
        WHERE exam_uuid = $1 and ($2 = true OR deletion_date IS NULL)
        GROUP BY exam_uuid, attachment.exam_uuid
        ORDER BY exam_uuid`,
      [examUuid, includeDeleted]
    )
    .then(getExamFromRows)

export const getExams = userId =>
  pgrm.queryRowsAsync(
    ` SELECT
        exam_uuid,
        title,
        locked,
        password,
        accessible,
        attachments_filename,
        content_valid,
        creation_date,
        deletion_date,
        xmlexists('/' passing by ref content_xml) as is_xml,
      CASE
        WHEN attachment.exam_uuid IS NULL
          THEN '[]'::json
        ELSE json_agg(attachment.display_name)
      END AS attachments
      FROM exam NATURAL LEFT JOIN attachment
      WHERE user_account_id = $1
      GROUP BY exam_uuid, attachment.exam_uuid
      ORDER BY exam_uuid`,
    [userId]
  )

export const getHeldExam = heldEexamUuid =>
  pgrm
    .queryRowsAsync(
      ` select
          exam_uuid as "examUuid",
          title,
          content,
          grading_structure as "gradingStructure",
          locked,
          answer_emails_sent as "answerEmailsSent",
          password,
          accessible,
          content_valid as "contentValid"
        from held_exam
          natural join exam
        where held_exam_uuid = $1`,
      [heldEexamUuid]
    )
    .then(R.head)

export const getScoreAverages = heldExamUuid =>
  pgrm
    .queryRowsAsync(
      SQL`
        WITH average_score_of_question AS (
              SELECT
                question_id,
                AVG(score_value) AS average
              FROM score
                NATURAL JOIN answer
                NATURAL JOIN answer_paper
                NATURAL JOIN held_exam
              WHERE held_exam_uuid = ${heldExamUuid}
              GROUP BY 1
          )
        SELECT json_agg(
                   json_build_object(
                       'questionId', question_id,
                       'average', average)
               ) AS score_averages
        FROM average_score_of_question`
    )
    .then(rows => (rows.length > 0 ? rows[0].score_averages || [] : []))

export const getExamWithConnection = (connection, examUuid) =>
  connection.queryRowsAsync('select * from exam where exam_uuid = $1', [examUuid]).then(getExamFromRows)

export const getExamStatusForUser = userId => BPromise.mapSeries(getExams(userId), formatExamStatus)

export const getExamPassword = examUuid =>
  pgrm.queryRowsAsync('select password from exam where exam_uuid = $1', [examUuid]).then(L.get([0, 'password']))

const shuffleOptions = L.modify([L.query('options'), L.partsOf([L.elems, L.propsExcept('id')])], _.shuffle)

export const lockExam = examUuid =>
  using(pgrm.getTransaction(), async tx => {
    const examOriginal = getExamFromRows(
      await tx.queryRowsAsync('select * from exam where exam_uuid = $1 for update', [examUuid])
    )

    if (!examOriginal) return undefined

    const exam = shuffleOptions(examOriginal)

    if (exam.content && !examValidator.validateExamContentFields(exam.content).valid) {
      throw new DataError(`Can't lock invalid exam! ${examUuid}`)
    }

    const rows = await tx.queryRowsAsync(
      ` update exam set
          locked = true,
          content = $2
        where exam_uuid = $1
        returning exam_uuid`,
      [examUuid, exam.content]
    )
    if (rows.length !== 1) {
      logger.error('Failed to lock exam', { examUuid })
      throw new AppError(`Failed to lock exam`)
    }
    return utils.objectPropertiesToCamel(rows[0])
  })

export const createExam = (examLanguage, title, userId, contentXml, validate) => {
  if (contentXml) {
    try {
      parseExam(contentXml, validate)
    } catch (err) {
      throw new DataError(err.message, 400)
    }
    return createExamWithXmlContent(contentXml, userId, title, true, { language: examLanguage })
  }
  return createExamWithContent(examLanguage, { title, instruction: '', sections: [] }, userId)
}

export const updateExamContent = (examUuid, content, examLanguage) => {
  const contentValid = examValidator.validateExamContentFields(content).valid
  return pgrm
    .queryRowsAsync(
      SQL`
      UPDATE exam SET content = ${content},
                      content_valid = ${contentValid},
                      exam_language = ${examLanguage},
                      title = ${content.title}
      WHERE exam_uuid = ${examUuid} AND NOT locked
      RETURNING exam_uuid`
    )
    .then(rows => {
      if (rows.length !== 1) throw new DataError(`Exam not found or exam locked: ${examUuid}`)
      return rows
    })
}

export const createExamWithContent = async (examLanguage, content, userId) =>
  insertExamContent(examLanguage, content, await generatePassphraseAsync(config.passphraseWordList), userId)

const insertExamContent = (examLanguage, content, passphrase, userId) => {
  const contentValid = examValidator.validateExamContentFields(content).valid
  return pgrm
    .queryRowsAsync(
      SQL`
      INSERT INTO exam (user_account_id, exam_language, content, title, password, content_valid, creation_date)
      VALUES (${userId}, ${examLanguage}, ${content}, ${content.title}, ${passphrase}, ${contentValid}, now())
      RETURNING exam_uuid, exam_language, content, title, locked, password, attachments_filename, content_valid, creation_date`
    )
    .then(assertSingleRowResponse('Failed to create exam!'))
    .then(formatExamStatus)
}

export const createExamWithXmlContent = async (content, userId, examTitle, contentValid, examDetails) =>
  insertXmlExamContent(
    content,
    await generatePassphraseAsync(config.passphraseWordList),
    userId,
    examTitle,
    contentValid,
    examDetails
  )

const insertXmlExamContent = (xmlContent, passphrase, userId, examTitle, contentValid, examDetails) => {
  const locked = false
  return pgrm
    .queryRowsAsync(
      SQL`INSERT INTO exam (user_account_id, content_xml, title, password, content_valid, locked, creation_date,
                                  exam_code, exam_period, exam_type, exam_language)
                VALUES (${userId}, ${xmlContent}, ${examTitle}, ${passphrase}, ${contentValid}, ${locked}, NOW(),
                        ${examDetails?.examCode}, ${examDetails?.examPeriod}, ${examDetails?.type},
                        ${examDetails?.language})
                RETURNING
                    exam_uuid,
                    content,
                    title,
                    locked,
                    password,
                    attachments_filename,
                    content_valid,
                    creation_date,
                    XMLEXISTS('/' PASSING BY REF content_xml) AS is_xml`
    )
    .then(assertSingleRowResponse('Failed to create exam!'))
    .then(formatExamStatus)
}

export const updateXmlExamContent = async (examUuid, examLanguage, title, contentXml, attachmentMetaData) => {
  let masteringResult
  try {
    masteringResult = await tryXmlMasteringWithShuffle({ examUuid, contentXml }, attachmentMetaData)
    const attachedFiles = _.keys(attachmentMetaData)
    const foundFiles = masteringResult.attachments.map(a => a.filename)
    const unattachedFiles = foundFiles.filter(file => !attachedFiles.includes(file))
    if (unattachedFiles.length > 0) {
      throw new DataError(`Following files are not attached: ${unattachedFiles.join(', ')}`, 400)
    }
  } catch (err) {
    throw new DataError(err.message, 400)
  }
  await pgrm
    .queryRowsAsync(
      SQL`
      update exam
      set content = NULL,
          title = ${title},
          exam_language = ${examLanguage},
          content_xml = ${contentXml}
      where exam_uuid = ${examUuid} and not locked
      returning exam_uuid`
    )
    .then(rows => {
      if (rows.length !== 1) throw new DataError(`Exam not found or exam locked: ${examUuid}`)
      return rows
    })
  return masteringResult
}

export const updateExamAttachmentsFilename = (examUuid, attachmentsFilename) =>
  updateExamZipFile(examUuid, 'attachments_filename', attachmentsFilename)

const updateExamZipFile = (examUuid, zipFieldName, zipFilename) =>
  pgrm
    .queryRowsAsync(
      ` update exam set ${zipFieldName} = $1
        where exam_uuid = $2
        returning exam_uuid`,
      [zipFilename, examUuid]
    )
    .then(rows => {
      if (rows.length !== 1) throw new DataError(`Exam not found or exam locked: ${examUuid}`)
      return rows
    })

export const updateExamAccessible = (examUuid, accessible) =>
  pgrm
    .queryRowsAsync('update exam set accessible = $1 where exam_uuid = $2 returning exam_uuid', [accessible, examUuid])
    .then(rows => {
      if (rows.length !== 1) throw new DataError(`Exam not found: ${examUuid}`)
      return rows
    })

const getExamFromRows = R.pipe(
  R.map(utils.objectPropertiesToCamel),
  R.map(
    R.pick([
      'examUuid',
      'examLanguage',
      'content',
      'contentXml',
      'title',
      'answerEmailsSent',
      'locked',
      'password',
      'accessible',
      'attachments',
      'attachmentsFilename',
      'attachmentsMetadata',
      'attachmentsMimetype',
      'deletionDate'
    ])
  ),
  R.head
)

export const getExamIdByAnswerId = answerId =>
  using(pgrm.getConnection(), connection =>
    connection.queryAsync(
      ` select held_exam.exam_uuid
        from answer natural join answer_paper natural join held_exam
        where answer.answer_id=$1 and held_exam.held_exam_deletion_date is null`,
      [answerId]
    )
  )
    .then(assertAtLeastOneRowResult(`Exam not found with answerId: ${answerId}`, 404))
    .then(L.get([0, L.reread(utils.objectPropertiesToCamel)]))

export const getExamIdByAnswerPaperId = answerPaperId =>
  using(pgrm.getConnection(), connection =>
    connection.queryAsync(
      ` select exam_uuid
        from answer_paper natural join held_exam
        where answer_paper_id=$1 and held_exam.held_exam_deletion_date is null`,
      [answerPaperId]
    )
  )
    .then(assertAtLeastOneRowResult(`Exam not found with answerPaperId: ${answerPaperId}`, 404))
    .then(L.get([0, L.reread(utils.objectPropertiesToCamel)]))

function getQuestionsByExamUuid(exams) {
  const questionsByExamUuid = exams.reduce((acc, questionRow) => {
    if (acc[questionRow.exam_uuid]) {
      acc[questionRow.exam_uuid].push(questionRow)
    } else {
      acc[questionRow.exam_uuid] = [questionRow]
    }
    return acc
  }, {})
  Object.keys(questionsByExamUuid).forEach(key =>
    questionsByExamUuid[key].map((questionRow, i) => {
      questionRow.id = (i + 1).toString()
      return questionRow
    })
  )
  return questionsByExamUuid
}

export const getPrivateExamQuestions = userId =>
  using(pgrm.getConnection(), connection =>
    connection
      .queryRowsAsync(
        SQL`WITH questions AS (
         SELECT creation_date,
           exam_uuid,
           user_account_id,
           title,
           unnest(xpath(
             '/e:exam/e:section/e:question',
             content_xml,
             ARRAY [ARRAY ['e','http://ylioppilastutkinto.fi/exam.xsd']])) AS xml_element
         FROM exam
         WHERE deletion_date IS NULL
         AND user_account_id = ${userId}
       ),
       fields_with_whitespace AS (
         SELECT creation_date,
           exam_uuid,
           title,
           coalesce((xpath('/e:question/e:question-title/text()', xml_element,
             ARRAY[ARRAY['e', 'http://ylioppilastutkinto.fi/exam.xsd']]))[1], '')::text AS question_title,
           xml_element
         FROM questions
      ),
      json_questions AS (
         SELECT creation_date, exam_uuid, '' AS exam_code, null::exam_type AS exam_type, exam_language, '' as exam_period, title, user_account_id, content_xml,
         LEFT(json_array_elements(json_array_elements((regexp_replace(content::text, '\\\\u0000', '', 'g')::json)->'sections')->'questions')->>'text', 10000) AS question_title
         FROM exam
         WHERE deletion_date IS NULL
         AND user_account_id = ${userId}
         AND content_xml IS NULL
      )

      SELECT creation_date,
        exam_uuid,
        (row_number() over ()) as display_number,
        REGEXP_REPLACE(REGEXP_REPLACE(title, '\\\\s+$', ''), '^\\\\s+', '')          AS title,
        REGEXP_REPLACE(REGEXP_REPLACE(question_title, '\\\\s+$', ''), '^\\\\s+', '') AS question_title,
        xml_element::text
      FROM fields_with_whitespace

      UNION SELECT creation_date, exam_uuid,
                   (row_number() over ()) AS display_number, title, question_title, NULL AS xml_element
        FROM json_questions
        WHERE question_title IS NOT NULL

      ORDER BY exam_uuid, display_number`
      )
      .then(questions => ({
        questions: getQuestionsByExamUuid(
          questions.map(exam => ({
            ...exam
          }))
        )
      }))
  )

export const getPublicExamQuestions = ({ examCode, examType, examLanguage, examinationCode }) =>
  using(pgrm.getConnection(), connection =>
    connection
      .queryRowsAsync(
        SQL`WITH questions AS (
          SELECT creation_date,
            exam_uuid,
            exam_code,
            exam_type,
            exam_language,
            title,
            exam_period,
            unnest(xpath(
              '/e:exam/e:section/e:question',
              content_xml,
              ARRAY [ARRAY ['e','http://ylioppilastutkinto.fi/exam.xsd']])) AS xml_element
          FROM exam
          WHERE deletion_date IS NULL
             AND (${examCode} = '' OR exam_code = ${examCode})
             AND (${examLanguage} = '' OR exam_language = NULLIF(${examLanguage}, '')::exam_language)
             AND (${examType} = '' OR exam_type = NULLIF(${examType}, '')::exam_type)
             AND (${examinationCode} = '' OR exam_period = ${examinationCode})
             AND user_account_id IS NULL
        )
       SELECT *,
         (row_number() over ()) as display_number,
         coalesce((xpath('/e:question/e:question-title/text()', xml_element,
                           ARRAY[ARRAY['e', 'http://ylioppilastutkinto.fi/exam.xsd']]))[1], '')::text AS question_title
       FROM questions
       ORDER BY exam_uuid, display_number`
      )
      .then(questions => ({
        questions: getQuestionsByExamUuid(
          questions.map(exam => ({
            ...exam,
            question_title: exam.question_title.trim(),
            exam_type: exam.exam_type ?? 'normal',
            examinationCode: exam.exam_period ?? ''
          }))
        )
      }))
  )

export const getPublicExamFilters = () =>
  using(pgrm.getConnection(), connection =>
    connection
      .queryRowsAsync(
        SQL`SELECT DISTINCT exam_code, exam_language, exam_type, exam_period, title
            FROM exam
            WHERE deletion_date IS NULL AND user_account_id IS NULL`
      )
      .then(exams => {
        const examCodes = new Set([])
        const examinationCodes = new Set([])
        const examLanguages = new Set([''])
        const examTypes = new Set([''])
        const examTitles = {}
        exams.forEach(exam => {
          examCodes.add(exam.exam_code ?? '')
          examTypes.add(exam.exam_type ?? 'normal')
          examLanguages.add(exam.exam_language ?? '')
          exam.exam_period && examinationCodes.add(exam.exam_period)
          const key = `${exam.exam_code}@${exam.exam_language}`
          if (exam.exam_code && !examTitles[key] && exam.exam_type === 'normal') {
            const splitTitle = exam.title.split('–')
            examTitles[key] = splitTitle[splitTitle.length - 1].trim()
          }
        })

        return {
          examCodes: Array.from(examCodes).sort(),
          examTypes: Array.from(examTypes).sort(),
          examLanguages: Array.from(examLanguages).sort(),
          examinationCodes: [''].concat(Array.from(examinationCodes).sort().reverse()),
          examTitles
        }
      })
  )

export const updateXmlExamPassword = (examUuid, userId, password) =>
  pgrm.queryAsync(
    `update exam set password = $1 where content_xml is not null and exam_uuid = $2 and user_account_id = $3`,
    [password, examUuid, userId]
  )

export const getGradingStatusForExams = async userAccountId => {
  const result = await pgrm.queryRowsAsync(
    // language=PostgreSQL
    SQL`select
          stats.uuid as uuid,
          title,
          uploaded,
          ap_count,
          answer_count,
          total_scored_count,
          manual_scored_count,
          pregrading_finished_count,
          creation_date,
          held_exam_deletion_date
        from
          ( select
              uuid,
              max(created)                as uploaded,
              count(distinct apid) :: int as ap_count,
              count(aid) :: int           as answer_count,
              count(sval) :: int          as total_scored_count,
              count(case when atype = 'text' or atype = 'richText' or atype = 'audio'
                then sval
                    else null end) :: int as manual_scored_count,
            count(finished) filter (where finished is not null) :: int as pregrading_finished_count
            from (select
                    ap.held_exam_uuid           as uuid,
                    ap.created                  as created,
                    ap.answer_paper_id          as apid,
                    a.answer_id                 as aid,
                    s.score_value               as sval,
                    a.answer_content ->> 'type' as atype,
                    a.pregrading_finished_at    as finished
                  from answer_paper ap
                    natural join held_exam
                    natural join exam
                    natural left join answer a
                    natural left join score s
                  where exam.user_account_id = ${userAccountId}
                    and deletion_date IS NULL) exam_answers
            group by uuid ) stats,
          ( select
              held_exam_uuid,
              title,
              creation_date,
              held_exam_deletion_date
            from exam
              natural join held_exam
            where exam.user_account_id = ${userAccountId} ) as titles
        where titles.held_exam_uuid = stats.uuid`
  )

  const exams = result.map(record => {
    const autogradedScores = record.total_scored_count - record.manual_scored_count
    return {
      uuid: record.uuid,
      title: record.title,
      uploaded: record.uploaded,
      answerPapers: record.ap_count,
      answers: record.answer_count,
      heldExamDeletionDate: record.held_exam_deletion_date,
      eventDate: record.uploaded,
      schoolAnonCode: record.uuid,
      examCode: '',
      pregradingScores: record.manual_scored_count,
      autogradedScores,
      pregradingFinishedCount: record.pregrading_finished_count,
      canBePregraded: record.pregrading_finished_count + autogradedScores < record.answer_count,
      pregradingDeadlines: {
        intDeadline: {
          target: 1
        },
        finalDeadline: {
          target: 1
        }
      }
    }
  })

  return _.orderBy(exams, ['uploaded', 'title'], ['desc', 'asc'])
}

const toggleHeldExamDelete = (heldExamUuid, exists) =>
  using(pgrm.getConnection(), connection =>
    connection.queryAsync(
      ` update held_exam set held_exam_deletion_date = case when $2 = true then null else now() end
        where held_exam_uuid =
          (select held_exam_uuid from held_exam natural join exam where held_exam_uuid=$1)
          returning held_exam_uuid as "heldExamUuid"`,
      [heldExamUuid, exists]
    )
  ).then(assertAtLeastOneRowResult(`Held exam not found: ${heldExamUuid}`, 404))

export const markHeldExamAsDeleted = heldExamUuid => toggleHeldExamDelete(heldExamUuid, false)

export const markHeldExamAsUndeleted = heldExamUuid => toggleHeldExamDelete(heldExamUuid, true)

export const examHasStudents = (examUuid, studentUuids) =>
  pgrm
    .queryRowsAsync(
      ` select count(*) > 0 as answers_exist
        from answer_paper natural join held_exam
        where exam_uuid = $1 and student_uuid = any($2::uuid[])`,
      [examUuid, studentUuids]
    )
    .then(L.get([0, 'answers_exist']))

const isEmptyFileError = e => e.constraint === 'size_positive'

export const addAttachmentForExam = ({ examUuid, displayName, size, mimeType, storageKey, metadata }) =>
  // eslint-disable-next-line promise/valid-params
  pgrm
    .queryRowsAsync(
      `INSERT INTO attachment (exam_uuid, display_name, storage_key, size, mime_type, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [examUuid, displayName, storageKey, size, mimeType, metadata]
    )
    .catch(isEmptyFileError, () => {
      throw new DataError('Adding of empty file attempted')
    })

export const upsertAttachmentForExam = ({ examUuid, displayName, size, mimeType, storageKey, metadata }) =>
  // eslint-disable-next-line promise/valid-params
  pgrm
    .queryRowsAsync(
      SQL`INSERT INTO attachment (exam_uuid, display_name, storage_key, size, mime_type, metadata)
      VALUES (${examUuid}, ${displayName}, ${storageKey}, ${size}, ${mimeType}, ${metadata})
      ON CONFLICT (exam_uuid, display_name)
        DO UPDATE SET
          storage_key = ${storageKey},
          size = ${size},
          mime_type = ${mimeType},
          metadata = ${metadata}`
    )
    .catch(isEmptyFileError, () => {
      throw new DataError('Adding of empty file attempted')
    })

const formatExamStatus = row => ({
  examUuid: row.exam_uuid,
  examLanguage: row.exam_language,
  title: row.title,
  valid: row.content_valid,
  locked: row.locked,
  password: row.password,
  hasAttachments: !!row.attachments_filename || (!R.isEmpty(row.attachments) && !R.isNil(row.attachments)),
  creationDate: row.creation_date,
  deletionDate: row.deletion_date,
  isXml: row.is_xml
})

export const deleteAttachment = storageKey =>
  pgrm.queryRowsAsync(`delete from attachment where storage_key = $1`, [storageKey])

export const ensureAttachmentFitsWithinLimits = (examUuid, newAttachmentLength) => {
  if (newAttachmentLength < 1) {
    throw new DataError(`Attachment size is ${newAttachmentLength}`, 400)
  }
  return pgrm
    .queryRowsAsync(
      ` select (coalesce(sum(size), 0) + $1::int) < $2::int as "attachmentFits"
        from attachment
        where exam_uuid = $3`,
      [newAttachmentLength, config.attachmentsLimitInBytes, examUuid]
    )
    .then(rows => {
      if (!L.get([0, 'attachmentFits'], rows)) {
        throw new DataError('Attachment size limit exceeded for exam', 413)
      }
      return
    })
}

export const getExamUuidByHeldExamUuid = heldExamUuid =>
  pgrm
    .queryRowsAsync(
      ` select exam_uuid as "examUuid"
        from held_exam
        where held_exam_uuid = $1 and held_exam_deletion_date IS NULL`,
      [heldExamUuid]
    )
    .then(L.get([0, 'examUuid']))

export const getMexOptOutForExam = async examUuid => {
  const [{ optOut }] = await pgrm.queryRowsAsync(
    `
      select user_account_mex_opt_out as "optOut"
      from exam
      natural join user_account
      where exam_uuid = $1
    `,
    [examUuid]
  )

  return optOut
}

export const isXmlExam = async examUuid => {
  const rows = await pgrm.queryRowsAsync(
    `
      select content_xml as "contentXml"
      from exam
      where exam_uuid = $1 and content_xml IS NOT NULL
    `,
    [examUuid]
  )

  return rows && rows.length === 1
}

export const updateGradingStructure = async (examUuid, gradingStructure) => {
  await using(pgrm.getTransaction(), async tx => {
    const isNullOrSame = L.get(
      [0, 'exists'],
      await tx.queryRowsAsync(
        `
        select exists(
          select 1
          from exam
          where exam_uuid=$1 AND (grading_structure is null OR grading_structure=$2)
        )
      `,
        [examUuid, gradingStructure]
      )
    )

    // Modifying existing grading structure is not supported: If it would be, end user would
    // be in trouble with old answers that can no longer be correctly graded. User is
    // required to recreate the exam from transfer zip.
    if (isNullOrSame) {
      const rows = await tx.queryRowsAsync(
        ` update exam set grading_structure = $1
          where exam_uuid = $2
          returning exam_uuid`,
        [gradingStructure, examUuid]
      )
      if (rows.length !== 1) throw new DataError(`Exam not found: ${examUuid}`)
      return rows
    } else {
      logger.error('Modifying grading structure not supported', { examUuid })
      throw new AppError('Modifying grading structure not supported', 409)
    }
  })
}
