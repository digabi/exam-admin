import fs from 'fs'
import config from '../config/configParser'
const answersPrivateKey = config.secrets.answersPrivateKey as string
import * as examDb from '../db/exam-data'
import { Attachment, createMex } from '@digabi/exam-engine-mastering'
import { Response } from 'express'
import { tryXmlMastering, XmlExam } from './xml-mastering'
import { logger } from '../logger'
import BPromise from 'bluebird'
import * as attachmentStream from './attachments/attachment-stream'
import { Readable } from 'stream'

import { zip } from '@digabi/js-utils'

interface AttachmentStream {
  mimeType: string
  filename: string
  contents: Readable
}

function isAttachmentRestricted(attachmentFilename: string, masteredAttachmentList: Attachment[]) {
  const masteredAttachment = masteredAttachmentList.find(
    masteredAttachment => masteredAttachment.filename === attachmentFilename
  )
  if (!masteredAttachment) {
    logger.warn(`Could not find restricted status for attachment ${attachmentFilename}`)
    return false
  }
  return masteredAttachment.restricted
}

export const streamXmlMeb = async (examUuid: string, noShuffle: boolean, res: Response) => {
  const exam = (await examDb.getExam(examUuid)) as XmlExam
  if (!exam.locked) {
    return res.status(403).end()
  }
  if (exam.contentXml === null) {
    return res.status(404).end()
  }
  const {
    xml,
    gradingStructure,
    attachments: masteredAttachmentList
  } = await tryXmlMastering(exam, noShuffle, exam.attachmentsMetadata)

  await examDb.updateGradingStructure(examUuid, gradingStructure)

  return BPromise.map(exam.attachments || [], (fileName: string) =>
    attachmentStream.retrieveAttachmentS3Stream(examUuid, fileName)
  ).then((attachmentStreams: AttachmentStream[]) => {
    const nsaScripts = fs.createReadStream(config.prePackagedNsaScriptZipPath)
    const ktpUpdate = config.useKtpUpdate ? fs.createReadStream(config.prePackagedKtpUpdatePath) : undefined
    const koeUpdate = config.useKoeUpdate ? fs.createReadStream(config.prePackagedKoeUpdatePath) : undefined

    const filename = zip.createZipName('exam_', exam.title, 'mex')
    res.set('Content-disposition', `attachment; filename=${filename}`)

    return createMex(
      xml.toString(),
      attachmentStreams.map(attachment => ({
        ...attachment,
        restricted: isAttachmentRestricted(attachment.filename, masteredAttachmentList)
      })),
      nsaScripts,
      null,
      exam.password,
      answersPrivateKey,
      res,
      null,
      ktpUpdate,
      koeUpdate
    )
  })
}
