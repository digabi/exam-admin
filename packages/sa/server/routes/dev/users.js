'use strict'

import express from 'express'
const router = express.Router()
import * as auth from '../../auth/auth'
import pgrm from '../../db/arpajs-database'
import BPromise from 'bluebird'
const using = BPromise.using

router.post('/', (req, res, next) => {
  const user = req.body

  auth
    .createUser(user.userName, user.passwd, user.language || 'fi-FI')
    .then(result => res.status(201).json(result))
    .catch(next)
})

router.post('/delete', (req, res, next) => {
  const user = req.body

  using(pgrm.getConnection(), connection =>
    connection.queryAsync(
      `
  WITH
  users_exam as (select exam.exam_uuid from exam natural join user_account where lower(user_account_username) = lower($1)),
  s AS (DELETE FROM score WHERE answer_id IN (
    SELECT answer_id FROM answer NATURAL JOIN answer_paper NATURAL JOIN held_exam where exam_uuid in (select exam_uuid from users_exam))),
  a AS (DELETE FROM answer WHERE answer_paper_id IN (
    SELECT answer_paper_id FROM answer_paper
      NATURAL JOIN held_exam WHERE exam_uuid in (select exam_uuid from users_exam))),
  ap AS (DELETE FROM answer_paper WHERE held_exam_uuid in (
    SELECT held_exam_uuid FROM held_exam WHERE exam_uuid in (select exam_uuid from users_exam))),
  em AS (DELETE FROM server_environment_held_exam_map WHERE held_exam_uuid IN (
    SELECT held_exam_uuid FROM held_exam WHERE exam_uuid in (select exam_uuid from users_exam))),
  he AS (DELETE FROM held_exam WHERE exam_uuid in (select exam_uuid from users_exam)),
  at AS (DELETE FROM attachment WHERE exam_uuid in (select exam_uuid from users_exam)),
  e as (DELETE FROM exam WHERE exam_uuid in (select exam_uuid from users_exam))
  DELETE FROM  user_account WHERE lower(user_account_username) = lower($1)`,
      [user.userName]
    )
  )
    .then(() => res.status(204).end())
    .catch(next)
})

export default router
