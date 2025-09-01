import fs from 'fs'
import config from '../config/configParser'
const answersPrivateKey = config.secrets.answersPrivateKey as string
import * as examDb from '../db/exam-data'
import { Attachment, createMex } from '@digabi/exam-engine-mastering'
import { Response } from 'express'
import { tryXmlMastering, XmlExam } from './xml-mastering'
import { logger } from '../logger'
import * as attachmentStream from './attachments/attachment-stream'
import { Readable } from 'stream'
import { downloadNsaScripts } from '../aws-utils'
import { createZipName } from '@digabi/zip-utils'

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

  const attachments = await Promise.all(
    exam.attachments.map(async fileName => {
      const attachment = await attachmentStream.retrieveAttachmentS3Stream(examUuid, fileName)
      return {
        ...attachment,
        restricted: isAttachmentRestricted(attachment.filename, masteredAttachmentList)
      }
    })
  )

  const nsaScripts = await getNsaScripts(examUuid)
  const ktpUpdate = config.useKtpUpdate ? fs.createReadStream(config.prePackagedKtpUpdatePath) : undefined
  const koeUpdate = config.useKoeUpdate ? fs.createReadStream(config.prePackagedKoeUpdatePath) : undefined

  const filename = createZipName('exam_', exam.title, 'mex')
  res.set('Content-disposition', `attachment; filename=${filename}`)

  return createMex(
    xml.toString(),
    attachments,
    nsaScripts,
    null,
    exam.password,
    answersPrivateKey,
    res,
    null,
    ktpUpdate,
    koeUpdate
  )
}

async function getNsaScripts(examUuid: string): Promise<Readable> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  if (await examDb.useS3NsaScripts(examUuid)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const scripts: Readable | null | undefined = await downloadNsaScripts()
    return scripts ?? prepackagedNsaScripts()
  } else {
    return prepackagedNsaScripts()
  }
}

function prepackagedNsaScripts() {
  return fs.createReadStream(config.prePackagedNsaScriptZipPath)
}
