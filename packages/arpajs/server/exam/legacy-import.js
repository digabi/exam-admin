'use strict'

import * as examDb from '../db/exam-data'
import * as attachmentsStorage from './attachments/attachments-storage'
import * as utils from '@digabi/js-utils'
const {
  exc: { DataError },
  examValidatorAbitti: examValidator
} = utils
import { fixTextQuestions } from './exam-packer'

export async function importLegacyTransferZip(userId, examContent, zipFileBuffer) {
  const createdJsonExamInfo = await examDb.createExamWithContent('fi-FI', validatedJsonExamContent(examContent), userId)
  const attachmentEntries = await attachmentsStorage.readZipAndUploadAttachmentsToS3(
    zipFileBuffer,
    createdJsonExamInfo.examUuid
  )
  for (const attachmentEntry of attachmentEntries) {
    await examDb.addAttachmentForExam(attachmentEntry)
  }
  return { ...createdJsonExamInfo, hasAttachments: attachmentEntries.length > 0 }
}

function validatedJsonExamContent(examContent) {
  if (!examContent) {
    throw new DataError('Zip contains no exam content.', 422)
  }
  let examJson
  try {
    examJson = fixTextQuestions(JSON.parse(examContent.toString()))
  } catch (e) {
    throw new DataError(`Exam content is not valid json. ${e.message}`, 400)
  }
  if (!examValidator.validateExamContentJSONFormat(examJson).valid) {
    throw new DataError('Exam json was not valid a exam.', 400)
  }
  return examJson
}
