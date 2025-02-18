'use strict'

import express from 'express'
const router = express.Router()
import * as examDb from '../db/exam-data'
import { logger } from '../logger'
import * as token from '../crypt/token'
import _ from 'lodash'

import {
  changeUserName,
  moveExamsFromUsername,
  assertUsernameExists,
  ktpVersionsByWeek,
  ktpTypesByWeek,
  deleteExams,
  deleteExamsFromUser
} from '../db/admin'

import { expressUtils } from '@digabi/js-utils'
const { sendCsv } = expressUtils

router.get('/answers/:answerPaperToken/debug', token.untokenizeApId, async (req, res) => {
  const { answerPaperToken } = req.params
  try {
    const { examUuid } = await examDb.getExamContent(req.apId)
    const [{ user_account_username }] = await examDb.getAccountForExamUuid(examUuid)
    res.send(user_account_username)
  } catch (error) {
    logger.warn(`Failed getting user for exam token ${answerPaperToken}: ${error.toString()}`)
    res.status(400).end(`Tokenilla ei löydy koetta: ${error.toString()}`)
  }
})

router.post('/impersonate/:fromUsername/:toUsername', async (req, res) => {
  try {
    const { fromUsername, toUsername } = req.params
    await assertUsernameExists(fromUsername)
    await assertUsernameExists(toUsername)
    await examDb.doImpersonate(toUsername, fromUsername)
    logger.audit(`Impersonated as ${toUsername}`)
    res.status(200).end('OK')
  } catch (error) {
    logger.warn(error.toString())
    res.status(400).end(error.toString())
  }
})

router.post('/change-username/:fromUsername/:toUsername', async (req, res) => {
  try {
    const { fromUsername, toUsername } = req.params
    logger.audit(`Changing username from ${fromUsername} to ${toUsername} ...`)
    await changeUserName(fromUsername, toUsername)
    res.status(200).end('Tunnus vaihdettu')
  } catch (error) {
    logger.warn(error.toString())
    res.status(400).end(error.toString())
  }
})

router.post('/move-exams/:fromUsername/:toUsername', async (req, res) => {
  try {
    const { fromUsername, toUsername } = req.params
    logger.audit(`Moving exams from ${fromUsername} to ${toUsername} ...`)
    const result = await moveExamsFromUsername(fromUsername, toUsername)
    res.status(200).end(`${result.length} koetta siirretty`)
  } catch (error) {
    logger.warn(error.toString())
    res.status(400).end(error.toString())
  }
})

router.get('/ktp-versions-by-week', async (req, res) => {
  const heldExamsByWeekAndVersion = await ktpVersionsByWeek()
  const uniqueVersions = [...new Set(heldExamsByWeekAndVersion.map(x => x.ktp_version))].sort()
  const tableHeaders = [{ label: 'viikko', value: 'held_exams_creation_week' }].concat(
    uniqueVersions.map(version => ({ label: version, value: version }))
  )
  const groupedByVersions = Object.entries(_.groupBy(heldExamsByWeekAndVersion, 'held_exams_creation_week')).map(
    ([key, value]) => ({
      held_exams_creation_week: key,
      ...Object.fromEntries(value.map(x => [x.ktp_version, x.held_exam_count]))
    })
  )
  sendCsv(res, groupedByVersions, tableHeaders, `ktp-versions-by-week-${getISODate()}.csv`)
})

router.get('/ktp-types-by-week', async (req, res) => {
  const stats = await ktpTypesByWeek()
  sendCsv(
    res,
    stats,
    [
      { label: 'viikko', value: 'held_exams_creation_week' },
      { label: 'virtual', value: 'virtual' },
      { label: 'tikku', value: 'tikku' }
    ],
    `ktp-types-by-week-${getISODate()}.csv`
  )
})

router.post('/prune-deleted-exams/:days', async (req, res) => {
  const { days } = req.params
  try {
    const { deletedExams, deletedHeldExams } = await deleteExams(Number(days))
    res.send(`Poistettu ${deletedExams} koetta vastauksineen ja ${deletedHeldExams} poistettua vastauspakettia`)
  } catch (error) {
    logger.error('Error in /prune-deleted-exams/:days', error)
    res.status(500).send()
  }
})

router.post('/prune-deleted-exams-for-user/:userName/:dateUntil?', async (req, res) => {
  const { userName, dateUntil } = req.params
  try {
    const { deletedExams } = await deleteExamsFromUser(userName, dateUntil)
    res.send(`Poistettu ${deletedExams} koetta vastauksineen`)
  } catch (error) {
    logger.error('Error in /prune-deleted-exams-for-user/:userName/:dateUntil?', { error, userName, dateUntil })
    res.status(500).send()
  }
})

function getISODate() {
  return new Date().toISOString().split('T')[0]
}

export default router
