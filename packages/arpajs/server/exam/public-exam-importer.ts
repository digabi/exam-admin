import { S3 } from '@aws-sdk/client-s3'
import { streamToBuffer } from '../aws-utils'
import { extractZipFileExamContent } from '../routes/exams'
import { isExamImported, setExamAsSkipped, setExamImported } from '../db/public-exam-data'
import { logger } from '../logger'
import config from '../config/configParser'
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'
import { importXmlTransferZip } from './xml-import'

const bucket = config.matriculationExamsBucket

async function getS3Client() {
  if (!config.runningInCloud) {
    const { accessKeyId, secretAccessKey } = (
      config.secrets.s3Credentials as { attachmentUpAndDownloader: { accessKeyId: string; secretAccessKey: string } }
    ).attachmentUpAndDownloader
    return new S3({
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      region: 'eu-west-1'
    })
  }

  const client = new STSClient({ region: 'eu-north-1' })
  const assumeRoleCommand = new AssumeRoleCommand({
    RoleArn: config.publicExamsRoleArn,
    RoleSessionName: 's3_cross_region_session'
  })
  const response = await client.send(assumeRoleCommand)

  if (
    !response.Credentials ||
    !response.Credentials.AccessKeyId ||
    !response.Credentials.SecretAccessKey ||
    !response.Credentials.SessionToken
  ) {
    throw new Error('Assume failed')
  }
  return new S3({
    region: 'eu-west-1',
    credentials: {
      accessKeyId: response.Credentials.AccessKeyId,
      secretAccessKey: response.Credentials.SecretAccessKey,
      sessionToken: response.Credentials.SessionToken
    }
  })
}

export async function importYoExams() {
  try {
    const files = await listFilteredFilesRecursively(bucket)
    logger.info('Files found', { files })
    for (const file of files) {
      try {
        const exists = await isExamImported(file)
        if (exists) {
          logger.info('Exam already exists, skipping import: ', file)
        } else {
          await importExam(file)
        }
      } catch (err) {
        logger.warn('Something failed when processed file', { file, err })
      }
    }
  } catch (err) {
    logger.warn('Something failed when handling files', err)
    throw err
  }
}

async function importExam(file: string) {
  const examPackage = await getTransferZip(file)
  const buffer = (await streamToBuffer(examPackage.Body)) as Buffer
  const examContent = (await extractZipFileExamContent(buffer)) as { type: string; content: string }
  if (examContent.type === 'xml') {
    const { examUuid } = (await importXmlTransferZip(null, examContent.content, buffer)) as { examUuid: string }
    await setExamImported(examUuid, file)
  } else {
    await setExamAsSkipped(file)
  }
  logger.info('Exam package imported', { file })
}

async function listFilteredFilesRecursively(bucketName: string, marker?: string, accumulatedFiles: string[] = []) {
  const listParams = {
    Bucket: bucketName,
    Marker: marker,
    Prefix: 'Kokeet/'
  }

  try {
    const response = await (await getS3Client()).listObjects(listParams)

    const filteredFiles = response.Contents?.filter(item => item.Key?.endsWith('_transfer.zip'))
      .map(item => item.Key)
      .filter(key => key !== undefined)

    const newAccumulatedFiles = accumulatedFiles.concat(filteredFiles || [])

    if (response.IsTruncated) {
      const newMarker = response.Contents?.[response.Contents.length - 1].Key
      return listFilteredFilesRecursively(bucketName, newMarker, newAccumulatedFiles)
    } else {
      return newAccumulatedFiles
    }
  } catch (err) {
    logger.error('Error listing S3 bucket objects', err)
    throw err
  }
}

async function getTransferZip(key: string) {
  return (await getS3Client()).getObject({ Bucket: bucket, Key: key })
}
