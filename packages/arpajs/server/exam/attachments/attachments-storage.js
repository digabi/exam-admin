'use strict'

import yauzl from 'yauzl-promise'
import * as examDb from '../../db/exam-data'
import * as attachmentDb from '../../db/attachment-data'
import * as utils from '@digabi/js-utils'
const {
  expressUtils: { abittiImportExamMaxFileSize },
  exc: { DataError },
  zip: zipUtils
} = utils
import * as awsUtils from '../../aws-utils'
import mime from 'mime'
import BPromise from 'bluebird'
import fileType from 'file-type'
import { logger } from '../../logger'
import { readAttachmentMetadata } from './attachment-metadata'

const FILTERED_FILES = ['__MACOSX', '.DS_Store', 'Thumbs.db']

const DEFAULT_MIME_TYPE = 'application/octet-stream'

export async function readZipAndUploadAttachmentsToS3(
  zipFileBuffer,
  examUuid,
  isXmlExam = false,
  masteredAttachmentList = []
) {
  const zipFile = await yauzl.fromBuffer(zipFileBuffer)
  let attachmentEntries = []
  for await (const entry of zipFile) {
    if (entry.filename === 'attachments.zip') {
      const attachmentsZipReadStream = await entry.openReadStream()
      attachmentEntries = await readAttachmentsZipAndUploadToS3(
        attachmentsZipReadStream,
        examUuid,
        isXmlExam,
        masteredAttachmentList
      )
    }
  }
  return attachmentEntries
}

async function readAttachmentsZipAndUploadToS3(readStream, examUuid, isXmlExam, masteredAttachmentList) {
  let attachmentEntries = []
  const zipBuffer = await awsUtils.streamToBuffer(readStream)
  const attachmentsZipFile = await yauzl.fromBuffer(zipBuffer)
  for await (const attachmentFileEntry of attachmentsZipFile) {
    if (
      attachmentIsSupported(attachmentFileEntry) &&
      attachmentInXmlExam(isXmlExam, masteredAttachmentList, attachmentFileEntry)
    ) {
      if (attachmentFileEntry.uncompressedSize > abittiImportExamMaxFileSize) {
        throw new DataError(
          `Zip entry was too large: ${attachmentFileEntry.uncompressedSize} max allowed: ${abittiImportExamMaxFileSize}`
        )
      }

      await examDb.ensureAttachmentFitsWithinLimits(examUuid, attachmentFileEntry.uncompressedSize)

      const [metadata, storageKey] = await Promise.all([
        readAttachmentMetadata(attachmentFileEntry.filename, await attachmentFileEntry.openReadStream()),
        awsUtils.uploadAttachmentFileStreamToS3(
          examUuid,
          attachmentFileEntry.filename,
          await attachmentFileEntry.openReadStream()
        )
      ])

      const attachmentEntry = {
        ...attachmentFileEntry,
        examUuid,
        displayName: attachmentFileEntry.filename,
        size: attachmentFileEntry.uncompressedSize,
        storageKey,
        metadata,
        mimeType: mime.getType(attachmentFileEntry.filename) ?? DEFAULT_MIME_TYPE
      }

      attachmentEntries.push(attachmentEntry)
    }
  }
  return attachmentEntries
}

function attachmentIsSupported(entry) {
  return (
    !FILTERED_FILES.includes(entry.filename.split('/')[0]) && entry.filename[0] !== '.' && entry.uncompressedSize > 0
  )
}

function attachmentInXmlExam(isXmlExam, masteredAttachmentList, attachment) {
  if (isXmlExam) {
    return masteredAttachmentList.some(masteredAttachment => masteredAttachment.filename === attachment.filename)
  } else {
    return true
  }
}

export async function convertAttachmentZipBufferToAttachmentsAndUploadToS3(examUuid, zipBuffer) {
  const filesWithMetadata = await zipUtils.extractZipWithMetadata(zipBuffer)
  const filesToBeStored = Object.keys(filesWithMetadata).filter(
    key => !FILTERED_FILES.includes(key.split('/')[0]) && key[0] !== '.' && filesWithMetadata[key].uncompressedSize > 0
  )
  return BPromise.map(filesToBeStored, filename =>
    storeFileInS3AndDb(examUuid, filename, filesWithMetadata[filename].contents)
  )
}

export async function storeFileInS3AndDb(examUuid, displayName, buffer) {
  const mimeType = getFileType(buffer) ?? mime.getType(displayName) ?? DEFAULT_MIME_TYPE
  logger.info(`Uploading file ${displayName} to S3 (${mimeType}, ${buffer.length} bytes)`)

  if (!displayName) {
    throw new DataError('Missing displayName')
  }

  const attachmentFileStream = awsUtils.bufferToStream(buffer)
  const metadata = await readAttachmentMetadata(displayName, attachmentFileStream)

  try {
    const storageKey = await awsUtils.uploadAttachmentFileBufferToS3(examUuid, displayName, buffer)
    // eslint-disable-next-line promise/valid-params
    await deleteAttachment(examUuid, displayName).catch(AttachmentNotFound, () => {})
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
