'use strict'

import { ensureAuthenticated } from '../../auth/auth-session'
import validator from 'validator'
import { proxyToArpa } from '../../db/exam-handling'
import express from 'express'
const router = express.Router()
import * as exam from '../../db/exam-handling'

const validateExamUuid = (req, res, next) => {
  if (validator.isUUID(req.params.examUuid)) {
    next()
  } else {
    res.status(404).end()
  }
}

// public routes
router.get('/:examUuid/attachments/:fileName*', validateExamUuid, exam.proxyToArpa)

// authenticated routes
router.use(ensureAuthenticated)
router.post('/:examUuid/lock', exam.checkAccessForExamAndProxy)
router.get('/:examUuid/exam', exam.checkAccessForExamAndProxy)
router.get('/held-exam/:heldExamUuid/exam', exam.checkAccessForHeldExamAndProxy)
router.post('/held-exam/:heldExamUuid/undelete', exam.checkAccessForDeletedHeldExamAndProxy)
router.get('/:examUuid/exam-meb', exam.checkAccessForExamAndProxy)
router.get('/:examUuid/export-exam', exam.checkAccessForExamAndProxy)
router.get('/:examUuid/attachments', exam.checkAccessForExamAndProxy)
router.delete('/:examUuid/attachments/:fileName', exam.checkAccessForExamAndProxy)
router.delete('/held-exam/:heldExamUuid', exam.checkAccessForHeldExamAndProxy)
router.post('/:examUuid/attachments/add', exam.checkAccessForExamAndProxy)
router.post('/:examUuid/attachments/copyFrom/:examUuid/:fileName*', exam.checkAccessForExamAndProxy)
router.get('/ee-version', proxyToArpa)

export default router
