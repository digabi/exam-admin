import * as attachmentDb from '../../db/attachment-data'
import * as awsUtils from '../../aws-utils'
import stream from 'stream'
import { DataError } from '@digabi/express-utils'

export async function retrieveAttachmentS3Stream(examUuid: string, fileName: string) {
  const retrievedAttachment = await attachmentDb.getAttachment(examUuid, fileName)
  if (!retrievedAttachment) {
    throw new DataError('Attachment not found', 404)
  }

  return {
    contents: (await awsUtils.getAttachmentAsStreamFromS3(retrievedAttachment.storageKey)) as stream.Readable,
    filename: fileName,
    mimeType: retrievedAttachment.mimeType
  }
}
