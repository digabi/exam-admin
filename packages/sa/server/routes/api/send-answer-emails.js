'use strict'

import express from 'express'
const router = express.Router()
import * as proxying from '../../proxying'
import * as utils from '@digabi/js-utils'
import config from '../../config/configParser'
import * as exam from '../../db/exam-handling'

router.post('/', (req, res, next) => {
  const heldExamUuid = req.body.heldExamUuid
  return exam
    .userCanAccessHeldExam(req.user.userId, heldExamUuid)
    .then(canAccess => {
      // eslint-disable-line consistent-return
      if (!canAccess) {
        return res.status(403).end()
      }
      return proxying
        .POST(
          `${config.examUri}/grading/send-answer-emails/${heldExamUuid}`,
          { answersPageBaseUrl: `${utils.baseUrlFromRequestHeaders(req)}/answers/` },
          next
        )
        .then(body => res.json(body))
    })
    .catch(next)
})

export default router
