'use strict'

import express from 'express'
const router = express.Router()
import config from '../../config/configParser'
import * as exam from '../../db/exam-handling'
import * as proxying from '../../proxying'
import * as examBl from './exam-bl'
import { checkAccessForHeldExamAndProxy } from '../../db/exam-handling'
import * as jsUtils from '@digabi/js-utils'

router.get(['/:heldExamUuid/student-answers', '/:heldExamUuid/student-answers-pregrading'], (req, res, next) => {
  const heldExamUuid = req.params.heldExamUuid
  return exam
    .userCanAccessHeldExam(req.user.userId, heldExamUuid)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(403).end()
      }
      return proxying.proxy(`${config.examUri}/grading`)(req, res, next)
    })
    .catch(next)
})

router.post('/scores/:answerId', verifyParamIsNumber('answerId'), checkAnswerAccessAndProxyRequest)

router.post('/scores/:heldExamUuid/mark-pregrading-finished', checkAccessForHeldExamAndProxy)

router.post('/scores/:answerId/revert-pregrading-finished', checkAnswerAccessAndProxyRequest)

router.post('/metadata/:answerId', verifyParamIsNumber('answerId'), checkAnswerAccessAndProxyRequest)

router.post('/comments/:answerId', verifyParamIsNumber('answerId'), checkAnswerAccessAndProxyRequest)

router.post('/gradingTexts/:answerPaperId', verifyParamIsNumber('answerPaperId'), checkAnswerPaperAccessAndProxyRequest)

router.get('/results/:heldExamUuid/:studentUuid', (req, res, next) => {
  const heldExamUuid = req.params.heldExamUuid
  return exam
    .userCanAccessHeldExam(req.user.userId, heldExamUuid)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(403).end()
      }
      return jsUtils
        .getJsonAsync(`${config.examUri}/grading/results/${req.params.heldExamUuid}/${req.params.studentUuid}`)
        .then(({ token }) => res.redirect(`/answers/${token}`))
    })
    .catch(next)
})

function verifyParamIsNumber(queryName) {
  return (req, res, next) => {
    if (isNaN(req.params[queryName])) {
      res.sendStatus(400)
    } else {
      next()
    }
  }
}

function checkAnswerPaperAccessAndProxyRequest(req, res, next) {
  return examBl
    .checkUserHasAccessToAnswerPaper(req.user.userId, req.params.answerPaperId)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(403).end()
      }
      return proxying.proxy(`${config.examUri}/grading`)(req, res, next)
    })
    .catch(next)
}

function checkAnswerAccessAndProxyRequest(req, res, next) {
  return examBl
    .checkUserHasAccessToAnswer(req.user.userId, req.params.answerId)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(403).end()
      }
      return proxying.proxy(`${config.examUri}/grading`)(req, res, next)
    })
    .catch(next)
}

export default router
