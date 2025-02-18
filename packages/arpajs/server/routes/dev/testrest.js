'use strict'

import express from 'express'
const router = express.Router()
import bodyParser from 'body-parser'
import Promise from 'bluebird'
const { using } = Promise
import _ from 'lodash'
import * as examDb from '../../db/exam-data'
import * as gradingDb from '../../db/grading-data'
import { expressUtils } from '@digabi/js-utils'
import { pgrm, runMigrations } from '../../db/local-pg-resource-management'
import * as testData from '../../db/test-data-generator'
import * as testDataXml from '../../db/test-data-generator-xml'
import fs from 'fs'
import { SQL } from 'sql-template-strings'
import * as token from '../../crypt/token'

router.use(bodyParser.json())
const createDbSql = fs.readFileSync(`${__dirname}/../../../db/schema/create_db.sql`, { encoding: 'utf8' })
const createFixtureSql = fs.readFileSync(`${__dirname}/../../../db/schema/fixture.sql`, { encoding: 'utf8' })

router.post('/db/reset', async (req, res) => {
  await pgrm.queryRowsAsync(createDbSql)
  await runMigrations()
  await pgrm.queryRowsAsync(createFixtureSql)
  res.sendStatus(204)
})

router.post('/insertExamAndAnswerDataForUser/:userUuid', (req, res, next) =>
  testData
    .insertExamAndAnswerDataForUser(req.params.userUuid, req.body)
    .then(created => res.status(201).json(created))
    .catch(next)
)

router.post('/automaticGradingForHeldExam', (req, res, next) => {
  const heldExamUuid = req.body.heldExamUuid

  return using(pgrm.getTransaction(), tx => gradingDb.upsertCalculatedScoresForMultiChoiceAnswersInTx(tx, heldExamUuid))
    .then(() => res.status(204).end())
    .catch(next)
})

router.post('/createXmlExamForUser/:userUuid', (req, res, next) => {
  testDataXml
    .createXmlExamForUser(req.params.userUuid, req.body)
    .then(exam => res.status(201).json(exam))
    .catch(next)
})

router.get('/makeLastCreatedExamPublic', (_req, res, next) =>
  using(pgrm.getConnection(), connection =>
    connection
      .queryAsync(
        'UPDATE exam SET user_account_id = NULL WHERE exam_uuid = (SELECT exam_uuid FROM exam ORDER BY creation_date DESC LIMIT 1)'
      )
      .then(() => res.status(204).end())
      .catch(next)
  )
)

router.delete('/deletePublicExams', (_req, res, next) =>
  using(pgrm.getConnection(), connection =>
    connection
      .queryAsync('DELETE FROM exam WHERE user_account_id IS NULL')
      .then(() => connection.queryAsync('DELETE FROM imported_public_exam'))
      .then(() => res.status(204).end())
      .catch(next)
  )
)

router.post('/createUser', (req, res, next) =>
  testDataXml
    .createUser(req.body.userName, req.body.userPassword)
    .then(userUuid => res.status(201).json({ userUuid }))
    .catch(next)
)

router.get('/getExamPassword/:examUuid', (req, res, next) => {
  examDb
    .getExamPassword(req.params.examUuid)
    .then(pwd => expressUtils.respondWithJsonOr404(res)({ password: pwd }))
    .catch(next)
})

router.post('/gradeAnswers', (req, res, next) => {
  const firstNames = req.body.firstNames
  const lastName = req.body.lastName
  const scores = req.body.scores
  const metadataList = req.body.metadataList

  return using(pgrm.getConnection(), connection =>
    connection.queryAsync(
      'select a.answer_id from student s natural join answer_paper natural join answer a where s.first_names = $1 and s.last_name = $2 order by a.question_id',
      [firstNames, lastName]
    )
  )
    .then(results => _(results.rows).map('answer_id').map(_.parseInt).value())
    .then(answerIds =>
      Promise.map(scores, (score, index) => {
        const answerId = answerIds[index]
        const metadata = metadataList && metadataList.length > index ? metadataList[index] : null
        return insertScoreAsync(answerId, score, metadata)
      })
    )
    .then(() => res.status(204).end())
    .catch(next)
})

router.get('/generateMultiAnswersZip/:examUuid0/:examUuid1/:examUuid2', (req, res, next) => {
  const examUuids = [req.params.examUuid0, req.params.examUuid1, req.params.examUuid2]
  const maybeTextAnswersQuestions = [0]
  const maybeRichTextAnswersQuestions = []
  const maybeMultiChoiceAnswerQuestions = []
  const maybeMultiChoiceGapAnswerQuestions = []

  testDataXml
    .createMultiExamAnswersZip({
      examUuids,
      maybeTextAnswersQuestions,
      maybeRichTextAnswersQuestions,
      maybeMultiChoiceAnswerQuestions,
      maybeMultiChoiceGapAnswerQuestions
    })
    .then(zip => expressUtils.respondWithZip(res, 'answers.meb', zip))
    .catch(next)
})

router.get('/generateAnswersZip/:examUuid', (req, res, next) => {
  const maybeTextAnswersQuestions = []
  const maybeRichTextAnswersQuestions = [1]
  const maybeMultiChoiceAnswerQuestions = []
  const maybeMultiChoiceGapAnswerQuestions = []

  testDataXml
    .createAnswersZip({
      examUuid: req.params.examUuid,
      maybeTextAnswersQuestions,
      maybeRichTextAnswersQuestions,
      maybeMultiChoiceAnswerQuestions,
      maybeMultiChoiceGapAnswerQuestions
    })
    .then(zip => expressUtils.respondWithZip(res, 'answers.meb', zip))
    .catch(next)
})

router.get('/generateAnswersZipWithNoAnswers', (req, res, next) => {
  testDataXml
    .createAnswersZipWithoutAnswerPapers()
    .then(zip => expressUtils.respondWithZip(res, 'answers.meb', zip))
    .catch(next)
})

router.post('/passwordForExam/:examUuid', (req, res, next) => {
  examDb
    .getExam(req.params.examUuid)
    .then(exam => res.json({ password: exam.password }))
    .catch(next)
})

function insertScoreAsync(answerId, score, metadata) {
  return using(pgrm.getConnection(), connection =>
    connection.queryAsync(
      'insert into score (answer_id, score_value, metadata, update_time) values ($1, $2, $3, now())',
      [answerId, score, metadata]
    )
  )
}

// This route exists just in order to log the testUuid in access log, therefore it does nothing
router.post('/test-identifier/:testUuid', (_, res) => {
  res.sendStatus(204)
})

router.post('/opt-out-mex-conversion/:userAccountId', (req, res) => {
  using(pgrm.getConnection(), connection =>
    connection.queryAsync(
      SQL`UPDATE user_account SET user_account_mex_opt_out = TRUE WHERE user_account_id = ${req.params.userAccountId}`
    )
  )
    .then(() => res.sendStatus(204))
    .catch(_ => res.sendStatus(400))
})

router.get('/exam/:heldExamUuid/student/:studentUuid/answersToken', (req, res, next) => {
  using(pgrm.getConnection(), connection =>
    connection
      .queryAsync(
        `SELECT answer_paper_id, first_names, last_name FROM answer_paper
    NATURAL JOIN student
    NATURAL JOIN held_exam
    WHERE held_exam_uuid = $1 AND student_uuid = $2`,
        [req.params.heldExamUuid, req.params.studentUuid]
      )
      .then(result => {
        if (result.rowCount > 0) {
          const row = result.rows[0]
          return res.status(200).json({
            firstNames: row.first_names,
            lastName: row.last_name,
            answersToken: token.answerPaperIdToToken(row.answer_paper_id)
          })
        }
        throw new Error('No answer paper found')
      })
  ).catch(next)
})

export default router
