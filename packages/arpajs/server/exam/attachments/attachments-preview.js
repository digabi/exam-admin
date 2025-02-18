'use strict'

import BPromise from 'bluebird'
import page from './pageTmpl'
import * as examDb from '../../db/exam-data'
import * as attachmentDb from '../../db/attachment-data'
import * as awsUtils from '../../aws-utils'

const attachmentUrl = (examUuid, fileName, isPreview) =>
  isPreview ? `/exam-api/exams/${examUuid}/attachments/${encodeURIComponent(fileName)}` : `/attachments/${fileName}`

export default (examId, isPreview) =>
  BPromise.join(examDb.getExam(examId), attachmentDb.getAttachments(examId), (exam, attachments) => {
    if (!exam) {
      return null
    }
    const indexFile = attachments.find(a => a.displayName === 'index.html')
    return indexFile
      ? awsUtils.downloadAttachmentsBufferFromS3(indexFile.storageKey)
      : Buffer.from(
          page(
            exam,
            attachments
              .filter(a => a.displayName.match(/^restricted\//) === null)
              .map(attachment =>
                Object.assign(attachment, {
                  url: attachmentUrl(exam.examUuid, attachment.displayName, isPreview)
                })
              )
              .sort((a, b) => (a.displayName < b.displayName ? -1 : 1))
          )
        )
  })
