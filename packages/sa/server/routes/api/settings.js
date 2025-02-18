'use strict'

import { Router } from 'express'
import { expressUtils, baseUrlFromRequestHeaders } from '@digabi/js-utils'
const router = expressUtils.promisifyRouter(Router())
import * as auth from '../../auth/auth'
import { ensureAuthenticated } from '../../auth/auth-session'
import pgrm from '../../db/arpajs-database'
import * as email from '../../email'
import { using } from 'bluebird'
import { validEmail } from '../../validation'
import { removeAuthorizedClientFromUser } from '../../auth/oauth'
import { queryAuthorizedClients } from '../../auth/oauth-model'
import SQL from 'sql-template-strings'
import config from '../../config/configParser'

router.getAsync('/exam-language', async (req, res) => {
  if (!req.user) {
    return res.sendStatus(401)
  }

  const { userId } = req.user
  const [result] = await pgrm.queryRowsAsync(
    SQL`SELECT user_account_exam_language as "defaultExamLanguage"
                          FROM user_account
                          WHERE user_account_id = ${userId}`
  )
  res.send(result)
})

router.postAsync('/exam-language/:examLanguage', async (req, res) => {
  if (!req.user) {
    return res.sendStatus(401)
  }

  const { userId } = req.user
  const { examLanguage } = req.params
  await pgrm.queryRowsAsync(
    SQL`update user_account set  user_account_exam_language = ${examLanguage}
                          WHERE user_account_id = ${userId}`
  )
  res.status(200).end()
})

router.postAsync('/update-email', ensureAuthenticated, async (req, res) => {
  const { password, newUsername } = req.body
  const { userId, userName } = req.user

  if (!validEmail(newUsername)) {
    return res.status(400).send({ validationErrors: { username: 'invalid_username' } })
  }

  const usernameExists = await auth.usernameExists(newUsername)
  if (usernameExists) {
    return res.status(400).send({ validationErrors: { username: 'username_exists' } })
  }

  const user = await auth.authenticateByPassword(userName, password)
  if (!user) {
    return res.status(400).send({ validationErrors: { password: 'invalid_password' } })
  }

  return using(pgrm.getTransaction(), async tx => {
    const token = await auth.startUpdateUsername(tx, userId, newUsername)
    await sendUpdateEmail(req, newUsername, token)
    res.status(204).send()
  })
})

router.getAsync('/update-email', async (req, res) => {
  const { token } = req.query

  const user = await auth.authenticateByToken(token)
  if (!user) {
    return res.cookie('notification-error', 'sa.settings.update_username.error').redirect('/')
  }

  return using(pgrm.getTransaction(), async tx => {
    await auth.finishUpdateUsername(tx, user.userId, token)
    return res.cookie('notification-info', 'sa.settings.update_username.success').redirect('/')
  })
})

const sendUpdateEmail = (req, to, token) => {
  const baseUrl = baseUrlFromRequestHeaders(req)
  const confirmationUrl = `${baseUrl}/kurko-api/settings/update-email?token=${encodeURIComponent(token)}`
  const mail = config.updateEmail(to, confirmationUrl)
  return email.send(mail)
}

router.getAsync('/authorized-apps', ensureAuthenticated, async (req, res) => {
  res.send(await queryAuthorizedClients(req.user.userId))
})

router.deleteAsync('/authorized-apps/:clientId', ensureAuthenticated, async (req, res) => {
  await removeAuthorizedClientFromUser(req.params.clientId, req.user.userId)
  res.status(204)
  res.end()
})

export default router
