'use strict'

import { GetObjectCommand, S3 } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import config from './config/configParser'
import { Readable } from 'stream'
import { buffer } from 'stream/consumers'
import { pipeline } from 'stream/promises'
import * as cryptoUtils from '@digabi/crypto-utils'
import path from 'path'
import fs from 'fs'
import { logger } from './logger'

export const s3Client = new S3(config.s3Config)
const S3forLogs = new S3(config.s3ConfigForLogs)
const S3ForAttachments = new S3(config.s3ConfigForAttachments)
const s3LogEncryptionPublicKey = fs.readFileSync(path.resolve(__dirname, 's3_encrypt.pub'))
if (!s3LogEncryptionPublicKey.length) {
  logger.error('No encryption key found, not encrypting logs')
}

async function streamFileToS3Async(s3instance, bucket, key, fileSourceStream, metadata) {
  const startTime = performance.now()
  await new Upload({
    client: s3instance,
    params: { Bucket: bucket, Key: key, Body: fileSourceStream, Metadata: metadata }
  }).done()

  const uploadTimeMilliseconds = Math.round(performance.now() - startTime)
  logger.info(`Uploaded ${key} to bucket ${bucket} in ${uploadTimeMilliseconds}ms.`)
}

function streamAttachmentFileToS3Async(bucket, key, fileSourceStream, metadata) {
  return streamFileToS3Async(S3ForAttachments, bucket, key, fileSourceStream, metadata).then(() => key)
}

function streamAttachmentFileFromS3Async(bucket, key) {
  return S3ForAttachments.getObject({ Bucket: bucket, Key: key })
}

export function copyAttachment(storageKey, newStorageKey) {
  return S3ForAttachments.copyObject({
    Bucket: config.s3AttachmentsBucket,
    CopySource: `/${config.s3AttachmentsBucket}/${encodeURIComponent(storageKey)}`,
    Key: newStorageKey
  })
}

export function uploadLogToS3(logIdentitier, logStream, metadata) {
  const s3Key = createS3Logfilename(logIdentitier)

  if (s3LogEncryptionPublicKey.length === 0) {
    return streamFileToS3Async(S3forLogs, config.s3ExamLogsBucket, s3Key, logStream, metadata)
  }

  const keyIv = cryptoUtils.generateKeyAndIv()

  const keyIvJson = JSON.stringify({
    key: keyIv.key.toString('base64'),
    iv: keyIv.iv.toString('base64')
  })

  const encryptedSymmetricKey = cryptoUtils.encryptWithPublicKey(s3LogEncryptionPublicKey, keyIvJson)
  return pipeline(logStream, cryptoUtils.createAES256EncryptStreamWithIv(keyIv.key, keyIv.iv), encryptedStream =>
    streamFileToS3Async(S3forLogs, config.s3ExamLogsBucket, createS3Logfilename(logIdentitier), encryptedStream, {
      ...metadata,
      encryptedSymmetricKey // S3 metadata keys are always lowercase
    })
  )
}

function createS3Logfilename(logIdentifier) {
  // S3 keys have a max length of 1024 bytes
  const truncatedKey = Buffer.from(logIdentifier, 'utf-8')
    .subarray(0, 1024 - 32)
    .toString('utf-8')
    .replace(/�$/, '')
  return `${truncatedKey}_${new Date().getTime()}.log.zip${s3LogEncryptionPublicKey.length ? '.bin' : ''}`
}

export function uploadAttachmentsZipBufferToS3(examUuid, fileContentBuffer) {
  return uploadFileBufferToS3(
    config.s3AttachmentsBucket,
    createS3AttachmentsFilename(examUuid, '.zip'),
    fileContentBuffer
  )

  function createS3AttachmentsFilename(uuid, postfix) {
    return `attachments_${uuid}_${new Date().getTime()}${postfix}`
  }
}

export function makeAttachmentFileName(examUuid, filename) {
  return `attachment_${examUuid}_${new Date().getTime()}_${filename}`
}

export function uploadAttachmentFileBufferToS3(examUuid, filename, fileContentBuffer) {
  return uploadFileBufferToS3(config.s3AttachmentsBucket, makeAttachmentFileName(examUuid, filename), fileContentBuffer)
}

export async function uploadAttachmentFileStreamToS3(examUuid, filename, fileContentStream) {
  return await streamAttachmentFileToS3Async(
    config.s3AttachmentsBucket,
    makeAttachmentFileName(examUuid, filename),
    fileContentStream,
    {}
  )
}

function uploadFileBufferToS3(s3Bucket, filename, fileContentBuffer) {
  if (!fileContentBuffer) {
    throw new Error('No file contents provided')
  }
  const fileSourceStream = Readable.from(fileContentBuffer)
  return streamAttachmentFileToS3Async(s3Bucket, filename, fileSourceStream, {})
}

export async function getAttachmentAsStreamFromS3(key) {
  const response = await S3ForAttachments.getObject({ Bucket: config.s3AttachmentsBucket, Key: key })
  return response.Body
}

export function downloadAttachmentsBufferFromS3(key) {
  return downloadBufferFromS3(config.s3AttachmentsBucket, key)
}

export function deleteAttachmentBufferFromS3(key) {
  return S3ForAttachments.deleteObject({ Bucket: config.s3AttachmentsBucket, Key: key })
}

export function deleteAttachmentBuffersFromS3(keys) {
  return S3ForAttachments.deleteObjects({
    Bucket: config.s3AttachmentsBucket,
    Delete: {
      Objects: keys.map(key => ({ Key: key }))
    }
  })
}

function downloadBufferFromS3(bucket, key) {
  return streamAttachmentFileFromS3Async(bucket, key).then(objectFromS3 => buffer(objectFromS3.Body))
}

export async function downloadNsaScripts(filename) {
  try {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: config.s3NsaScriptsBucket, Key: filename }))
    return response.Body
  } catch (error) {
    logger.error('Error downloading nsa scripts from S3', { error })
    return null
  }
}

export async function downloadNsaFindings(heldExamUuid) {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: config.s3NsaFindingsBucket, Key: `${heldExamUuid}-findings.pdf` })
  )
  return response.Body
}
