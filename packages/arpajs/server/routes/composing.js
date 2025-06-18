'use strict'

import express from 'express'
const moduleRouter = express.Router()
import * as examDb from '../db/exam-data'
import * as attachmentDb from '../db/attachment-data'
import * as utils from '@digabi/js-utils'
const {
  exc: { DataError },
  expressUtils,
  examValidatorAbitti: examValidator
} = utils
import { migrateXmlToLatestSchemaVersion } from '../exam/xml-mastering'
import bodyParser from 'body-parser'
import { logger } from '../logger'
const defaultJsonParser = bodyParser.json() // Has 100kB default limit
const jsonMaxSizeInBytes = 500 * 1024
const examContentJsonParser = bodyParser.json({ limit: jsonMaxSizeInBytes }) // Limit exam content to 500KB

moduleRouter.post('/:examUuid/exam-content', examContentJsonParser, async (req, res) => {
  const { examLanguage, content } = req.body
  if (!['fi-FI', 'sv-FI'].includes(examLanguage)) {
    throw new DataError('Exam language is not valid')
  }
  if (content && content.xml) {
    const attachmentMetaData = (await attachmentDb.getAttachments(req.params.examUuid)).reduce((acc, a) => {
      acc[a.displayName] = {
        mimeType: a.mimeType,
        duration: a.metadata?.duration,
        width: a.metadata?.width,
        height: a.metadata?.height
      }
      return acc
    }, {})

    const { xml, attachments } = await examDb.updateXmlExamContent(
      req.params.examUuid,
      examLanguage,
      content.title,
      content.xml,
      attachmentMetaData
    )
    return res.json({ xml, usedAttachments: attachments })
  } else {
    if (!examValidator.validateExamContentJSONFormat(content).valid) {
      throw new DataError('Exam content is not valid.')
    }
    await examDb.updateExamContent(req.params.examUuid, content, examLanguage)
    expressUtils.respondWith204(res)()
  }
})

moduleRouter.post('/:examUuid/error', examContentJsonParser, (req, res) => {
  const { message, source, error, userAgent } = req.body
  logger.warn(
    `${source} - ${message}
${error?.split('\n').slice(0, 4).join('\n')}
${userAgent}`
  )
  res.end()
})

moduleRouter.post('/exam', defaultJsonParser, (req, res, next) => {
  const { examLanguage, title, userId, xml } = req.body
  const migratedXml = xml ? migrateXmlToLatestSchemaVersion(xml) : xml
  examDb
    .createExam(examLanguage, title, userId, migratedXml, true)
    .then(expressUtils.respondWithJsonOr404(res))
    .catch(next)
})

export default moduleRouter
