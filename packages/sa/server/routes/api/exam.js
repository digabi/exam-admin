'use strict'

import express from 'express'
const router = express.Router()
import config from '../../config/configParser'
import * as exam from '../../db/exam-handling'
import * as examBl from './exam-bl'
import * as jsUtils from '@digabi/js-utils'
import { importExamHandler } from './import-exam-handler'
import { ensureAuthenticated } from '../../auth/auth-session'

router.get('/held-exams', (req, res, next) =>
  // todo check auth
  examBl
    .getHeldExams(req.user.userId)
    .then(heldExams => res.json(heldExams))
    .catch(next)
)

router.get('/held-exams-pregrading', ensureAuthenticated, (req, res, next) =>
  examBl
    .getHeldExams(req.user.userId, true)
    .then(heldExams => res.json(heldExams))
    .catch(next)
)

router.get('/exam-events', (req, res, next) =>
  jsUtils
    .getJsonAsync(`${config.examUri}/exams/status/${req.user.userId}`)
    .then(exams => res.json({ exams }))
    .catch(next)
)

router.get('/questions', (req, res, next) =>
  jsUtils
    .getJsonAsync(`${config.examUri}/exams/questions/${req.user.userId}`)
    .then(exams => res.json(exams))
    .catch(next)
)

router.get('/public-questions', (req, res, next) =>
  jsUtils
    .getJsonAsync(`${config.examUri}/exams/public-questions?${new URLSearchParams(req.query).toString()}`)
    .then(exams => res.json(exams))
    .catch(next)
)

router.get('/public-questions/filters', (req, res, next) =>
  jsUtils
    .getJsonAsync(`${config.examUri}/exams/public-questions/filters`)
    .then(filters => res.json(filters))
    .catch(next)
)

router.post('/password/:examUuid', (req, res, next) =>
  jsUtils
    .postJsonAsync(`${config.examUri}/exams/password/${req.params.examUuid}/${req.user.userId}`, req.body)
    .then(() => res.sendStatus(204))
    .catch(next)
)

router.post('/exam-event', (req, res, next) =>
  exam
    .createExamInArpa(req.user.userId, req.body.title, req.body.examLanguage, req.body.xml)
    .then(examUuid => res.status(201).json({ examUuid: examUuid }))
    .catch(next)
)

router.post('/undelete/:examUuid', (req, res, next) =>
  examBl
    .markExamAsUndeleted(req.user.userId, req.params.examUuid)
    .then(examUuid => res.status(201).json({ examUuid }))
    .catch(next)
)

router.delete('/exam-event/:examUuid', (req, res, next) => {
  examBl
    .markExamAsDeleted(req.user.userId, req.params.examUuid)
    .then(deleted => (deleted.length > 0 ? res.status(200).json(deleted) : res.sendStatus(404)))
    .catch(next)
})

router.post('/import-exam', importExamHandler)

router.get('/copy-exam/:examUuid', (req, res, next) =>
  jsUtils
    .getJsonAsync(`${config.examUri}/exams/copy-exam/${req.params.examUuid}/${req.user.userId}`)
    .then(exam => res.json(exam))
    .catch(next)
)

export default router
