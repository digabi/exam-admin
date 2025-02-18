'use strict'

import express from 'express'
const router = express.Router()
import pgrm from '../../db/arpajs-database'

router.delete('/:examUuid', (req, res, next) =>
  pgrm
    .queryRowsAsync(
      `
WITH
  s AS (DELETE FROM score WHERE answer_id IN (
    SELECT answer_id FROM answer NATURAL JOIN answer_paper NATURAL JOIN held_exam where exam_uuid = $1)),
  a AS (DELETE FROM answer WHERE answer_paper_id IN (
    SELECT answer_paper_id FROM answer_paper
      NATURAL JOIN held_exam WHERE exam_uuid = $1)),
  ap AS (DELETE FROM answer_paper WHERE held_exam_uuid in (
    SELECT held_exam_uuid FROM held_exam WHERE exam_uuid = $1)),
  em AS (DELETE FROM server_environment_held_exam_map WHERE held_exam_uuid IN (
    SELECT held_exam_uuid FROM held_exam WHERE exam_uuid = $1)),
  he AS (DELETE FROM held_exam WHERE exam_uuid = $1)
DELETE FROM exam WHERE exam_uuid = $1`,
      [req.params.examUuid]
    )
    .then(() => res.status(204).end())
    .catch(next)
)

export default router
