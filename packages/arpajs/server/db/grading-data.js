'use strict'

import _ from 'lodash'
import BPromise from 'bluebird'
const using = BPromise.using
import { pgrm } from '../db/local-pg-resource-management'
import * as studentDb from './student-data'
import { logger } from '../logger'
import { SQL } from 'sql-template-strings'
import { getUnixTime } from 'date-fns'
import { objectPropertiesToCamel } from '@digabi/database-utils'
import { DataError } from '@digabi/express-utils'
import { containsInvalidImgTags, sanitizeAnswerContent } from '@digabi/answer-utils'

export function importAnswers(examsWithAnswerPapers, screenshots, audios, serverEnvironmentData) {
  return using(pgrm.getTransaction(), async tx => {
    let serverEnvironmentId

    try {
      const binaryData = serverEnvironmentData.length > 0 ? JSON.parse(serverEnvironmentData) : undefined
      if (binaryData) {
        serverEnvironmentId = await tx
          .queryRowsAsync(
            `INSERT INTO server_environment (server_environment_data) VALUES ($1) returning server_environment_id AS "serverEnvironmentId"`,
            [binaryData]
          )
          .then(([{ serverEnvironmentId }]) => serverEnvironmentId)
      }
    } catch (err) {
      logger.warn(`Unable to store environment data '${serverEnvironmentData}'`, err.message)
      await tx.queryRowsAsync(`ROLLBACK; BEGIN`)
    }

    const attachmentMappings = await BPromise.mapSeries(
      examsWithAnswerPapers,
      importAnswerPapersForSingleExam(tx, serverEnvironmentId)
    ).filter(v => v)

    const screenshotMapping = attachmentMappings.map(x => x.screenshotMapping)
    const audioMapping = attachmentMappings.map(x => x.audioMapping)

    if (screenshotMapping.length) {
      await uploadScreenshotsInTx(tx, screenshots, [].concat(...screenshotMapping))
    }
    if (audioMapping.length) {
      await uploadAudiosInTx(tx, audios, [].concat(...audioMapping))
    }
  })
}

function importAnswerPapersForSingleExam(tx, serverEnvironmentId) {
  return async examWithAnswerPapers => {
    const examUuid = examWithAnswerPapers.examUuid
    const examType = examWithAnswerPapers.examType || 'json'
    const ktpVersion = examWithAnswerPapers.ktpVersion //It's ok if this is missing

    const result = await uploadAnswersInTx(tx, examUuid, examType, ktpVersion, examWithAnswerPapers.answerPapers)
    if (!result) {
      return
    }

    await upsertCalculatedScoresForMultiChoiceAnswersInTx(tx, result.heldExamUuid)
    if (serverEnvironmentId) {
      await mapServerEnvironmentToHeldExam(tx, serverEnvironmentId, result.heldExamUuid)
    }
    return { screenshotMapping: result.screenshotMapping, audioMapping: result.audioMapping }
  }
}

function mapServerEnvironmentToHeldExam(tx, serverEnvironmentId, heldExamUuid) {
  return tx.queryRowsAsync(
    `INSERT INTO server_environment_held_exam_map (server_environment_id, held_exam_uuid) VALUES ($1, $2)`,
    [serverEnvironmentId, heldExamUuid]
  )
}

export async function uploadAnswersInTx(tx, examUuid, examType, ktpVersion, answerPapers) {
  const result = await tx.queryAsync(
    'insert into held_exam (exam_uuid, held_exam_type, held_exam_ktp_version) select exam_uuid, $2 as held_exam_type, $3 as held_exam_ktp_version from exam where exam_uuid = $1 returning held_exam_uuid',
    [examUuid, examType, ktpVersion]
  )

  if (result.rows.length === 1) {
    const { heldExamUuid } = _.first(result.rows.map(objectPropertiesToCamel))
    const attachmentMappings = await BPromise.mapSeries(answerPapers, ap =>
      addASinglePaperAndConnectedStudent(ap, heldExamUuid)
    )
    const screenshotMapping = attachmentMappings.map(x => x.screenshotMapping)
    const audioMapping = attachmentMappings.map(x => x.audioMapping)

    return {
      heldExamUuid,
      screenshotMapping: [].concat(...screenshotMapping),
      audioMapping: [].concat(...audioMapping)
    }
  } else {
    return undefined
  }

  async function addASinglePaperAndConnectedStudent(ap, heldExamUuid) {
    const studentUuid = await addStudent(tx, ap.student)
    const answerPaperId = await addAnswerPaperWithConnection(
      studentUuid,
      heldExamUuid,
      ap.examStarted,
      ap.allowExternalComputer,
      tx
    )

    await Promise.all([
      addTextAnswersWithConnection(ap.answers, answerPaperId, tx),
      addMultiChoiceAnswersWithConnection(heldExamUuid, ap.answers, answerPaperId, tx),
      addAudioAnswersWithConnection(ap.answers, answerPaperId, tx)
    ])

    const screenshotMapping = (ap.screenshots || []).map(x => ({ answerPaperId, uuid: x }))
    const audioMapping = (ap.audios || []).map(x => ({ answerPaperId, id: x }))
    return { screenshotMapping, audioMapping }
  }

  function addStudent(tx, student) {
    return studentDb.addStudentWithTx(tx, student)
  }
}

function addMultiChoiceAnswersWithConnection(heldExamUuid, answers, answerPaperId, connection) {
  return multiChoiceQuestions(connection, heldExamUuid)
    .then(multiChoiceOptions =>
      BPromise.mapSeries(multiChoiceOptions, choiceGroup => {
        const answerContent = _(choiceGroup.choiceOptions)
          .map(choice => _.find(answers, answer => answer.questionId === choice.choiceId))
          .compact()
          .value()

        return addChoiceGroupAnswerWithConnection(_.uniq(answerContent), choiceGroup.id, answerPaperId, connection)
      })
    )
    .then(BPromise.all)
}

function addAnswerPaperWithConnection(studentUuid, heldExamUuid, examStarted, externalComputerAllowed, connection) {
  // language=PostgreSQL
  return connection
    .queryAsync(
      `
        insert into answer_paper (student_uuid, held_exam_uuid, exam_started, external_computer_allowed, created)
        values ($1, $2, $3, $4, now())
        returning answer_paper_id`,
      [studentUuid, heldExamUuid, examStarted, !!externalComputerAllowed]
    )
    .then(result => _.first(result.rows.map(objectPropertiesToCamel)).answerPaperId)
}

function addChoiceGroupAnswerWithConnection(answerContent, questionId, answerPaperId, connection) {
  // language=PostgreSQL
  return connection
    .queryAsync(
      `-- choice group answer
        insert into answer (answer_paper_id, answer_content, question_id) values ($1, $2, $3)
        returning answer_id`,
      [answerPaperId, JSON.stringify(answerContent), questionId]
    )
    .then(result => _.first(result.rows.map(objectPropertiesToCamel)).answerId)
}

function addTextAnswersWithConnection(answers, answerPaperId, connection) {
  const textAnswers = _.filter(answers, answerIsText)
  return BPromise.mapSeries(textAnswers, answer => {
    validateIfRichtTextAnswer(answer)
    return addTextAnswer(answer, answerPaperId)
  })

  function answerIsText(answer) {
    return answer.content.type === 'text' || answer.content.type === 'richText'
  }

  function validateIfRichtTextAnswer(answer) {
    if (answer.content.type === 'richText') {
      const stripped = answer.content.value.replaceAll(' alt ', ' ')
      const sanitized = sanitizeAnswerContent(stripped, {
        nonBooleanAttributes: []
      })
      if (sanitized !== stripped) {
        throwError('Answer meb contains un-sanitized answer.')
      } else if (containsInvalidImgTags(sanitized, logger)) {
        throwError('Answer meb contains answer with invalid img tag.')
      }
    }

    function throwError(msg) {
      logger.error(msg, {
        answerPaperId,
        questionId: answer.questionId,
        answer: JSON.stringify(answer).substring(0, 5000)
      })
      throw new DataError(msg, 403)
    }
  }

  function addTextAnswer(answer, answerPaperId) {
    // language=PostgreSQL
    return connection
      .queryAsync(
        `-- text answer
          insert into answer (answer_paper_id, answer_content, question_id) values ($1, $2, $3)
          returning answer_id`,
        [answerPaperId, answer.content, answer.questionId]
      )
      .then(result => _.first(result.rows.map(objectPropertiesToCamel)))
  }
}

function addAudioAnswersWithConnection(answers, answerPaperId, connection) {
  const audioAnswers = answers.filter(a => a.content.type === 'audio')
  return BPromise.mapSeries(audioAnswers, answer => addAudioAnswer(answer, answerPaperId))

  function addAudioAnswer(answer, answerPaperId) {
    // language=PostgreSQL
    return connection
      .queryAsync(
        `insert into answer (answer_paper_id, answer_content, question_id) values ($1, $2, $3)
          returning answer_id`,
        [answerPaperId, answer.content, answer.questionId]
      )
      .then(result => _.first(result.rows.map(objectPropertiesToCamel)))
  }
}

function uploadScreenshotsInTx(tx, screenshotFiles, screenshotMapping) {
  return BPromise.mapSeries(_.keys(screenshotFiles), insertScreenshot)

  function insertScreenshot(filename) {
    const uuid = filename.replace('.png', '')
    const findResult = screenshotMapping.find(x => x.uuid === filename)
    const answerPaperId = findResult ? findResult.answerPaperId : null
    // TODO: Use native postgres driver or use HCP
    // language=PostgreSQL
    return tx.queryAsync(
      `insert into screenshots (screenshot_uuid, answer_paper_id, content) values ($1, $2, $3) on conflict do nothing`,
      [uuid, answerPaperId, screenshotFiles[filename]]
    )
  }
}

function uploadAudiosInTx(tx, audioFiles, audioMapping) {
  return BPromise.mapSeries(_.keys(audioFiles), insertAudio)
  function insertAudio(filename) {
    const findResult = audioMapping.find(x => x.id === filename)
    const answerPaperId = findResult ? findResult.answerPaperId : null
    return tx.queryAsync(
      `insert into audio (audio_id, answer_paper_id, content) values ($1, $2, $3) on conflict do nothing`,
      [filename, answerPaperId, audioFiles[filename]]
    )
  }
}

export function upsertCalculatedScoresForMultiChoiceAnswersInTx(tx, heldExamUuid) {
  // language=PostgreSQL
  return multiChoiceQuestions(tx, heldExamUuid).then(multiChoiceOptions =>
    BPromise.mapSeries(multiChoiceOptions, choiceGroup =>
      tx
        .queryAsync(
          `
            select
              answer_id,
              answer_content
            from answer
              natural join answer_paper
              natural join held_exam
            where held_exam_uuid=$1 and question_id=$2 and held_exam.held_exam_deletion_date is null`,
          [heldExamUuid, choiceGroup.id]
        )
        .then(result =>
          BPromise.mapSeries(result.rows.map(objectPropertiesToCamel), row => {
            const scoreValue = choiceGroup.maxScore
              ? getPointsForAnswersWithMaxScore(choiceGroup, row.answerContent)
              : getPointsForAnswersWithoutMaxScore(choiceGroup.choiceOptions, row.answerContent)
            return upsertScoreInTx(tx, row.answerId, scoreValue, true)
          })
        )
    )
  )

  function getPointsForAnswersWithoutMaxScore(optionMap, answerContent) {
    const studentPoints = answerContent
      .map(answer => {
        const answerValue = parseInt(answer.content.value, 10)
        const questionId = answer.questionId
        const option = optionMap.find(option => option.optionId == answerValue && option.choiceId == questionId)
        return option?.score ?? 0
      })
      .reduce((total, current) => total + current, 0)
    return studentPoints < 0 ? 0 : studentPoints
  }

  function getPointsForAnswersWithMaxScore(choiceGroup, answerContent) {
    const correctOptions = choiceGroup.choiceOptions.filter(o => o.correct === true)
    const correctChoices = numberOfCorrectChoices(correctOptions, answerContent)
    const totalChoices = correctOptions.length
    const score = totalChoices ? Math.round((correctChoices / totalChoices) * choiceGroup.maxScore) : 0
    return score
  }

  function numberOfCorrectChoices(correctChoiceOptions, studentAnswers) {
    return _.filter(correctChoiceOptions, hasCorrectAnswerForChoice).length

    function hasCorrectAnswerForChoice(choice) {
      const correctOption = _.find(
        studentAnswers,
        answer => answer.questionId === choice.choiceId && parseInt(answer.content.value, 10) === choice.optionId
      )
      return correctOption !== undefined
    }
  }
}

function multiChoiceQuestions(tx, heldExamUuid) {
  // postgres 9.3 and -> vs json_extract_path
  return tx
    .queryRowsAsync(
      `
          select content -> 'sections' as sections, grading_structure AS "gradingStructure"
          from exam
          natural join held_exam
          where held_exam_uuid=$1 and held_exam.held_exam_deletion_date is null limit 1`,
      [heldExamUuid]
    )
    .then(_.first)
    .then(({ sections, gradingStructure }) => {
      const questions = gradingStructure ? gradingStructure.questions : _.flatMap(sections, 'questions')
      return _.union(
        _(questions)
          .filter(q => q.type === 'choicegroup')
          .map(choiceGroupQuestionOptions)
          .value(),
        _(questions)
          .filter(q => q.type === 'multichoicegap')
          .map(choiceGapQuestionOptions)
          .value()
      )
    })
    .then(nestedOptions => _.flatten(nestedOptions))

  function choiceGroupQuestionOptions(question) {
    return choiceQuestionOptions(question, 'choices', 'choice')
  }

  function choiceGapQuestionOptions(question) {
    return choiceQuestionOptions(question, 'content', 'gap')
  }

  function choiceQuestionOptions(question, fieldWithChoices, choiceTypeFilter) {
    return {
      id: question.id,
      maxScore: question.maxScore,
      choiceOptions: _(question[fieldWithChoices])
        .filter(c => c.type === choiceTypeFilter)
        .map(parseOptions)
        .flatten()
        .value()
    }
  }

  function parseOptions(choiceOrGap) {
    return _(choiceOrGap.options)
      .map(option => ({
        choiceId: choiceOrGap.id,
        optionId: option.id,
        correct: option.correct,
        score: Number.isInteger(option.score) ? option.score : null
      }))
      .value()
  }
}

export function upsertScore(answerId, score, automaticGrading) {
  return using(pgrm.getTransaction(), tx => upsertScoreInTx(tx, answerId, score, automaticGrading))
}

function upsertScoreInTx(tx, answerId, score, automaticGrading) {
  const validatedScore = automaticGrading ? BPromise.resolve() : validateScore(answerId, score)
  return validatedScore
    .then(() =>
      // language=PostgreSQL
      tx.queryAsync(
        `insert into score (score_value, answer_id, update_time)
          select
            $1,
            $2,
            now()
        on conflict (answer_id)
          do update set
            score_value = excluded.score_value,
            update_time = excluded.update_time`,
        [score, answerId]
      )
    )
    .then(() => ({ scoreValue: score, answerId }))

  function validateScore(answerId, score) {
    return score < 0
      ? BPromise.reject(new DataError('Score cannot be negative'))
      : score === null
        ? BPromise.resolve(true)
        : validateScoreQuery(answerId, score)
  }

  function validateScoreQuery(answerId, score) {
    // language=PostgreSQL

    return isXmlExamByAnswerId(answerId)
      .then(isXmlExam =>
        isXmlExam
          ? `select
        q->'maxScore' as maxscore,
        q->'type'     as questiontype
      from (select
              jsonb_array_elements(e.grading_structure->'questions') q,
              question_id
            from exam e
              natural join held_exam
              natural join answer_paper
              natural join answer
            where answer_id=$1
            ) s1
      where (q->>'id'):: int=question_id`
          : `select
        q->'maxScore' as maxscore,
        q->'type'     as questiontype
      from (select
              json_array_elements(s->'questions') q,
              question_id
            from (select
                    json_array_elements(e.content->'sections') s,
                    question_id
                  from exam e
                    natural join held_exam
                    natural join answer_paper
                    natural join answer
                  where answer_id=$1
                 ) s1
           ) s2
      where (q->>'id'):: int=question_id;`
      )
      .then(querySql => tx.queryAsync(querySql, [answerId]))
      .then(result => {
        if (result.rows.length === 0) {
          throw new DataError(`No question found for answer id ${answerId}`)
        }

        const maxScore = result.rows[0].maxscore
        if (score > maxScore) {
          throw new DataError(`Score is higher than maxScore for answer id ${answerId}`)
        }

        const questionType = result.rows[0].questiontype
        if (!automaticGrading && ['choicegroup', 'multichoicegap'].includes(questionType)) {
          throw new DataError('Cannot give score to automatically graded questions')
        }
        return
      })
  }

  async function isXmlExamByAnswerId(answerId) {
    const result = await tx.queryAsync(
      `
        select content_xml as "contentXml"
        from answer
        natural join answer_paper
        natural join held_exam
        natural join exam
        where answer_id = $1 and content_xml IS NOT NULL
      `,
      [answerId]
    )

    return result.rows && result.rows.length === 1
  }
}

export async function getGradingAccessDeniedForAnswer(answerId) {
  const accessDeniedResult = await pgrm.queryRowsAsync(
    'SELECT pregrading_finished_at IS NOT NULL as access_denied FROM answer WHERE answer_id = $1',
    [answerId]
  )

  return accessDeniedResult[0].access_denied
}

export function upsertComment(answerId, comment) {
  return using(pgrm.getTransaction(), tx =>
    // language=PostgreSQL
    tx.queryAsync(
      `insert into score (comment, answer_id, update_time)
      select
        $1,
        $2,
        now()
    on conflict (answer_id)
      do update set
        comment = excluded.comment,
        update_time = excluded.update_time`,
      [comment, answerId]
    )
  )
}

export function upsertGradingMetadata(answerId, metadata) {
  return using(pgrm.getTransaction(), tx =>
    // language=PostgreSQL
    tx.queryAsync(
      `insert into score (metadata, answer_id, update_time)
          select
            $1,
            $2,
            now()
        on conflict (answer_id)
          do update set
            metadata = excluded.metadata,
            update_time = excluded.update_time`,
      [metadata, answerId]
    )
  )
}

export function updateGradingText(answerPaperId, gradingText) {
  const text = _.isEmpty(gradingText) ? null : gradingText
  // language=PostgreSQL
  return using(pgrm.getTransaction(), tx =>
    tx.queryAsync(`update answer_paper set grading_text = $1 where answer_paper_id = $2`, [text, answerPaperId])
  )
}

export async function setMultipleAnswerPregradingFinishedAt(answerIds, pregradingFinishedAt = new Date()) {
  await pgrm.queryAsync(
    SQL`UPDATE answer SET pregrading_finished_at = to_timestamp(${getUnixTime(pregradingFinishedAt)}) WHERE answer_id = ANY(${answerIds}::INTEGER[])`
  )

  const pregradingRows = await pgrm.queryRowsAsync(
    'SELECT * FROM score NATURAL JOIN answer NATURAL JOIN answer_paper WHERE answer_id = ANY($1::INTEGER[])',
    [answerIds]
  )

  return pregradingRows.map(row => ({
    scoreValue: row.score_value,
    updateTime: row.update_time,
    pregradingFinishedAt: row.pregrading_finished_at,
    answerId: row.answer_id,
    studentUuid: row.student_uuid,
    // a bit dirty, but querying this would be complicated in this case. Let's assume cell is read only always after marked done
    userCanScore: false
  }))
}

export async function clearPregradingFinishedAtForAnswer(answerId) {
  await pgrm.queryAsync(SQL`UPDATE answer SET pregrading_finished_at = NULL WHERE answer_id = ${answerId}`)

  const pregradingRows = await pgrm.queryRowsAsync(
    SQL`SELECT * FROM score NATURAL JOIN answer NATURAL JOIN answer_paper WHERE answer_id = ${answerId}`
  )

  return pregradingRows.map(row => ({
    scoreValue: row.score_value,
    updateTime: row.update_time,
    pregradingFinishedAt: null,
    answerId: row.answer_id,
    studentUuid: row.student_uuid,
    // a bit dirty, but querying this would be complicated in this case. Let's assume that if
    // user can revert the sending, she then can always edit the cell after doing it
    userCanScore: true
  }))
}
