'use strict'

import * as examDb from '../../db/exam-data'
import * as attachmentDb from '../../db/attachment-data'
import * as awsUtils from '../../aws-utils'
import mime from 'mime'
import BPromise from 'bluebird'
import fileType from 'file-type'
import { logger } from '../../logger'
import { readAttachmentMetadata } from './attachment-metadata'
import { abittiImportExamMaxFileSize, DataError } from '@digabi/express-utils'
import { extractZip, extractZipWithMetadata } from '@digabi/zip-utils'
import { Readable } from 'stream'

const FILTERED_FILES = ['__MACOSX', '.DS_Store', 'Thumbs.db']

const DEFAULT_MIME_TYPE = 'application/octet-stream'

export async function readZipAndUploadAttachmentsToS3(
  zipFileBuffer,
  examUuid,
  isXmlExam = false,
  masteredAttachmentList = []
) {
  const zipContents = await extractZip(zipFileBuffer)
  const attachmentsZip = zipContents['attachments.zip']
  if (!attachmentsZip) return []

  return await readAttachmentsZipAndUploadToS3(
    await attachmentsZip.readIntoBuffer(),
    examUuid,
    isXmlExam,
    masteredAttachmentList
  )
}

async function readAttachmentsZipAndUploadToS3(attachmentsZip, examUuid, isXmlExam, masteredAttachmentList) {
  let attachmentEntries = []
  const zipContents = await extractZipWithMetadata(attachmentsZip)
  for (const [name, file] of Object.entries(zipContents)) {
    if (attachmentIsSupported(name, file) && attachmentInXmlExam(isXmlExam, masteredAttachmentList, name)) {
      if (file.uncompressedSize > abittiImportExamMaxFileSize) {
        throw new DataError(
          `Zip entry was too large: ${file.uncompressedSize} max allowed: ${abittiImportExamMaxFileSize}`
        )
      }

      await examDb.ensureAttachmentFitsWithinLimits(examUuid, file.uncompressedSize)

      const [metadata, storageKey] = await Promise.all([
        readAttachmentMetadata(name, await file.open()),
        awsUtils.uploadAttachmentFileStreamToS3(examUuid, name, await file.open())
      ])

      const attachmentEntry = {
        examUuid,
        displayName: name,
        size: file.uncompressedSize,
        storageKey,
        metadata,
        mimeType: mime.getType(name) ?? DEFAULT_MIME_TYPE
      }

      attachmentEntries.push(attachmentEntry)
    }
  }
  return attachmentEntries
}

function attachmentIsSupported(name, file) {
  return !FILTERED_FILES.includes(name.split('/')[0]) && name[0] !== '.' && file.uncompressedSize > 0
}

function attachmentInXmlExam(isXmlExam, masteredAttachmentList, attachmentName) {
  if (isXmlExam) {
    return masteredAttachmentList.some(masteredAttachment => masteredAttachment.filename === attachmentName)
  } else {
    return true
  }
}

export async function convertAttachmentZipBufferToAttachmentsAndUploadToS3(examUuid, zipBuffer) {
  const filesWithMetadata = await extractZipWithMetadata(zipBuffer)
  const filesToBeStored = Object.keys(filesWithMetadata).filter(
    key => !FILTERED_FILES.includes(key.split('/')[0]) && key[0] !== '.' && filesWithMetadata[key].uncompressedSize > 0
  )
  return BPromise.map(filesToBeStored, async filename =>
    storeFileInS3AndDb(examUuid, filename, await filesWithMetadata[filename].readIntoBuffer())
  )
}

export async function storeFileInS3AndDb(examUuid, displayName, buffer) {
  const mimeType = getFileType(buffer) ?? mime.getType(displayName) ?? DEFAULT_MIME_TYPE
  logger.info(`Uploading file ${displayName} to S3 (${mimeType}, ${buffer.length} bytes)`)

  if (!displayName) {
    throw new DataError('Missing displayName')
  }

  const attachmentFileStream = Readable.from(buffer, { objectMode: false })
  const metadata = await readAttachmentMetadata(displayName, attachmentFileStream)

  try {
    // eslint-disable-next-line promise/valid-params
    await deleteAttachment(examUuid, displayName).catch(AttachmentNotFound, () => {})
    const storageKey = await awsUtils.uploadAttachmentFileBufferToS3(examUuid, displayName, buffer)
    await examDb.ensureAttachmentFitsWithinLimits(examUuid, buffer.length)

    // Several files with same name can be uploaded at the same time
    // that leads to race condition with existing row in attachment table.
    // Upsert keeps last file.
    await examDb.upsertAttachmentForExam({
      examUuid,
      displayName,
      size: buffer.length,
      mimeType,
      storageKey,
      metadata: JSON.stringify(metadata)
    })

    return { storageKey, displayName, mimeType, metadata, size: buffer.length }
  } catch (e) {
    // if something goes wrong, delete the attachment and pass the error one
    await deleteAttachment(examUuid, displayName)
      .catch(() => {})
      .then(() => {
        throw e
      })
  }

  function AttachmentNotFound(e) {
    return e instanceof DataError && e.status === 404
  }
}

function getFileType(buffer) {
  const ft = fileType.fromBuffer(buffer)
  return ft ? ft.mime : undefined
}

export function deleteAttachment(examUuid, fileName) {
  return attachmentDb
    .getAttachment(examUuid, fileName)
    .tap(throw404IfAttachmentNull)
    .tap(({ storageKey }) => examDb.deleteAttachment(storageKey))
    .tap(({ storageKey }) => awsUtils.deleteAttachmentBufferFromS3(storageKey))
}

function throw404IfAttachmentNull(result) {
  if (!result) {
    throw new DataError('Attachment not found', 404)
  }
}
