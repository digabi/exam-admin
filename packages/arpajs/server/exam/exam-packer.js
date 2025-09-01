'use strict'

import * as cryptoUtils from '@digabi/crypto-utils'
import * as awsUtils from '../aws-utils'
import Promise from 'bluebird'
import _ from 'lodash'
import * as examValidator from './validator/validator'
import * as attachmentDb from '../db/attachment-data'
import attachmentsPreview from './attachments/attachments-preview'
import { createZip } from '@digabi/zip-utils'

function makePossiblyEncryptedAttachmentZip(exam, keyAndIv) {
  if (exam.attachmentsFilename) {
    return downloadAndMaybeEncryptAttachmentsZip(exam.attachmentsFilename, keyAndIv)
  } else if (!_.isEmpty(exam.attachments)) {
    return downloadAndMaybeEncryptAttachmentsAndZipThem(exam.examUuid, keyAndIv)
  }
  return Promise.resolve()
}

const forceScreenshotExpected = question =>
  question.type === 'text' ? { ...question, screenshotExpected: true } : question

export const fixTextQuestions = content => {
  const newContent = { ...content }
  newContent.sections.map(section => {
    section.questions = section.questions.map(question => forceScreenshotExpected(question))
    return section
  })
  return newContent
}

export function createExportExamPackage(exam) {
  const isXmlExam = exam && exam.contentXml
  const attachmentsFileP = makePossiblyEncryptedAttachmentZip(exam)
  return Promise.join(attachmentsFileP, attachmentsFile => {
    const examContent = isXmlExam
      ? exam.contentXml
      : JSON.stringify(addSchemaVersionIfMissing(fixTextQuestions(exam.content)))
    const examContentBuffer = Buffer.from(examContent)
    const filenamesAndContents = [
      { name: `exam${isXmlExam ? '.xml' : '-content.json'}`, content: Buffer.from(examContentBuffer) }
    ]

    if (attachmentsFile) {
      filenamesAndContents.push({ name: 'attachments.zip', content: Buffer.from(attachmentsFile) })
    }
    return createZip(filenamesAndContents)
  })

  function addSchemaVersionIfMissing(content) {
    return !_.isUndefined(content.schemaVersion)
      ? content
      : _.assign(content, { schemaVersion: examValidator.schemaVersion })
  }
}

function downloadAndMaybeEncryptAttachmentsZip(attachmentsFilename, keyAndIv) {
  return awsUtils
    .downloadAttachmentsBufferFromS3(attachmentsFilename)
    .then(attachmentsBuffer => (keyAndIv ? encryptBuffer(attachmentsBuffer, keyAndIv) : attachmentsBuffer))
}

function downloadAndMaybeEncryptAttachmentsAndZipThem(examUuid, keyAndIv) {
  return attachmentDb
    .getAttachments(examUuid)
    .then(attachments =>
      Promise.map(
        attachments,
        attachment =>
          awsUtils
            .downloadAttachmentsBufferFromS3(attachment.storageKey)
            .then(data => ({ content: data, name: attachment.displayName })),
        { concurrency: 5 }
      )
    )
    .then(data =>
      attachmentsPreview(examUuid, false).then(index =>
        !keyAndIv ? data : data.concat([{ content: index, name: 'index.html' }])
      )
    )
    .then(createZip)
    .then(zipBuffer => (keyAndIv ? encryptBuffer(zipBuffer, keyAndIv) : zipBuffer))
}

function encryptBuffer(buffer, keyAndIv) {
  return Promise.resolve(cryptoUtils.encryptAES256Async(buffer, keyAndIv.key, keyAndIv.iv))
}
