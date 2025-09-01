'use strict'

import { Router } from 'express'
const router = Router()
import * as token from '../crypt/token'
import * as studentDb from '../db/student-data'
import { isConvertibleToMex } from '../exam/json-to-xml/mex-checker'
import * as examDb from '../db/exam-data'
import { tryXmlMasteringWithShuffle } from '../exam/xml-mastering'
import { tryMexConversion } from '../exam/json-to-xml/mex-xml-conversions'
import { prepareQuestions } from './grading'
import _ from 'lodash'
import { respondWithJsonOr404 } from '@digabi/express-utils'

router.get('/answers/:answerPaperToken', token.untokenizeApId, (req, res, next) => {
  studentDb
    .getAnswerPaper(req.apId)
    .then(answerPapers => parseAnswersAndScores(req.apId, answerPapers))
    .then(respondWithJsonOr404(res))
    .catch(next)
})

router.get('/exam/:answerPaperToken', token.untokenizeApId, (req, res, next) => {
  examDb.getExamContent(req.apId).then(masterIfXml).then(respondWithJsonOr404(res)).catch(next)
})

export async function parseAnswersAndScores(answerPaperId, answerPapers) {
  if (answerPapers.length === 0) {
    return
  }
  const exam = await examDb.getExamContent(answerPaperId)
  if (!exam) {
    return
  }
  return {
    gradingText: answerPapers[0].gradingText,
    answers: parseAnswers(answerPapers[0]),
    scores: parseScoresAndMetadata(exam, answerPapers[0])
  }
}

function parseAnswers(answerPaper) {
  const containsAnswers = answerPaper.answers.filter(a => a.content.length !== 0)
  return _.flatMap(containsAnswers, answer => {
    // checkbox/dropdown answers are stored in an array in content field
    if (Array.isArray(answer.content)) {
      return answer.content.map(multiChoiceAnswer => ({
        questionId: multiChoiceAnswer.questionId,
        type: multiChoiceAnswer.content.type,
        value: multiChoiceAnswer.content.value
      }))
    } else {
      return {
        questionId: answer.questionId,
        type: answer.content.type,
        value: answer.content.value,
        characterCount: answer.content.characterCount
      }
    }
  })
}

function parseScoresAndMetadata(exam, answerPaper) {
  const productiveQuestions = prepareQuestions(exam.gradingStructure || exam.content).filter(q => q.isProductive)
  return answerPaper.answers.map(answer => {
    const questionId = answer.questionId
    const score = answer.scoreValue
    return productiveQuestions.map(pq => pq.id).includes(questionId)
      ? {
          questionId,
          autograding: {
            score
          },
          pregrading: {
            comment: answer.comment,
            annotations: answer.metadata ? answer.metadata.annotations : []
          }
        }
      : {
          questionId,
          pregrading: {
            score,
            comment: answer.comment,
            annotations: answer.metadata
              ? answer.metadata.annotations.map(a => ({ ...a, message: a.message || '' }))
              : []
          }
        }
  })
}

export async function masterIfXml(examContent) {
  if (examContent) {
    const contentXml = await getMasteredXml(examContent)
    return {
      ...examContent,
      contentXml,
      gradingStructure: examContent.gradingStructure || examContent.content.sections[0]
    }
  }
  return null
}

async function getMasteredXml(examContent) {
  if (examContent.contentXml) {
    // Pure XML exam: return the mastered XML for use in preview
    const { xml } = await tryXmlMasteringWithShuffle(
      { contentXml: examContent.contentXml },
      examContent.attachmentsMetadata
    )
    return xml
  }

  const isMexConvertible = await isConvertibleToMex(examContent.examUuid)
  if (isMexConvertible) {
    try {
      // getExam call required as it returns attachment metadata
      const exam = await examDb.getExam(examContent.examUuid)
      const { xml } = await tryMexConversion(exam)
      return xml
    } catch (e) {} // eslint-disable-line no-empty
  }

  return null
}

export default router
