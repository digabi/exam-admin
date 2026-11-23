'use strict'

import express from 'express'
const router = express.Router()
import * as exam from '../../db/exam-handling'

router.post('/:examUuid/exam-content', exam.checkAccessForExamAndProxy)

export default router
