'use strict'

import config from '../config/configParser'
import * as jsUtils from '@digabi/js-utils'
import pgrm from './arpajs-database'
import { sep as pathSeparator } from 'path'
import { logger } from '../logger'
import SQL from 'sql-template-strings'

export function createExamInArpa(userId, title, examLanguage, xml) {
  return jsUtils
    .postJsonAsync(`${config.examUri}/composing/exam`, { examLanguage, title, userId, xml })
    .then(result => result.examUuid)
}

export function markExamDeletedInSa(userId, examUuid) {
  return toggleExamDeletedInSa(userId, examUuid, false)
}

export function markExamUndeletedInSa(userId, examUuid) {
  return toggleExamDeletedInSa(userId, examUuid, true)
}

function toggleExamDeletedInSa(userId, examUuid, exists) {
  return pgrm.queryRowsAsync(
    SQL`
        UPDATE exam
        SET deletion_date = CASE WHEN ${exists} = TRUE THEN NULL ELSE now() END
        WHERE user_account_id = ${userId}
          AND exam_uuid = ${examUuid}
        RETURNING exam_uuid AS "examUuid", deletion_date AS "deletionDate"
    `
  )
}

function getExamByIdAndUser(userId, examUuid) {
  return SQL`SELECT 1
             FROM exam
             WHERE deletion_date IS NULL
               AND (user_account_id = ${userId} or user_account_id IS NULL)
               AND exam_uuid = ${examUuid}`
}

export function checkAccessForExamAndProxy(req, res, next) {
  const examUuid = req.params.examUuid
  return userCanAccessExam(req.user.userId, examUuid)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(404).end()
      }
      return proxyToArpa(req, res, next)
    })
    .catch(next)
}

export function checkAccessForHeldExamAndProxy(req, res, next) {
  return userCanAccessHeldExam(req.user.userId, req.params.heldExamUuid)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(404).end()
      }
      return proxyToArpa(req, res, next)
    })
    .catch(next)
}

export function checkAccessForDeletedHeldExamAndProxy(req, res, next) {
  return userCanAccessHeldExamIncludingDeleted(req.user.userId, req.params.heldExamUuid)
    .then(canAccess => {
      if (!canAccess) {
        return res.status(404).end()
      }
      return proxyToArpa(req, res, next)
    })
    .catch(next)
}

export function proxyToArpa(req, res, next) {
  // redirection address: /api-something/grading/blah ==> /grading
  const redirectionAddress = `/${req.originalUrl.split(pathSeparator)[2]}`
  return jsUtils.expressUtils.proxyWithOpts(config.examUri + redirectionAddress, { timeout: 2.5 * 60 * 1000 }, logger)(
    req,
    res,
    next
  )
}

export async function userCanAccessExam(userId, examUuid) {
  try {
    const query = getExamByIdAndUser(userId, examUuid)
    return await isResultExactlyOneRow(query)
  } catch (e) {
    return false
  }
}

function userCanAccessHeldExamIncludingDeleted(userId, heldExamUuid) {
  return pgrm
    .queryRowsAsync(
      SQL`SELECT 1 FROM exam natural join held_exam WHERE user_account_id = ${userId} and held_exam_uuid = ${heldExamUuid}`
    )
    .then(rows => rows.length === 1)
}

export async function userCanAccessHeldExam(userId, heldExamUuid) {
  try {
    const { examUuid } = await jsUtils.getJsonAsync(`${config.examUri}/exams/held-exam/${heldExamUuid}`)
    const query = getExamByIdAndUser(userId, examUuid)
    return await isResultExactlyOneRow(query)
  } catch (e) {
    return false
  }
}

function isResultExactlyOneRow(query) {
  return pgrm.queryRowsAsync(query).then(rows => rows.length === 1)
}
