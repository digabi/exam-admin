'use strict'

import express from 'express'
const router = express.Router()
import * as authSession from '../auth/auth-session'
import { markup } from '../indexHtml'

router.get('/', (req, res) => {
  sendIndex(res)
})

router.get('/exams', (req, res) => {
  sendIndex(res)
})

router.get('/grading', (req, res) => {
  sendIndex(res)
})

router.get('/teachers', (req, res) => {
  sendIndex(res)
})

router.get('/settings', (req, res) => {
  sendIndex(res)
})

router.get('/grading/:examId', authSession.ensureAuthenticatedWithFallback(sendIndex), (req, res) => {
  res.sendFile('/public/arpa.html', { root: `${__dirname}/../..` })
})

router.get('/grading/:examId/school/:schoolId', authSession.ensureAuthenticatedWithFallback(sendIndex), (req, res) => {
  res.sendFile('/public/arpa.html', { root: `${__dirname}/../..` })
})

router.get('/bertta/:examId', authSession.ensureAuthenticatedWithFallback(sendIndex), (req, res) => {
  res.sendFile('/public/bertta.html', { root: `${__dirname}/../..` })
})

router.get(
  '/pregrading/:schoolExamAnonCode/:studentCode?/:displayNumber?',
  authSession.ensureAuthenticatedWithFallback(sendIndex),
  (req, res) => {
    res.sendFile('/public/pregrading.html', { root: `${__dirname}/../..` })
  }
)

router.get('/pregrading', authSession.ensureAuthenticatedWithFallback(sendIndex), (req, res) => {
  res.sendFile('/public/pregrading-exams.html', { root: `${__dirname}/../..` })
})

router.get('/review/:examId', authSession.ensureAuthenticatedWithFallback(sendIndex), (req, res) => {
  res.sendFile('/public/return-exams.html', { root: `${__dirname}/../..` })
})

router.get(
  ['/preview/:examId', '/preview/:examId/attachments'],
  authSession.ensureAuthenticatedWithFallback(sendIndex),
  (req, res) => {
    res.sendFile('/public/preview.html', { root: `${__dirname}/../..` })
  }
)

router.get('/review/:examId', authSession.ensureAuthenticatedWithFallback(sendIndex), (req, res) => {
  res.sendFile('/public/return-exams.html', { root: `${__dirname}/../..` })
})

router.get(
  '/details/:examId/answer-paper/:apId',
  authSession.ensureAuthenticatedWithFallback(sendIndex),
  (req, res) => {
    res.sendFile('/public/return-exams.html', { root: `${__dirname}/../..` })
  }
)

function sendIndex(res) {
  res.send(markup())
}

export default router
