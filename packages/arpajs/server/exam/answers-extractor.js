'use strict'

import { pipeline } from 'node:stream/promises'
import { buffer } from 'node:stream/consumers'
import _ from 'lodash'
import * as awsUtils from '../aws-utils'
import * as gradingDb from '../db/grading-data'
import BPromise from 'bluebird'
import * as examDb from '../db/exam-data'
import * as cryptoUtils from '@digabi/crypto-utils'
import { config } from '../config'
import R from 'ramda'
import { extractZip } from '@digabi/zip-utils'
import { DataError } from '@digabi/express-utils'
import { logger } from '../logger'
import { pgrm } from '../db/local-pg-resource-management'
import { isAbitti2KtpVersion } from '../utils/ktp-version-utils'
import SQL from 'sql-template-strings'

const zipEntrySizeLimit = 1024 * 1024 * 1024 * 2

export async function extract(fileBuffer) {
  const { zipContents, keys } = await extractAndDecryptZipContents(fileBuffer)
  const result = await importAnswersFromZip(keys, zipContents)
  await extractAndImportLogs(keys, zipContents, result.examUuids, result.heldExamUuids)
  return result
}

async function extractAndImportLogs(keys, zipContents, examUuids, heldExamUuids) {
  const entry = zipContents['everything.log.zip.bin'] || zipContents['logs.zip.bin']
  if (!entry) {
    return
  }

  const prefix = await getLogPrefix(heldExamUuids)
  const logIdentifier = `exam_${examUuids.join('_')}_held_exam_${heldExamUuids.join('_')}`
  const prefixedLogIdentifier = prefix ? `${prefix}-${logIdentifier}` : logIdentifier
  // User-defined object metadata headers have a 2KB limit. With the encryption key taking up a large chunk of the
  // space, it sometimes exceeds this limit when the number of held exams is large.
  // This is a temporary solution to this problem where we truncate the held exam uuids to a maximum of 30.
  const metadata = { 'held-exam-uuids': JSON.stringify(heldExamUuids.slice(0, 30)) }
  try {
    return await pipeline(
      await entry.open(),
      cryptoUtils.createAES256DecryptStreamWithIv(keys.key, keys.iv),
      logStream => awsUtils.uploadLogToS3(prefixedLogIdentifier, logStream, metadata)
    )
  } catch (error) {
    logger.warn(`Failed to upload logs to bucket S3`, { error, heldExamUuids, alarmThreshold: 2 })
  }
}

async function getLogPrefix(heldExamUuids) {
  if (!heldExamUuids || heldExamUuids.length === 0) {
    return null
  }

  try {
    const heldExams = await pgrm.queryRowsAsync(
      SQL`SELECT held_exam_ktp_version 
          FROM held_exam 
          WHERE held_exam_uuid = ANY(${heldExamUuids}::uuid[])`
    )

    if (heldExams.length === 0) {
      logger.warn('No held exams found for prefix generation', { heldExamUuids })
      return null
    }

    // Determine abitti version: if there's any abitti2 exam, flag it as abitti2
    const hasAbitti2 = heldExams.some(he => isAbitti2KtpVersion(he.held_exam_ktp_version))
    const abittiVersion = hasAbitti2 ? '2' : '1'

    const dateStr = new Date().toISOString().split('T')[0] // date in yyyy-mm-dd format
    return `abitti${abittiVersion}-${dateStr}`
  } catch (error) {
    logger.error('Failed to generate log prefix', { error, heldExamUuids })
    return null
  }
}

async function extractAndDecryptZipContents(zipBuffer) {
  const zipContents = await extractZip(zipBuffer, zipEntrySizeLimit)
  assertNotExamMeb(zipContents)
  try {
    const keys = await decryptKeys(zipContents)

    return { zipContents, keys }
  } catch (err) {
    throw new DataError('Could not decrypt zip file', 400, err)
  }
}

async function decryptAnswers(keys, zipContents) {
  const entry = zipContents['answerPapers.json.bin']
  return decryptAES256ToBuffer(await entry.open(), keys.key, keys.iv)
}

async function decryptScreenshots(keys, zipContents) {
  const entry = zipContents['screenshots.zip.bin']
  if (entry) {
    const screenshots = await decryptAES256ToBuffer(await entry.open(), keys.key, keys.iv)
    return extractZip(screenshots, zipEntrySizeLimit)
  }
}

async function decryptAudios(keys, zipContents) {
  const entry = zipContents['audios.zip.bin']
  if (entry) {
    const audios = await decryptAES256ToBuffer(await entry.open(), keys.key, keys.iv)
    return extractZip(audios, zipEntrySizeLimit)
  }
}

async function decryptEnvironmentData(keys, zipContents) {
  const entry = zipContents['environment.json.bin']
  if (entry) {
    return decryptAES256ToBuffer(await entry.open(), keys.key, keys.iv)
  }
  return Promise.resolve([])
}

async function importAnswersFromZip(keys, zipContents) {
  const answers = await decryptAnswers(keys, zipContents)
  const screenshots = await decryptScreenshots(keys, zipContents)
  const audios = await decryptAudios(keys, zipContents)
  const environmentData = await decryptEnvironmentData(keys, zipContents).catch(_.noop)

  const examsWithAnswerPapers = parseAnswers(answers)
  if (!examsWithAnswerPapers.length) throw new DataError('Meb file contained no answer papers', 422)
  const answerCounts = examsWithAnswerPapers.map(e => ({ examUuid: e.examUuid, answerCount: e.answerPapers.length }))
  const examsWithExistingStudents = await getExamsWithExistingStudents(examsWithAnswerPapers)
  const examUuids = _.map(examsWithAnswerPapers, 'examUuid')
  const allExams = await BPromise.all(
    examUuids.map(async examUuid => ({
      examUuid,
      exam: await examDb.getExam(examUuid, { includeDeleted: true })
    }))
  )

  const isPermanentlyDeleted = entry => !entry.exam
  const isNotPermanentlyDeleted = R.complement(isPermanentlyDeleted)

  const heldExamUuids = await gradingDb.importAnswers(examsWithAnswerPapers, screenshots, audios, environmentData)

  const [exams, deletedExams] = R.partition(e => !e.deletionDate)(
    allExams.filter(isNotPermanentlyDeleted).map(entry => entry.exam)
  )

  const examInfo = exam => ({
    title: exam.title,
    examUuid: exam.examUuid,
    isDuplicate: examsWithExistingStudents.includes(exam.examUuid),
    answerCount: answerCounts.find(a => a.examUuid === exam.examUuid)?.answerCount ?? 0
  })

  return {
    exams: exams.map(examInfo),
    deletedExams: [
      ...deletedExams.map(examInfo),
      ...allExams.filter(isPermanentlyDeleted).map(exam => ({
        title: `Poistettu koe / Raderade provet`,
        examUuid: exam.examUuid,
        answerCount: answerCounts.find(a => a.examUuid === exam.examUuid)?.answerCount ?? 0
      }))
    ],
    examUuids,
    heldExamUuids
  }

  function parseAnswers(answerFileContents) {
    return R.pipe(
      R.tryCatch(JSON.parse, () => {
        throw new DataError('answerPapers.json is not valid JSON')
      }),
      R.when(isLegacyAnswersJson, convertLegacyJson)
    )(answerFileContents)
  }

  async function getExamsWithExistingStudents(answersJson) {
    const studentUuids = _.flatten(
      answersJson.map(examWithAnswerPaper => examWithAnswerPaper.answerPapers.map(ap => ap.student.uuid))
    )
    const examUuids = answersJson.map(examWithAnswerPaper => examWithAnswerPaper.examUuid)
    let examsWithExistingStudents = []
    for (const examUuid of examUuids) {
      const examHasAnswers = await examDb.examHasStudents(examUuid, studentUuids)
      if (examHasAnswers) {
        examsWithExistingStudents.push(examUuid)
      }
    }
    return examsWithExistingStudents
  }
}

function isLegacyAnswersJson(answers) {
  return !_.isArray(answers) && _.has(answers, 'answerPapers') && answers.answerPapers.length
}

export function singleUnambiguousValue(key, rows) {
  var allValues = _.reduce(
    rows,
    (memo, row) => _.filter(_.union(memo, _.flatten([row[key]])), v => !_.isUndefined(v)),
    []
  )
  if (allValues.length > 1) {
    throw new Error(`Multiple values for field '${key}':${JSON.stringify(allValues)}`)
  } else if (allValues.length === 0) {
    throw new Error(`No values for mandatory field '${key}':${JSON.stringify(allValues)}`)
  } else {
    return allValues[0]
  }
}

function convertLegacyJson(answers) {
  const examUuid = singleUnambiguousValue('examUuid', answers.answerPapers)
  return [
    {
      examUuid,
      answerPapers: answers.answerPapers
    }
  ]
}

async function decryptKeys(zipContents) {
  const keyfile = zipContents['keys.json.bin']
  if (!keyfile) {
    throw new DataError('Keys missing from zip file')
  }
  const buffer = await keyfile.readIntoBuffer()
  return JSON.parse(cryptoUtils.decryptWithPrivateKeyFromBuffer(config().answersPrivateKey, buffer).toString())
}

async function decryptAES256ToBuffer(readable, key, iv) {
  try {
    return await pipeline(readable, cryptoUtils.createAES256DecryptStreamWithIv(key, iv), buffer)
  } catch (error) {
    throw new DataError('Could not decrypt stream', 400)
  }
}

function assertNotExamMeb(zipContents) {
  if (zipContents['nsa.zip.bin']) {
    throw new DataError('User uploaded an exam meb', 415)
  }
}
