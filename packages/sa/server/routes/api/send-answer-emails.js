'use strict'

import express from 'express'
const router = express.Router()
import * as proxying from '../../proxying'
import { baseUrlFromRequestHeaders } from '../../utils'
import { config } from '../../config'
import * as exam from '../../db/exam-handling'
import z from 'zod'
import { UuidSchema } from '../../validation'

const SendAnswerEmailsBodySchema = z.object({ heldExamUuid: UuidSchema })

router.post('/', (req, res, next) => {
  // heldExamUuid is copied into arpajs URLs
  const parse = SendAnswerEmailsBodySchema.safeParse(req.body)
  if (!parse.success) {
    return res.sendStatus(400)
  }
  const { heldExamUuid } = parse.data
  return exam
    .userCanAccessHeldExam(req.user.userId, heldExamUuid)
    .then(canAccess => {
      // eslint-disable-line consistent-return
      if (!canAccess) {
        return res.status(403).end()
      }
      return proxying
        .POST(
          `${config().examUri}/grading/send-answer-emails/${heldExamUuid}`,
          { answersPageBaseUrl: `${baseUrlFromRequestHeaders(req)}/answers/` },
          next
        )
        .then(body => res.json(body))
    })
    .catch(next)
})

export default router
