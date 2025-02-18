'use strict'

import * as examDb from '../db/exam-data'
import * as attachmentsStorage from './attachments/attachments-storage'
import { exc } from '@digabi/js-utils'
import { tryXmlMasteringWithShuffle } from './xml-mastering'

export async function importXmlTransferZip(userId: number | null, xml: string, zipFileBuffer: Buffer) {
  const { migratedXml, ...masteringResult } = await tryXmlMasteringWithShuffle({
    contentXml: xml
  })
  const contentValid = true // mastering succeeded => content is valid
  const createdXmlExamInfo = await examDb.createExamWithXmlContent(
    migratedXml,
    userId,
    masteringResult.title,
    contentValid,
    {
      examCode: masteringResult.dayCode
        ? `${masteringResult.examCode}_${masteringResult.dayCode}`
        : masteringResult.examCode,
      language: masteringResult.language,
      type: masteringResult.type,
      examPeriod: masteringResult.date && getExaminationCode(masteringResult.date)
    }
  )
  const isXmlExam = true
  const attachmentEntries = (await attachmentsStorage.readZipAndUploadAttachmentsToS3(
    zipFileBuffer,
    createdXmlExamInfo.examUuid,
    isXmlExam,
    masteringResult.attachments
  )) as {
    examUuid: string
    displayName: string
    size: number
    mimeType: string
    storageKey: string
    metadata: object
  }[]
  for (const xmlExamAttachmentEntry of masteringResult.attachments) {
    if (!attachmentEntries.some(attachmentEntry => attachmentEntry.displayName === xmlExamAttachmentEntry.filename))
      throw new exc.DataError(`Zip did not contain ${xmlExamAttachmentEntry.filename}`, 422)
  }

  for (const attachmentEntry of attachmentEntries) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await examDb.addAttachmentForExam(attachmentEntry)
  }

  return { ...createdXmlExamInfo, hasAttachments: attachmentEntries.length > 0 }
}

export function getExaminationCode(dateString: string) {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date')
  }
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  return `${year}${month > 5 ? 'S' : 'K'}`
}
