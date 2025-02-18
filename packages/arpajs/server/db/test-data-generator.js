'use strict'

import _ from 'lodash'
import * as utils from '@digabi/js-utils'
const { examValidatorAbitti: examValidator } = utils
import BPromise from 'bluebird'
const { using } = BPromise
import * as examDb from './exam-data'
import config from '../config/configParser'
import { pgrm } from './local-pg-resource-management'
import { v4 as createRandomUUID } from 'uuid'
import { testDataGenerator } from '@digabi/js-test-utils'
const { createExamContent } = testDataGenerator
import R from 'ramda'
import * as studentData from './student-data'
import * as L from 'partial.lenses'

// This insertExamAndAnswerDataForUser API supports defaults at every level.
// Any value can be left out and the defaults from the object defaultParameters defined below will be merged for it.
//
// Historical note: This API replaced both createExamAndAnswer and createExamAndAnswersByQuestionType.
//
// Returns an object with contains various IDs and handles to the generated data.
//
// Data is generated using 1 connection to avoid race conditions.
export function insertExamAndAnswerDataForUser(userUuid, params = {}) {
  return using(pgrm.getConnection(), connection =>
    insertExamAndAnswerDataForUserWithConnection(userUuid, connection, params)
  )
}

function insertExamAndAnswerDataForUserWithConnection(userUuid, connection, params = {}) {
  const defaultParameters = {
    examUuid: createRandomUUID(),
    studentCount: 1,
    locked: true,
    studentsWithEmailCount: 1,
    examAndAnswerData: {
      text: { questionCount: 1, answerCount: 1 },
      richText: { questionCount: 0, answerCount: 0 },
      multichoice: { questionCount: 0, answerCount: 0 },
      multichoiceGap: { questionCount: 0, answerCount: 0 }
    }
  }

  const withDefaults = _.merge({}, defaultParameters, params)

  const examAndAnswerData = withDefaults.examAndAnswerData

  return createExamForUserWithConnection(userUuid, connection, {
    locked: withDefaults.locked,
    examUuid: withDefaults.examUuid,
    textQuestionCount: examAndAnswerData.text.questionCount,
    attachmentTextQuestionCount: examAndAnswerData.richText.questionCount,
    multichoiceQuestionCount: examAndAnswerData.multichoice.questionCount,
    multichoiceGapQuestionCount: examAndAnswerData.multichoiceGap.questionCount,
    content: withDefaults.content
  }).then(exam =>
    createHeldExamWithConnection(connection, exam).then(heldExamUuid =>
      createStudentsWithConnection(connection, withDefaults.studentCount, withDefaults.studentsWithEmailCount)
        .then(students =>
          BPromise.join(
            students,
            BPromise.mapSeries(students, student =>
              createTextAnswersForExamForStudentWithConnection(
                connection,
                heldExamUuid,
                student.uuid,
                examAndAnswerData.text.answerCount
              )
            ),
            BPromise.mapSeries(students, student =>
              createRichTextAnswersForExamForStudentWithConnection(
                connection,
                heldExamUuid,
                student.uuid,
                examAndAnswerData.richText.answerCount
              )
            ),
            BPromise.mapSeries(students, student =>
              createMultichoiceAnswersForExamForStudentWithConnection(
                connection,
                heldExamUuid,
                student.uuid,
                examAndAnswerData.multichoice.answerCount
              )
            ),
            BPromise.mapSeries(students, student =>
              createMultichoiceGapAnswersForExamForStudentWithConnection(
                connection,
                heldExamUuid,
                student.uuid,
                examAndAnswerData.multichoiceGap.answerCount
              )
            )
          )
        )
        .spread((students, textAnswerData, richTextAnswerData, multichoiceAnswerData, multichoiceGapAnswerData) => {
          const answerPapersAndAnswers = _.flattenDeep([
            textAnswerData,
            richTextAnswerData,
            multichoiceAnswerData,
            multichoiceGapAnswerData
          ])
          return {
            heldExamUuid,
            exam,
            students,
            answerPapersAndAnswers,
            answerPaperIds: _.union(_.map(answerPapersAndAnswers, 'answerPaperId')),
            answerIds: _.flatten(_.map(answerPapersAndAnswers, 'answerIds')),
            textAnswers: _.flatten(_.map(textAnswerData, 'answerIds')),
            richTextAnswers: _.flatten(_.map(richTextAnswerData, 'answerIds')),
            multichoiceAnswers: _.flatten(_.map(_.flatten(multichoiceAnswerData), 'answerIds')),
            multichoiceGapAnswers: _.flatten(_.map(_.flatten(multichoiceGapAnswerData), 'answerIds'))
          }
        })
    )
  )
}

function insertExamForUserIntoDb(
  connection,
  userId,
  examUuid,
  examContent,
  password,
  locked,
  accessible,
  attachmentsFilename,
  contentValid
) {
  return BPromise.resolve(password || utils.generatePassphraseAsync(config.passphraseWordList))
    .then(passphrase =>
      connection.queryAsync(
        ` INSERT INTO exam (
            exam_uuid,
            content,
            title,
            locked,
            password,
            accessible,
            attachments_filename,
            content_valid,
            user_account_id,
            creation_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
        [
          examUuid,
          examContent,
          examContent.title,
          locked,
          passphrase,
          accessible,
          attachmentsFilename,
          contentValid,
          userId
        ]
      )
    )
    .then(() => examDb.getExamWithConnection(connection, examUuid))
}

function createExamForUserAndPutIntoDb(userId, overridesOrExam, dbFunc) {
  const defaults = {
    locked: true,
    examUuid: createRandomUUID(),
    accessible: false,
    attachmentsFilename: null
  }
  const examFields = _.assign(defaults, overridesOrExam)
  const content = L.isDefined('content', overridesOrExam) ? overridesOrExam.content : createExamContent(examFields) // hack to make it possible to use actual exam instead of generating it
  const contentValid = examValidator.validateExamContentFields(content).valid

  return dbFunc(
    userId,
    examFields.examUuid,
    content,
    examFields.password,
    examFields.locked,
    examFields.accessible,
    examFields.attachmentsFilename,
    contentValid
  )
}

function createExamForUserWithConnection(userId, connection, overrides) {
  return createExamForUserAndPutIntoDb(userId, overrides, R.partial(insertExamForUserIntoDb, [connection]))
}

export function createExamForUser(userId, overridesOrExam) {
  return using(pgrm.getConnection(), connection =>
    createExamForUserAndPutIntoDb(userId, overridesOrExam, R.partial(insertExamForUserIntoDb, [connection]))
  )
}

function createStudentsWithConnection(connection, count, emailCount) {
  return BPromise.mapSeries(_.range(count), i => {
    const student = {
      uuid: createRandomUUID(),
      firstNames: `firstnames_${Math.random()}`,
      lastName: `lastname_${Math.random()}`,
      email: i < emailCount ? randomEmailAddress() : null
    }

    return studentData.addStudentWithTx(connection, student).then(() => student)

    function randomEmailAddress() {
      return `generated_${Math.random()}@invalid.x`
    }
  })
}

function createHeldExamWithConnection(connection, exam) {
  return connection
    .queryAsync('INSERT into held_exam (exam_uuid) values ($1) RETURNING held_exam_uuid', [exam.examUuid])
    .then(result => result.rows[0].held_exam_uuid)
}

function createTextAnswersForExamForStudentWithConnection(connection, heldExamUuid, studentUuid, count) {
  const answerText = 'answer plaintext'
  const insertAnswer = answerPaperId => questionId =>
    connection.queryAsync(
      'INSERT INTO answer (answer_paper_id, answer_content, question_id) VALUES ($1, $2, $3) RETURNING answer_id',
      [
        answerPaperId,
        {
          type: 'text',
          value: answerText,
          characterCount: answerText.replace(/(\r\n|\n|\r|\s)/g, '').length
        },
        questionId
      ]
    )

  return answerPaperIdForStudentWithConnection(connection, studentUuid, heldExamUuid).then(answerPaperId =>
    BPromise.mapSeries(_.range(1, count + 1), insertAnswer(answerPaperId)).then(answerInsertResults => ({
      answerPaperId: answerPaperId,
      answerIds: _(answerInsertResults).map('rows').flatten().map('answer_id').map(_.parseInt).value()
    }))
  )
}

function createRichTextAnswersForExamForStudentWithConnection(connection, heldExamUuid, studentUuid, count) {
  const answerText = `answer rich <img src="/math.svg?latex=a^2%2bb^2=c^2"/> Text<br>Lorem ipsum<br><br><br>Vivamus venenatis<br><br><br>Phasellus tempus<br><br>Morbi<br><img alt="x" src="/math.svg?latex=x"/>+<img alt="y" src="/math.svg?latex=y"/> = y + x`

  const insertAnswer = answerPaperId => questionId =>
    connection.queryAsync(
      'INSERT INTO answer (answer_paper_id, answer_content, question_id) VALUES ($1, $2, $3) RETURNING answer_id',
      [
        answerPaperId,
        {
          type: 'richText',
          value: answerText,
          characterCount: answerText.length
        },
        questionId
      ]
    )

  return answerPaperIdForStudentWithConnection(connection, studentUuid, heldExamUuid).then(answerPaperId =>
    connection
      .queryAsync('SELECT content FROM exam NATURAL JOIN held_exam where held_exam_uuid = $1', [heldExamUuid])
      .then(content =>
        _.map(content.rows[0].content.sections, section =>
          _(section.questions)
            .filter(q => q.screenshotExpected === true)
            .map(rtQuestion => rtQuestion.id)
            .value()
        )
      )
      .then(rtIds => BPromise.mapSeries(rtIds[0].slice(0, count), insertAnswer(answerPaperId)))
      .then(answerInsertResults =>
        answerInsertResults.length ? createNewResult(answerPaperId, answerInsertResults) : []
      )
  )

  function createNewResult(apId, aInsertResult) {
    return {
      answerPaperId: apId,
      answerIds: _(aInsertResult).map('rows').flatten().map('answer_id').map(_.parseInt).value()
    }
  }
}

function createMultichoiceAnswersForExamForStudentWithConnection(connection, heldExamUuid, studentUuid, count) {
  const nestChoiceGroups = result =>
    _.map(result.rows[0].content.sections, section =>
      _(section.questions)
        .filter(q => q.type === 'choicegroup')
        .map(choiceGroupQuestion => ({
          questionId: choiceGroupQuestion.id,
          choices: _.map(choiceGroupQuestion.choices, choice => ({
            id: choice.id,
            options: _.map(choice.options, option => option.id)
          }))
        }))
        .value()
    )

  return answerPaperIdForStudentWithConnection(connection, studentUuid, heldExamUuid).then(answerPaperId =>
    connection
      .queryAsync('SELECT content FROM exam NATURAL JOIN held_exam where held_exam_uuid = $1', [heldExamUuid])
      .then(nestChoiceGroups)
      .then(choiceGroupsNested => insertChoiceAnswers(connection, answerPaperId, count, choiceGroupsNested, 'choice'))
  )
}

function createMultichoiceGapAnswersForExamForStudentWithConnection(connection, heldExamUuid, studentUuid, count) {
  const nestGapQuestions = section =>
    _(section.questions)
      .filter(q => q.type === 'multichoicegap')
      .map(gapQuestion => ({
        questionId: gapQuestion.id,
        choices: _(gapQuestion.content)
          .filter(c => c.type === 'gap')
          .map(gap => ({
            id: gap.id,
            options: _.map(gap.options, option => option.id)
          }))
          .value()
      }))
      .value()

  return answerPaperIdForStudentWithConnection(connection, studentUuid, heldExamUuid).then(answerPaperId =>
    connection
      .queryAsync('SELECT content FROM exam NATURAL JOIN held_exam where held_exam_uuid = $1', [heldExamUuid])
      .then(result => _.map(result.rows[0].content.sections, nestGapQuestions))
      .then(gapQuestionsNested => insertChoiceAnswers(connection, answerPaperId, count, gapQuestionsNested, 'gap'))
  )
}

function insertChoiceAnswers(connection, answerPaperId, count, choiceGroupsNested, answerType) {
  const choiceGroups = _.first(choiceGroupsNested)
  const answerCount = Math.min(count, choiceGroups.length)

  return BPromise.mapSeries(_.range(answerCount), answerIndex => {
    const choiceGroup = choiceGroups[answerIndex]

    const answerContent = _.map(_.range(choiceGroup.choices.length), i => {
      const availableOptions = choiceGroup.choices[i].options.length
      const selectedOption = choiceGroup.choices[i].options[i % availableOptions]

      return {
        questionId: choiceGroup.choices[i].id,
        content: {
          type: answerType,
          value: `${selectedOption}`
        }
      }
    })

    return connection
      .queryAsync(
        'INSERT INTO answer (answer_paper_id, answer_content, question_id) VALUES ($1, $2, $3) RETURNING answer_id',
        [answerPaperId, JSON.stringify(answerContent), choiceGroup.questionId]
      )
      .then(result => ({
        answerPaperId: answerPaperId,
        answerIds: _(result.rows).flatten().map('answer_id').map(_.parseInt).value()
      }))
  })
}

function answerPaperIdForStudentWithConnection(connection, studentUuid, heldExamUuid) {
  return connection
    .queryAsync(
      `
  WITH ins as (INSERT INTO answer_paper (held_exam_uuid, student_uuid, exam_started)
  VALUES ($1, $2, NOW())
  ON CONFLICT DO NOTHING
  RETURNING answer_paper_id)
  SELECT ins.answer_paper_id as answer_paper_id
  FROM ins
  UNION ALL
  (SELECT old.answer_paper_id as answer_paper_id
  FROM answer_paper as old
  WHERE old.held_exam_uuid = $1 AND old.student_uuid = $2)`,
      [heldExamUuid, studentUuid]
    )
    .then(result => _.first(result.rows).answer_paper_id)
}
