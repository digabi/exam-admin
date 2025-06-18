'use strict'

import { Router } from 'express'
const router = Router()
import _ from 'lodash'
import bodyParser from 'body-parser'
import * as token from '../crypt/token'
import * as studentDb from '../db/student-data'
import * as utils from '@digabi/js-utils'
import { sendEmail } from '../email'
import config from '../config/configParser'
const AppError = utils.exc.AppError
const expressUtils = utils.expressUtils

router.use(bodyParser.json())

router.post('/:heldExamUuid', (req, res, next) => {
  const baseUrl = req.body.answersPageBaseUrl

  if (!_.isString(baseUrl)) return next(new AppError('No answersPageBaseUrl in request', 400))

  // eslint-disable-next-line promise/valid-params
  return studentDb
    .getStudentsForMailing(req.params.heldExamUuid)
    .then(students => students.filter(({ email }) => utils.validation.isValidEmail(email)))
    .then(students => {
      if (students.length > 0) return students
      throw new AppError('No emails found for exam', 400)
    })
    .map(student => {
      const url = baseUrl + token.answerPaperIdToToken(student.answerPaperId)
      return sendAnswerEmail(student.title, student.email, student.firstNames, url)
    })
    .all()
    .then(() => studentDb.updateAnswersSentTime(req.params.heldExamUuid))
    .then(expressUtils.respondWithJsonOrThrow(res, new AppError('Unable to update timestamp')))
    .catch(next)
})

function sendAnswerEmail(examTitle, address, firstNames, urlWithtoken) {
  const mail = config.answerLinkMail(address, examTitle, firstNames, urlWithtoken)
  return sendEmail(mail)
}

export default router
