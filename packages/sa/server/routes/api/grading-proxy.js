'use strict'

import express from 'express'
import { getJsonAsync } from '@digabi/fetch'
const router = express.Router()
import { config } from '../../config'
import * as exam from '../../db/exam-handling'
import * as proxying from '../../proxying'
import * as examBl from './exam-bl'
import { checkAccessForHeldExamAndProxy } from '../../db/exam-handling'
import { isNumericId, isUuid } from '../../validation'

router.get(['/:heldExamUuid/student-answers-return', '/:heldExamUuid/student-answers'], (req, res, next) => {
  const heldExamUuid = req.params.heldExamUuid
  if (!isUuid(heldExamUuid)) {
    return res.sendStatus(400)
  }
  return exam
    .userCanAccessHeldExam(req.user.userId, heldExamUuid)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(404).end()
      }
      return proxying.proxyToArpa('/grading')(req, res, next)
    })
    .catch(next)
})

router.post('/scores/:answerId', checkAnswerAccessAndProxyRequest)

router.post('/scores/:heldExamUuid/mark-grading-finished', checkAccessForHeldExamAndProxy)

router.post('/scores/:answerId/revert-grading-finished', checkAnswerAccessAndProxyRequest)

router.post('/metadata/:answerId', checkAnswerAccessAndProxyRequest)

router.post('/comments/:answerId', checkAnswerAccessAndProxyRequest)

router.post('/gradingTexts/:answerPaperId', checkAnswerPaperAccessAndProxyRequest)

router.get('/results/:heldExamUuid/:studentUuid', (req, res, next) => {
  const heldExamUuid = req.params.heldExamUuid
  if (!isUuid(heldExamUuid) || !isUuid(req.params.studentUuid)) {
    return res.sendStatus(400)
  }
  return exam
    .userCanAccessHeldExam(req.user.userId, heldExamUuid)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(403).end()
      }
      return getJsonAsync(
        `${config().examUri}/grading/results/${req.params.heldExamUuid}/${req.params.studentUuid}`
      ).then(({ token }) => res.redirect(`/answers/${token}`))
    })
    .catch(next)
})

router.get('/results/:heldExamUuid/', (req, res, next) => {
  const heldExamUuid = req.params.heldExamUuid
  if (!isUuid(heldExamUuid)) {
    return res.sendStatus(400)
  }
  return exam
    .userCanAccessHeldExam(req.user.userId, heldExamUuid)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(404).end()
      }
      return proxying.proxyToArpa('/grading')(req, res, next)
    })
    .catch(next)
})

function checkAnswerPaperAccessAndProxyRequest(req, res, next) {
  if (!isNumericId(req.params.answerPaperId)) {
    return res.sendStatus(400)
  }
  return examBl
    .checkUserHasAccessToAnswerPaper(req.user.userId, req.params.answerPaperId)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(403).end()
      }
      return proxying.proxyToArpa('/grading')(req, res, next)
    })
    .catch(next)
}

function checkAnswerAccessAndProxyRequest(req, res, next) {
  if (!isNumericId(req.params.answerId)) {
    return res.sendStatus(400)
  }
  return examBl
    .checkUserHasAccessToAnswer(req.user.userId, req.params.answerId)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(403).end()
      }
      return proxying.proxyToArpa('/grading')(req, res, next)
    })
    .catch(next)
}

export default router
