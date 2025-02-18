'use strict'

import express from 'express'
const router = express.Router()
import * as userMgmt from '../../auth/auth'
import { logger } from '../../logger'
import * as utils from '@digabi/js-utils'
import * as email from '../../email'
import { validEmail } from '../../validation'
import config from '../../config/configParser'

router.post('/', (req, res) => {
  const email = req.body.email
  if (!validEmail(email)) {
    return res.status(400).end()
  }
  userMgmt
    .createRegistrationToken(email)
    .then(token => sendRegistrationEmail(utils.baseUrlFromRequestHeaders(req), token, email))
    .then(() => res.status(204).end())
    .catch(err => {
      logger.error('POST /registration system error: ', err)
      return res.status(500).end()
    })
})

function sendRegistrationEmail(baseUrl, token, address) {
  const mail = config.registrationMail(address, `${tokenUrl(baseUrl, token)}?setLng=fin`)
  return email.send(mail)

  function tokenUrl(baseUrl, token) {
    return `${baseUrl}/registration/${token}`
  }
}

export default router
