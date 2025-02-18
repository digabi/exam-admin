'use strict'

import { S3 as awsS3 } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { mockedS3 } from './aws-s3-mock'
import config from './config/configParser'
import stream from 'stream'
import * as utils from '@digabi/js-utils'
import * as cryptoUtils from '@digabi/crypto-utils'
import path from 'path'
import fs from 'fs'
import { logger } from './logger'

const S3 = config.runningUnitTests ? mockedS3 : awsS3
const S3forLogs = new S3(config.s3ConfigForLogs)
const S3ForAttachments = new S3(config.s3ConfigForAttachments)
const s3LogEncryptionPublicKey = fs.readFileSync(path.resolve(__dirname, 's3_encrypt.pub'))
if (!s3LogEncryptionPublicKey.length) {
  logger.error('No encryption key found, not encrypting logs')
}

async function streamFileToS3Async(s3instance, bucket, key, fileSourceStream, metadata) {
  const startTime = process.hrtime()
  await new Upload({
    client: s3instance,
    params: { Bucket: bucket, Key: key, Body: fileSourceStream, Metadata: metadata }
  }).done()
  logger.info(`Uploaded ${key} to bucket ${bucket} in ${utils.hrTimeDiffAsMillis(process.hrtime(startTime))}ms.`)
}

function streamLogFileToS3Async(bucket, key, fileSourceStream, metadata) {
  return streamFileToS3Async(S3forLogs, bucket, key, fileSourceStream, metadata).catch(e => {
    logger.warn(`Failed to upload ${key} to bucket ${bucket}, error = ${e}`)
    return undefined
  })
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
export function uploadLogToS3(logIdentitier, logFileBuffer) {
  if (logFileBuffer.length === 0) {
    logger.warn('Aborted uploading empty log. Log identifier', logIdentitier)
    return undefined
  }

  const keyIv = cryptoUtils.generateKeyAndIv()

  const keyIvJson = JSON.stringify({
    key: keyIv.key.toString('base64'),
    iv: keyIv.iv.toString('base64')
  })

  const maybeEncryptedSymmetricKey = s3LogEncryptionPublicKey.length
    ? cryptoUtils.encryptWithPublicKey(s3LogEncryptionPublicKey, keyIvJson)
    : undefined

  const maybeCryptedStreamFromBuffer = maybeEncryptedSymmetricKey
    ? cryptBufferWithSymmetricKeyReturningStream(logFileBuffer, keyIv.key, keyIv.iv)
    : logFileBuffer

  return streamLogFileToS3Async(
    config.s3ExamLogsBucket,
    createS3Logfilename(logIdentitier),
    maybeCryptedStreamFromBuffer,
    {
      encryptedSymmetricKey: maybeEncryptedSymmetricKey
    }
  ) // S3 metadata keys are always lowercase
}

function createS3Logfilename(logIdentifier) {
  return `${logIdentifier}_${new Date().getTime()}.log.zip${s3LogEncryptionPublicKey.length ? '.bin' : ''}`
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
  const fileSourceStream = bufferToStream(fileContentBuffer)
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
  return streamAttachmentFileFromS3Async(bucket, key).then(objectFromS3 => streamToBuffer(objectFromS3.Body))
}

function cryptBufferWithSymmetricKeyReturningStream(buffer, symmetricKey, iv) {
  return bufferToStream(buffer).pipe(cryptoUtils.createAES256EncryptStreamWithIv(symmetricKey, iv))
}

export function bufferToStream(buffer) {
  const passThroughStream = new stream.PassThrough()
  passThroughStream.end(buffer)
  return passThroughStream
}

export function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    readableStream.on('data', data => {
      chunks.push(data)
    })
    readableStream.on('error', err => reject(new utils.exc.DataError(err.message, 422)))
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
  })
}
