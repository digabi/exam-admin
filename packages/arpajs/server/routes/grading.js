'use strict'

import express from 'express'
const moduleRouter = express.Router()
import _ from 'lodash'
import * as utils from '@digabi/js-utils'
const DataError = utils.exc.DataError
const expressUtils = utils.expressUtils
import * as examDb from '../db/exam-data'
import * as studentDb from '../db/student-data'
import * as gradingDb from '../db/grading-data'
import * as answersExtractor from '../exam/answers-extractor'
import { logger } from '../logger'
import multer from 'multer'
import bodyParser from 'body-parser'
import * as L from 'partial.lenses'
import { getGradingAccessDeniedForAnswer } from '../db/grading-data'
import { getToken } from '../db/student-data'
import { getAnswerLength } from '../db/answer-data'
const defaultJsonParser = bodyParser.json() // Has 100kB default limit

const multerConfigsForAnswerUpload = {
  inMemory: true,
  limits: { fileSize: 300 * 1024 * 1024 }
}
const answerUpload = multer(multerConfigsForAnswerUpload).single('examUpload')
const answerUploadMiddleware = (req, res, next) => {
  answerUpload(req, res, err =>
    err && _.includes(err.message, 'File too large') ? res.status(413).send('Answer file was too big') : next(err)
  )
}

expressUtils.promisifyRouter(moduleRouter)

async function extract(fileBuffer) {
  const { zipContents, keys } = await answersExtractor.extractAndDecryptZipContents(fileBuffer)
  const answers = await answersExtractor.decryptAnswers(keys, zipContents)
  const screenshots = await answersExtractor.decryptScreenshots(keys, zipContents)
  const environmentData = await answersExtractor.decryptEnvironmentData(keys, zipContents).catch(_.noop)
  const result = await answersExtractor.importAnswersFromZip(answers, screenshots, environmentData)
  const logs = await answersExtractor.decryptLogs(keys, zipContents)
  await answersExtractor.importLogs(logs, result.examUuids)
  return result
}

moduleRouter.postAsync('/answers-meb', answerUploadMiddleware, async (req, res) => {
  const result = await extract(req.file.buffer)
  res.json(_.omit(result, ['examUuids']))
})

moduleRouter.postAsync('/answers-meb/pregrading', answerUploadMiddleware, async (req, res) => {
  const result = await extract(req.file.buffer)
  const deletedExams = result.deletedExams.map(exam => ({ ...exam, isDeleted: true }))
  res.json([
    {
      gradingSchoolId: '',
      answerCountsByExam: result.exams.concat(deletedExams).map(exam => ({
        examUuid: exam.examUuid,
        examTitle: exam.title,
        answerCount: exam.answerCount,
        isDuplicate: exam.isDuplicate,
        isDeleted: exam.isDeleted
      }))
    }
  ])
})

moduleRouter.post('/scores/:answerId', defaultJsonParser, validateScore, answerCanBeModified, (req, res, next) => {
  logger.info(`/grading/scores/${req.params.answerId}`, JSON.stringify(req.body))
  // eslint-disable-next-line promise/valid-params
  gradingDb
    .upsertScore(req.params.answerId, req.body.scoreValue)
    .then(expressUtils.respondWithJsonOr404(res))
    .catch(DataError, e => {
      logger.info(`/grading/scores, ${e.message}, data:${JSON.stringify(req.body)}`)
      res.status(400).end()
    })
    .catch(next)
})

moduleRouter.post('/scores/:heldExamUuid/mark-pregrading-finished', defaultJsonParser, async (req, res) => {
  const { answerIds } = req.body
  if (!answerIds || answerIds.length === 0) {
    logger.error('No answerIds provided for marking pregrading finished')
    return res.status(400).end()
  }
  logger.info('Marking pregrading finished', answerIds)
  const answerPregradingData = await gradingDb.setMultipleAnswerPregradingFinishedAt(answerIds)
  res.send(answerPregradingData)
})

moduleRouter.post('/scores/:answerId/revert-pregrading-finished', defaultJsonParser, async (req, res) => {
  const { answerId } = req.params
  const answerIdAsNumber = parseInt(answerId, 10)

  logger.info('Reverting pregrading finished', { answerId })
  const answerPregradingData = await gradingDb.clearPregradingFinishedAtForAnswer(answerIdAsNumber)
  res.send(answerPregradingData)
})

moduleRouter.post('/comments/:answerId', defaultJsonParser, validateComment, (req, res, next) => {
  gradingDb.upsertComment(req.params.answerId, req.body.comment).then(expressUtils.respondWith204Or400(res)).catch(next)
})

moduleRouter.post('/metadata/:answerId', defaultJsonParser, validateMetadata, validateAnnotations, (req, res, next) => {
  gradingDb
    .upsertGradingMetadata(req.params.answerId, req.body.metadata)
    .then(expressUtils.respondWith204Or400(res))
    .catch(next)
})

moduleRouter.post('/gradingTexts/:answerPaperId', defaultJsonParser, validateGradingText, (req, res, next) => {
  gradingDb
    .updateGradingText(req.params.answerPaperId, req.body.gradingText)
    .then(expressUtils.respondWith204(res))
    .catch(next)
})

moduleRouter.get('/answerId/:answerId/examUuid', (req, res, next) => {
  examDb
    .getExamIdByAnswerId(req.params.answerId)
    .then(ids => res.json(ids))
    .catch(next)
})

moduleRouter.get('/answerPaperId/:answerPaperId/examUuid', (req, res, next) => {
  examDb
    .getExamIdByAnswerPaperId(req.params.answerPaperId)
    .then(ids => res.json(ids))
    .catch(next)
})

moduleRouter.get('/:heldExamUuid/student-answers/', (req, res, next) => {
  studentDb.getAnswerPapersForHeldExam(req.params.heldExamUuid).then(expressUtils.respondWithJsonOr404(res)).catch(next)
})

export function prepareQuestions(examOrGradingStructureContent) {
  const questions = L.collect(L.query('questions'), examOrGradingStructureContent)
  const elements = _.flatten(questions)
    .filter(el => el.type !== 'label' && el.type !== 'audiotest')
    .map(question => {
      const isAutoGradeable = question.type === 'multichoicegap' || question.type === 'choicegroup'
      return {
        ...question,
        maxScore: getMaxScore(question),
        isAutoGradeable,
        isProductive: question.type === 'text' && !!question.correctAnswers
      }
    })
  expandDisplayNumbers(elements)

  return elements

  function getMaxScore(q) {
    if ('maxScore' in q) {
      return q.maxScore || 0
    }
    return q.choices.reduce(
      (sum, choice) => sum + choice.options.map(({ score }) => score || 0).reduce((a, b) => Math.max(a, b), 0),
      0
    )
  }

  // TODO this could be pre-calculated into the exam data
  function expandDisplayNumbers(els) {
    let parentNumber
    let level = 1
    els.forEach(el => {
      if (el.type === 'label') {
        parentNumber = el.displayNumber
        level = el.level
      } else if (parentNumber && el.level > level) {
        el.displayNumber = parentNumber + el.displayNumber
      } else if (el.level <= level) {
        level = el.level
        parentNumber = undefined
      }
    })
  }
}

function prepareAnswers(answers, questions) {
  return answers.map(answer => {
    const question = questionByAnswer(questions, answer)
    return {
      ...answer,
      pregrading: {
        scoreValue: answer.scoreValue,
        metadata: answer.metadata,
        pregradingFinishedAt: answer.pregradingFinishedAt
      },
      answerId: answer.id,
      userCanScore: !!answer.id && !answer.pregradingFinishedAt,
      maxScore: question.maxScore,
      displayNumber: question.displayNumber,
      isAutoGradeable: question.isAutoGradeable,
      isProductive: question.isProductive
    }
  })

  function questionByAnswer(questions, answer) {
    return _.find(questions, q => answer.questionId === q.id)
  }
}

function sortStudentsByName(students) {
  return _.sortBy(students, student => `${student.lastName.toLowerCase()} ${student.firstNames.toLowerCase()}`)
}

function addEmptyAnswersForScoreTableRendering(studentAnswers, questionScores) {
  return studentAnswers.map(student => {
    const answers = questionScores
      .filter(q => !q.isAutoGradeable)
      .map(q => {
        const answer = _.find(student.answers, a => a.questionId === q.id)
        // undefined was ok for chrome but not for firefox
        return answer ? answer : {}
      })
    return { ...student, answers }
  })
}

function prepareStudentsAnswers(students, questions) {
  const preparedStudents = students.map(student => {
    const answers = _.sortBy(prepareAnswers(student.answers, questions), 'questionId')
    const totals = answers.reduce(
      (acc, answer) => {
        if (answer.isAutoGradeable) {
          acc.totalAutogradingScore += answer.scoreValue
        }
        acc.totalScore += answer.scoreValue
        return acc
      },
      { totalScore: 0, totalAutogradingScore: 0 }
    )
    return {
      ...student,
      ...totals,
      studentAnonIdentifier: student.answerPaperId, // fake anon identifier, is this unique enough?
      regStudentUuid: student.studentUuid, // abitti has no relation to registry
      answers: answers.filter(answer => !answer.isAutoGradeable)
    }
  })
  const studentsForRendering = addEmptyAnswersForScoreTableRendering(preparedStudents, questions)
  return sortStudentsByName(studentsForRendering)
}

function prepareScoreAverages(questions, scoreAverages) {
  return questions
    .filter(q => !q.isAutoGradeable)
    .map(q => {
      const scoreAverage = scoreAverages.find(a => a.questionId === q.id)
      const average = scoreAverage?.average?.toFixed(2) ?? '-'
      return { questionId: q.id, average }
    })
}

moduleRouter.get('/:heldExamUuid/student-answers-pregrading', async (req, res) => {
  const exam = await examDb.getHeldExam(req.params.heldExamUuid)
  if (!exam) {
    return res.sendStatus(404)
  }
  const studentsWithAnswerPapers = await studentDb.getAnswerPapersForHeldExam(req.params.heldExamUuid)
  const storedScoreAverages = await examDb.getScoreAverages(req.params.heldExamUuid)
  const questions = prepareQuestions(exam.gradingStructure || exam.content)
  const [autogradingQuestions, normalQuestions] = _.partition(questions, q => q.isAutoGradeable)
  const preparedStudents = prepareStudentsAnswers(studentsWithAnswerPapers, questions)
  res.json({
    exam: {
      ...exam,
      examCode: 'A_E', // does not really need this, but A_E does not have grading instructions => hides the button from ui
      content: {
        title: exam.title
      },
      canBePregraded: true,
      schoolExamAnonCode: req.params.heldExamUuid // fake anon code
    },
    autogradingAnswers: autogradingQuestions.length > 0,
    maxAutogradingScore: _.sumBy(autogradingQuestions, 'maxScore'),
    maxScores: normalQuestions,
    questionCount: questions.length,
    students: preparedStudents,
    scoreAverages: prepareScoreAverages(questions, storedScoreAverages)
  })
})

moduleRouter.get('/status/:userAccountId', (req, res, next) => {
  examDb
    .getGradingStatusForExams(req.params.userAccountId)
    .then(data => res.json(data))
    .catch(next)
})

moduleRouter.get('/status-pregrading/:userAccountId', (req, res, next) => {
  examDb
    .getGradingStatusForExams(req.params.userAccountId, true)
    .then(data => res.json(data))
    .catch(next)
})

moduleRouter.get('/results/:heldExamUuid/:studentUuid', async (req, res) => {
  const token = await getToken(req.params.heldExamUuid, req.params.studentUuid)
  res.json({ token })
})

function validateScore(req, res, next) {
  let isValid =
    !_.isNaN(parseInt(req.params.answerId, 10)) && (req.body.scoreValue === null || _.isNumber(req.body.scoreValue))
  if (!isValid) return res.status(404).end()
  else return next()
}

function validateComment(req, res, next) {
  let isValid = !_.isNaN(parseInt(req.params.answerId, 10)) && !_.isUndefined(req.body.comment)
  if (!isValid) return res.status(404).end()
  else return next()
}

function validateMetadata(req, res, next) {
  let isValid =
    !_.isNaN(parseInt(req.params.answerId, 10)) && (_.isPlainObject(req.body.metadata) || req.body.metadata === null)
  if (!isValid) return res.status(404).end()
  else return next()
}

async function validateAnnotations(req, res, next) {
  try {
    const characterCount = await getAnswerLength(req.params.answerId)
    const invalidAnnotations = req.body.metadata?.annotations.filter(
      a => a.type === 'text' && a.startIndex + a.length > characterCount
    )
    if (invalidAnnotations?.length) {
      logger.error('Invalid annotations', { characterCount, invalidAnnotations })
      return res.sendStatus(400)
    } else {
      return next()
    }
  } catch (err) {
    logger.error('Annotation validation failed', err)
    res.sendStatus(400)
  }
}

function validateGradingText(req, res, next) {
  let isValid = !_.isUndefined(req.body.gradingText)
  if (!isValid) return res.status(404).end()
  else return next()
}

function answerCanBeModified(req, res, next) {
  void getGradingAccessDeniedForAnswer(parseInt(req.params.answerId))
    .then(accessDenied => (accessDenied ? res.status(403).end() : next()))
    .catch(next)
}

export default moduleRouter
