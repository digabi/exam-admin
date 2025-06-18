'use strict'

import { pipeline } from 'stream/promises'
import express from 'express'
const moduleRouter = express.Router()
import _ from 'lodash'
import * as examDb from '../db/exam-data'
import { logger } from '../logger'
import * as examPacker from '../exam/exam-packer'
import * as utils from '@digabi/js-utils'
import yauzl from 'yauzl-promise'
const {
  expressUtils,
  zip: zipUtils,
  exc: { AppError, DataError }
} = utils
import BPromise from 'bluebird'
import * as awsUtils from '../aws-utils'
import multer from 'multer'
import { streamXmlMeb } from '../exam/mex-stream'
import { importXmlTransferZip } from '../exam/xml-import'
import { importLegacyTransferZip } from '../exam/legacy-import'
import * as attachmentsStorage from '../exam/attachments/attachments-storage'
import * as attachmentStream from '../exam/attachments/attachment-stream'
import { uuidValidator } from './uuid-validator'
import bodyParser from 'body-parser'
import { upsertAttachmentForExam } from '../db/exam-data'
import { getAttachments, getAttachment } from '../db/attachment-data'
import { getExamAsXml } from '../exam/json-to-xml/json-to-xml'
import { migrateXmlToLatestSchemaVersion } from '../exam/xml-mastering'
import { version } from '@digabi/exam-engine-mastering/package.json'
import { renameAttachmentIfAlreadyExists } from '../utils/exam-attachment-utils'
const jsonMaxSizeInBytes = 500 * 1024

moduleRouter.get('/status/:userId', (req, res, next) => {
  examDb
    .getExamStatusForUser(req.params.userId)
    .then(data => res.json(data))
    .catch(next)
})

moduleRouter.get('/questions/:userId', (req, res, next) => {
  examDb
    .getPrivateExamQuestions(req.params.userId)
    .then(data => res.json(data))
    .catch(next)
})

moduleRouter.get('/public-questions', (req, res, next) => {
  examDb
    .getPublicExamQuestions({ ...req.query })
    .then(data => res.json(data))
    .catch(next)
})

moduleRouter.get('/public-questions/filters', (req, res, next) => {
  examDb
    .getPublicExamFilters()
    .then(data => res.json(data))
    .catch(next)
})

moduleRouter.get('/ee-version', (req, res) => {
  const packageVersion = version
  return res.send(packageVersion)
})

moduleRouter.post('/password/:examUuid/:userId', uuidValidator('examUuid'), bodyParser.json(), (req, res, next) => {
  examDb
    .updateXmlExamPassword(req.params.examUuid, req.params.userId, req.body.password)
    .then(response => {
      if (response.rowCount < 1) throw new DataError('No XML exam found to update')
      return res.sendStatus(204)
    })
    .catch(next)
})

moduleRouter.post('/held-exam/:heldExamUuid/undelete', uuidValidator('heldExamUuid'), (req, res, next) => {
  examDb
    .markHeldExamAsUndeleted(req.params.heldExamUuid)
    .then(data => res.json(data))
    .catch(next)
})

moduleRouter.get('/held-exam/:heldExamUuid', uuidValidator('heldExamUuid'), (req, res, next) => {
  examDb
    .getExamUuidByHeldExamUuid(req.params.heldExamUuid)
    .then(examUuid => res.json({ examUuid }))
    .catch(next)
})

moduleRouter.delete('/held-exam/:heldExamUuid', uuidValidator('heldExamUuid'), (req, res, next) => {
  examDb
    .markHeldExamAsDeleted(req.params.heldExamUuid)
    .then(data => res.json(data))
    .catch(next)
})

moduleRouter.get('/held-exam/:heldExamUuid/exam', uuidValidator('heldExamUuid'), (req, res, next) => {
  examDb.getHeldExam(req.params.heldExamUuid).then(expressUtils.respondWithJsonOr404(res)).catch(next)
})

moduleRouter.get('/:examUuid/exam', uuidValidator('examUuid'), async (req, res, next) => {
  const { examUuid } = req.params
  const exam = await examDb.getExam(examUuid)
  if (!exam) {
    res.status(404).end()
    return
  }
  try {
    res.send(await getExamAsXml(exam))
  } catch (err) {
    next(err)
  }
})

moduleRouter.post('/:examUuid/lock', uuidValidator('examUuid'), (req, res, next) => {
  examDb
    .lockExam(req.params.examUuid)
    .then(data => res.json(data))
    .catch(next)
})

moduleRouter.get('/:examUuid/attachments', uuidValidator('examUuid'), (req, res, next) => {
  getAttachments(req.params.examUuid)
    .then(rows => res.json(rows || []))
    .catch(next)
})

moduleRouter.get('/:examUuid/exam-meb', uuidValidator('examUuid'), async (req, res) => {
  const examUuid = req.params.examUuid
  const noShuffle = !!req.query.noShuffle

  try {
    return await streamXmlMeb(examUuid, noShuffle, res)
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status ? error.status : 400).end()
    } else {
      return res.status(404).end()
    }
  }
})

moduleRouter.get('/:examUuid/export-exam', uuidValidator('examUuid'), (req, res, next) => {
  respondWithExamPackage(examPacker.createExportExamPackage, () => false, 'zip', req, res, next)
})

const multerConfigsForAttachmentUpload = {
  inMemory: true,
  limits: { fileSize: 150 * 1024 * 1024 }
}

const attachmentUpload = multer(multerConfigsForAttachmentUpload).array('attachmentUpload')
const attachmentUploadMiddleware = (req, res, next) => {
  attachmentUpload(req, res, err => {
    if (err && _.includes(err.message, 'File too large')) {
      return res.status(413).send('Attachment too big')
    } else {
      return next(err)
    }
  })
}

function badRequestIfNothingAdded(attachments) {
  if (_.isEmpty(attachments)) {
    throw new DataError('No attachments to add')
  }
}
function sanitizeFileName(originalFileName) {
  return originalFileName.replace(/,/g, ' ')
}

moduleRouter.post(
  '/:examUuid/attachments/add',
  uuidValidator('examUuid'),
  attachmentUploadMiddleware,
  (req, res, next) => {
    BPromise.map(req.files, file =>
      attachmentsStorage.storeFileInS3AndDb(
        req.params.examUuid,
        sanitizeFileName(Buffer.from(file.originalname, 'latin1').toString('utf8')),
        file.buffer
      )
    )
      .tap(badRequestIfNothingAdded)
      .then(addedAttachments => res.json(addedAttachments))
      .catch(error => {
        logger.warn('Error in /:examUuid/attachments/add', error)
        return next(error)
      })
  }
)

moduleRouter.post(
  '/:examUuid/attachments/copyFrom/:sourceExamUuid/{*fileName}',
  uuidValidator('examUuid'),
  uuidValidator('sourceExamUuid'),
  async (req, res, next) => {
    const { examUuid, sourceExamUuid } = req.params
    const fileName = req.params.fileName.join('/')
    try {
      const attachments = await getAttachments(examUuid)
      const existingAttachment = await getAttachment(sourceExamUuid, fileName)
      if (!existingAttachment) {
        logger.warn(`Cannot find attachment for file '${fileName}' in exam ${sourceExamUuid}`)
        return next()
      }
      if (!existingAttachment.displayName) {
        logger.error('Cannot find displayName', { fileName, exam: sourceExamUuid })
        return next()
      }

      const newName = renameAttachmentIfAlreadyExists(
        existingAttachment.displayName,
        existingAttachment.size,
        attachments
      )

      const newDisplayName = newName || existingAttachment.displayName
      if (existingAttachment.displayName !== newDisplayName) {
        logger.info(`Renamed '${existingAttachment.displayName}' to '${newDisplayName}'`)
      }
      const newAttachmentMetadata = await cloneAttachment(
        {
          ...existingAttachment,
          displayName: newDisplayName,
          originalName: newDisplayName !== existingAttachment.displayName ? existingAttachment.displayName : undefined
        },
        examUuid
      )
      res.json(newAttachmentMetadata)
    } catch (err) {
      logger.error('Attachment not copied', { fileName, error: err })
      next(err)
    }
  }
)

moduleRouter.get('/:examUuid/attachments/{*fileName}', uuidValidator('examUuid'), async (req, res, next) => {
  try {
    const { contents, mimeType } = await attachmentStream.retrieveAttachmentS3Stream(
      req.params.examUuid,
      req.params.fileName.join('/')
    )

    const charset = /^text/.test(mimeType) ? 'UTF-8' : ''

    res.setHeader('Content-Type', mimeType + (charset ? `; charset=${charset}` : ''))
    await pipeline(contents, res).catch(err => {
      if (err?.code !== 'ERR_STREAM_PREMATURE_CLOSE' && err?.code !== 'ECONNRESET') throw err
    })
  } catch (err) {
    if (err.status === 404) {
      return res.sendStatus(404)
    }

    logger.warn('Error in /:examUuid/attachments/{*fileName}', {
      error: err,
      examUuid: req.params.examUuid,
      fileName: req.params.fileName.join('/')
    })

    if (err.code === 'TimeoutError') {
      return res.headersSent ? res.end() : res.sendStatus(504)
    }

    return next(err)
  }
})

moduleRouter.delete('/:examUuid/attachments/{*fileName}', uuidValidator('examUuid'), (req, res, next) => {
  attachmentsStorage
    .deleteAttachment(req.params.examUuid, req.params.fileName.join('/'))
    .then(() => res.status(204).json(null))
    .catch(error => {
      logger.warn('Error in /:examUuid/attachments/{*fileName}', error)
      return next(error)
    })
})

export async function extractZipFileExamContent(zipFileBuffer) {
  let extractedExamContent

  try {
    const zipFile = await yauzl.fromBuffer(zipFileBuffer)
    for await (const entry of zipFile) {
      if (['exam.xml', 'exam-content.json'].includes(entry.filename)) {
        const examContentReadStream = await entry.openReadStream()
        const content = await readStreamToString(examContentReadStream)
        if (extractedExamContent) {
          throw new Error('Zip contains both xml and json content: not supported')
        }
        extractedExamContent = {
          type: entry.filename === 'exam.xml' ? 'xml' : 'json',
          content
        }
      }
    }
  } catch (err) {
    throw new DataError(`Could not unpack zip file: ${err}`, 422)
  }

  if (!extractedExamContent) {
    throw new DataError('Zip did not contain exam.xml or exam-content.json: not supported', 422)
  }

  return extractedExamContent
}

function readStreamToString(readStream) {
  return new Promise((resolve, reject) => {
    let readBuilder = ''
    readStream.on('data', data => (readBuilder += data.toString()))
    readStream.on('error', err => reject(new DataError(err.message, 422)))
    readStream.on('end', () => {
      resolve(readBuilder)
    })
  })
}

moduleRouter.post(
  '/import-exam',
  expressUtils.extendTimeoutForUploadRouteWithLargeFiles,
  expressUtils.fileUploadMiddleware('examZip', expressUtils.abittiImportExamMaxFileSize),
  async (req, res, next) => {
    try {
      const examContent = await extractZipFileExamContent(req.file.buffer)
      switch (examContent.type) {
        case 'xml':
          return res.json(await importXmlTransferZip(req.body.userId, examContent.content, req.file.buffer))
        case 'json':
          if (Buffer.byteLength(examContent.content, 'utf8') > jsonMaxSizeInBytes) {
            return res.status(413).end()
          }
          return res.json(await importLegacyTransferZip(req.body.userId, examContent.content, req.file.buffer))
        default:
          throw new DataError(`Unknown exam content type ${examContent.type}`)
      }
    } catch (error) {
      logger.warn('Error in /import-exam', error)
      next(error)
    }
  }
)

moduleRouter.get(
  '/copy-exam/:examUuid/:userId',
  expressUtils.extendTimeoutForUploadRouteWithLargeFiles,
  uuidValidator('examUuid'),
  uuidValidator('userId'),
  async (req, res, next) => {
    try {
      const examUuid = req.params.examUuid
      const exam = await examDb.getExam(examUuid)
      const account = exam && (await examDb.getAccountForExamUuid(exam.examUuid))[0]
      if (!exam || !account || account.user_account_id !== req.params.userId) {
        res.status(404).end()
        return
      }
      if (!exam.contentXml) {
        try {
          const convertedExam = await getExamAsXml(exam)
          exam.contentXml = migrateXmlToLatestSchemaVersion(convertedExam.contentXml)
          exam.content = null
        } catch (err) {
          return next(err)
        }
      }
      const newExam = await examDb.createExam(exam.examLanguage, exam.title, req.params.userId, exam.contentXml, false)
      const attachments = await getAttachments(examUuid)
      await Promise.all(attachments.map(attachment => cloneAttachment(attachment, newExam.examUuid)))
      return res.status(200).json(newExam)
    } catch (err) {
      logger.error('exam copy failed', { error: err })
      next(err)
    }
  }
)

const cloneAttachment = async (existingAttachment, newExamUuid) => {
  const newStorageKey = awsUtils.makeAttachmentFileName(newExamUuid, existingAttachment.displayName)
  try {
    await awsUtils.copyAttachment(existingAttachment.storageKey, newStorageKey)
    const newAttachmentMetadata = {
      ...existingAttachment,
      examUuid: newExamUuid,
      storageKey: newStorageKey
    }

    await upsertAttachmentForExam(newAttachmentMetadata)
    return newAttachmentMetadata
  } catch (err) {
    logger.error('Attachment not added', { attachment: existingAttachment.displayName, error: err })
    throw err
  }
}

function respondWithExamPackage(createPackageFn, isForbiddenFn, fileSuffix, req, res, next) {
  let startTime = process.hrtime()
  examDb
    .getExam(req.params.examUuid)
    .then(exam => {
      logger.debug(`got exam at ${utils.hrTimeDiffAsMillis(process.hrtime(startTime))}`)
      startTime = process.hrtime()
      if (isForbiddenFn(exam)) {
        return res.status(403).end()
      }
      return createPackageFn(exam).then(zip => {
        logger.debug(`zip creation took ${utils.hrTimeDiffAsMillis(process.hrtime(startTime))}`)
        const filename = encodeURIComponent(zipUtils.createZipName(getPrefix(fileSuffix), exam.title, fileSuffix))
        return expressUtils.respondWithZip(res, filename, zip)
      })
    })
    .catch(error => {
      logger.warn('Error in respondWithExamPackage', error)
      return next(error)
    })

  function getPrefix(fileSuffix) {
    return fileSuffix === 'zip' ? 'transfer' : 'exam'
  }
}

export default moduleRouter
