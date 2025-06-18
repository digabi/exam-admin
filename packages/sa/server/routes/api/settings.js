'use strict'

import { Router } from 'express'
import { baseUrlFromRequestHeaders, validation } from '@digabi/js-utils'
const router = Router()
import * as auth from '../../auth/auth'
import { ensureAuthenticated } from '../../auth/auth-session'
import pgrm from '../../db/arpajs-database'
import * as email from '../../email'
import { using } from 'bluebird'
import { removeAuthorizedClientFromUser } from '../../auth/oauth'
import { queryAuthorizedClients } from '../../auth/oauth-model'
import SQL from 'sql-template-strings'
import config from '../../config/configParser'

router.get('/exam-language', async (req, res) => {
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

router.post('/exam-language/:examLanguage', async (req, res) => {
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

router.post('/update-email', ensureAuthenticated, async (req, res) => {
  const { password, newUsername } = req.body
  const { userId, userName } = req.user

  if (!validation.isValidEmail(newUsername)) {
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

/**
 * update-email GET route is called when user receives email to confirm update
 * email. If there is no HEAD route specified then both HEAD and GET trigger
 * the router.get() route and try to execute the database changes. This can
 * cause a race condition when updating the db. That is why we have a dummy HEAD
 * route
 */
router.head('/update-email', (req, res) => {
  res.sendStatus(200)
})

router.get('/update-email', async (req, res) => {
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

router.get('/authorized-apps', ensureAuthenticated, async (req, res) => {
  res.send(await queryAuthorizedClients(req.user.userId))
})

router.delete('/authorized-apps/:clientId', ensureAuthenticated, async (req, res) => {
  await removeAuthorizedClientFromUser(req.params.clientId, req.user.userId)
  res.status(204)
  res.end()
})

export default router
