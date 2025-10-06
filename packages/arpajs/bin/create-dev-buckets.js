#!/usr/bin/env node
const { s3Client } = require('../dist/aws-utils')
const { Readable } = require('stream')
const config = require('../dist/config/config').default
const fs = require('fs')
const { Upload } = require('@aws-sdk/lib-storage')

const testExamPath = './test/resources/A_X_S2018_missing_attachments.zip'

async function run() {
  await deleteBucket(config.s3NsaScriptsBucket)
  await deleteBucket(config.s3NsaFindingsBucket)
  await deleteBucket(config.matriculationExamsBucket)

  for (const bucket of [
    config.s3ExamLogsBucket,
    config.s3AttachmentsBucket,
    config.s3NsaScriptsBucket,
    config.s3NsaFindingsBucket,
    config.matriculationExamsBucket
  ]) {
    console.log(`Creating bucket ${bucket}`)
    try {
      await insertBucket(bucket)
    } catch (e) {
      if (e.Code !== 'BucketAlreadyOwnedByYou') {
        throw e
      }
    }
  }
  // add fake nsa's for testing
  console.log(`Put fake nsa scripts into ${config.s3NsaScriptsBucket}`)
  await putFileIntoBucket('nsa.zip', 'contents of nsa.zip')
  await putFileIntoBucket('another-nsa.zip', 'contents of another-nsa.zip')
  if (fs.existsSync(testExamPath)) {
    await putFileIntoBucket(
      'Kokeet/2018S/A/AX_fi-FI_transfer.zip',
      fs.readFileSync(testExamPath),
      config.matriculationExamsBucket
    )
  }
}

function insertBucket(bucket) {
  try {
    return s3Client.createBucket({ Bucket: bucket })
  } catch (e) {
    if (e.Code !== 'BucketAlreadyOwnedByYou') {
      console.error(e.message ? e.message : e.stack)
      throw e
    }
  }
}

async function deleteBucket(bucket) {
  try {
    const objects = (await s3Client.listObjects({ Bucket: bucket })).Contents
    for (const object of objects ?? []) {
      await s3Client.deleteObject({ Bucket: bucket, Key: object.Key })
    }
    return s3Client.deleteBucket({ Bucket: bucket })
  } catch (e) {
    if (e.Code !== 'NoSuchBucket') {
      throw e
    }
  }
}

async function putFileIntoBucket(filename, fileContent, bucketName = config.s3NsaScriptsBucket) {
  const fileStream = Readable.from(Buffer.from(fileContent))
  await new Upload({
    client: s3Client,
    params: { Bucket: bucketName, Key: filename, Body: fileStream }
  }).done()
}

if (!config.runningInCloud) {
  void run()
}
