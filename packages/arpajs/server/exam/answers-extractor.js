'use strict'

import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { buffer } from 'node:stream/consumers'
import _ from 'lodash'
import * as awsUtils from '../aws-utils'
import * as gradingDb from '../db/grading-data'
import * as minutesDb from '../db/minutes-data'
import BPromise from 'bluebird'
import * as examDb from '../db/exam-data'
import * as cryptoUtils from '@digabi/crypto-utils'
import { config } from '../config'
import R from 'ramda'
import { extractZip, extractZipFromDisk } from '@digabi/zip-utils'
import { DataError } from '@digabi/express-utils'
import { logger } from '../logger'
import { isAbitti2KtpVersion } from '../utils/ktp-version-utils'
import z from 'zod'
import fs from 'node:fs'
import fsP from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

export const zipEntrySizeLimit = 1024 * 1024 * 1024 * 3

export async function extract(filePath) {
  const { zipDir, zipContents } = await extractZipContents(filePath)
  try {
    const keys = await decryptKeys(zipDir, zipContents).catch(error => {
      throw new DataError('Could not decrypt zip file', 400, error)
    })
    const { answerCountsByExam, heldExamUuids, logsMetadata } = await importAnswersFromZip(keys, zipDir, zipContents)
    const logsKey = await extractAndImportLogs(keys, zipDir, zipContents, logsMetadata)
    await gradingDb.setHeldExamLogsKey(heldExamUuids, logsKey)
    const minutesImportStatus = await extractAndImportMinutes(keys, zipDir, zipContents, heldExamUuids)
    return { answerCountsByExam, minutesImportStatus }
  } finally {
    try {
      await fsP.rm(zipDir, { force: true, recursive: true })
    } catch (error) {
      logger.error('Failed to clean up extracted zip', { error, zipDir })
    }
  }
}

const minutesFileName = 'minutes.json.bin'

async function extractAndImportMinutes(keys, zipDir, zipContents, heldExamUuids) {
  try {
    const minutes = await decryptAndParseMinutes(keys, zipDir, zipContents)
    if (!hasMinutes(minutes)) {
      return 'empty'
    }
    await minutesDb.importMinutes(minutes, heldExamUuids)
    return 'ok'
  } catch (error) {
    logger.error('Failed to import minutes data', { error, heldExamUuids })
    return 'failed'
  }
}

function hasMinutes(minutes) {
  return Array.isArray(minutes) && minutes.length > 0
}

export async function decryptAndParseMinutes(keys, zipDir, zipContents) {
  if (!zipContents.includes(minutesFileName)) return
  const minutesBuffer = await decryptAES256ToBuffer(
    fs.createReadStream(path.join(zipDir, minutesFileName)),
    keys.key,
    keys.iv
  )
  return JSON.parse(minutesBuffer.toString())
}

const LOG_FILES = [
  { fileName: 'logs.tar.zst.bin', s3Suffix: '.log.tar.zst' },
  { fileName: 'logs.zip.bin', s3Suffix: '.log.zip' }
]

async function extractAndImportLogs(keys, zipDir, zipContents, examMetadata) {
  const heldExamUuids = examMetadata.exams.map(exam => exam.heldExamUuid)
  const logFile = LOG_FILES.find(({ fileName }) => zipContents.includes(fileName))
  if (!logFile) {
    logger.info(`Log file not found for heldExamUuids ${heldExamUuids.join(', ')}`)
    return
  }

  logger.info(`Found log file ${logFile.fileName}, using S3 suffix ${logFile.s3Suffix}`)

  const prefix = `abitti2-${new Date().toISOString().split('T')[0]}` // date in yyyy-mm-dd format
  const uuid = examMetadata.exams.length === 1 ? examMetadata.exams[0].examUuid : randomUUID()
  const prefixedLogIdentifier = `${prefix}-${uuid}`

  try {
    const metadataKey = awsUtils.createS3Logfilename(prefixedLogIdentifier, '.metadata.json')
    await awsUtils.uploadFileToLogsBucket(metadataKey, Readable.from([JSON.stringify(examMetadata)]))

    const logsKey = awsUtils.createS3Logfilename(prefixedLogIdentifier, logFile.s3Suffix)
    await pipeline(
      fs.createReadStream(path.join(zipDir, logFile.fileName)),
      cryptoUtils.createAES256DecryptStreamWithIv(keys.key, keys.iv),
      logStream => awsUtils.uploadFileToLogsBucket(logsKey, logStream, { metadataKey })
    )

    return logsKey
  } catch (error) {
    logger.warn(`Failed to upload logs to bucket S3`, { error, heldExamUuids, alarmThreshold: 2 })
  }
}

async function extractZipContents(zipPath) {
  const zipDir = await fsP.mkdtemp(path.join(os.tmpdir(), 'answers-meb-'))
  try {
    const zipContents = await extractZipFromDisk(zipPath, zipDir, entry => {
      if (entry.uncompressedSize > zipEntrySizeLimit) {
        throw new DataError(`Zip entry too large: ${entry.uncompressedSize} max allowed: ${zipEntrySizeLimit}`)
      }
      return true
    })
    assertNotExamMeb(zipContents)
    return { zipDir, zipContents }
  } catch (error) {
    try {
      await fsP.rm(zipDir, { force: true, recursive: true })
    } catch (error) {
      logger.error('Failed to clean up zip outdir', { error, zipDir })
    }
    if (error instanceof DataError) {
      throw error
    }
    throw new DataError('Could not extract zip file', 400, error)
  }
}

function decryptAnswers(keys, zipDir) {
  return decryptAES256ToBuffer(fs.createReadStream(path.join(zipDir, 'answerPapers.json.bin')), keys.key, keys.iv)
}

async function decryptScreenshots(keys, zipDir, zipContents) {
  const fileName = 'screenshots.zip.bin'
  if (zipContents.includes(fileName)) {
    const screenshots = await decryptAES256ToBuffer(fs.createReadStream(path.join(zipDir, fileName)), keys.key, keys.iv)
    return extractZip(screenshots, zipEntrySizeLimit)
  }
}

async function decryptAudios(keys, zipDir, zipContents) {
  const fileName = 'audios.zip.bin'
  if (zipContents.includes(fileName)) {
    const audios = await decryptAES256ToBuffer(fs.createReadStream(path.join(zipDir, fileName)), keys.key, keys.iv)
    return extractZip(audios, zipEntrySizeLimit)
  }
}

function decryptEnvironmentData(keys, zipDir, zipContents) {
  const fileName = 'environment.json.bin'
  if (zipContents.includes(fileName)) {
    return decryptAES256ToBuffer(fs.createReadStream(path.join(zipDir, fileName)), keys.key, keys.iv)
  }
  return Promise.resolve([])
}

async function importAnswersFromZip(keys, zipDir, zipContents) {
  const answers = await decryptAnswers(keys, zipDir)
  const screenshots = await decryptScreenshots(keys, zipDir, zipContents)
  const audios = await decryptAudios(keys, zipDir, zipContents)
  const environmentData = await decryptEnvironmentData(keys, zipDir, zipContents).catch(_.noop)

  const examsWithAnswerPapers = parseAnswers(answers)

  if (examsWithAnswerPapers === null) throw new DataError('Meb file had bad contents', 422) // 422: Unprocessable content
  if (examsWithAnswerPapers.length === 0) throw new DataError('Meb file contained no answer papers', 422)
  if (examsWithAnswerPapers.some(e => !isAbitti2KtpVersion(e.ktpVersion)))
    throw new DataError('Abitti 1 exams are disallowed', 451) // 451: Unavailable for legal reasons

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

  const heldExams = await gradingDb.importAnswers(examsWithAnswerPapers, screenshots, audios, environmentData)

  const [exams, deletedExams] = R.partition(e => !e.deletionDate)(
    allExams.filter(isNotPermanentlyDeleted).map(entry => entry.exam)
  )

  const examInfo = exam => ({
    examTitle: exam.title,
    examUuid: exam.examUuid,
    isDuplicate: examsWithExistingStudents.includes(exam.examUuid),
    answerCount: answerCounts.find(a => a.examUuid === exam.examUuid)?.answerCount ?? 0,
    isDeleted: undefined
  })

  const answerCountsByExam = exams.map(examInfo).concat([
    ...deletedExams.map(examInfo).map(exam => ({ ...exam, isDeleted: true })),
    ...allExams.filter(isPermanentlyDeleted).map(exam => ({
      examTitle: `Poistettu koe / Raderade provet`,
      examUuid: exam.examUuid,
      answerCount: answerCounts.find(a => a.examUuid === exam.examUuid)?.answerCount ?? 0,
      isDeleted: true
    }))
  ])

  const logsMetadata = {
    source: 'arpajs',
    exams: heldExams.map(exam => ({
      examTitle: exam.title,
      examUuid: exam.examUuid,
      heldExamUuid: exam.heldExamUuid,
      examAccountUsername: exam.userAccountUsername,
      ktpVersion: exam.ktpVersion,
      gradingSchoolId: null,
      uploadSchoolId: null
    })),
    students: heldExams.flatMap(exam =>
      exam.students.map(student => ({
        examUuid: exam.examUuid,
        heldExamUuid: exam.heldExamUuid,
        studentUuid: student.studentUuid,
        studentFirstNames: student.firstNames,
        studentLastName: student.lastName,
        externalComputerAllowed: student.externalComputerAllowed,
        studentSsn: null
      }))
    )
  }

  const heldExamUuids = heldExams.map(exam => exam.heldExamUuid)

  return { answerCountsByExam, logsMetadata, heldExamUuids }

  function parseAnswers(answerFileContents) {
    let data
    try {
      data = JSON.parse(answerFileContents)
    } catch {
      return null
    }

    // This schema's pretty ad-hoc; didn't have time/energy to figure out the actual schema
    const schema = z.array(
      z.looseObject({
        ktpVersion: z.string(),
        examUuid: z.uuid(),
        answerPapers: z.any()
      })
    )

    const result = schema.safeParse(data)
    return result.success ? result.data : null
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

async function decryptKeys(zipDir, zipContents) {
  const keysFile = 'keys.json.bin'
  if (!zipContents.includes(keysFile)) {
    throw new DataError('Keys missing from zip file')
  }
  const buffer = await fsP.readFile(path.join(zipDir, keysFile))
  return JSON.parse(cryptoUtils.decryptWithPrivateKeyFromBuffer(config().answersPrivateKey, buffer).toString())
}

async function decryptAES256ToBuffer(readable, key, iv) {
  try {
    return await pipeline(readable, cryptoUtils.createAES256DecryptStreamWithIv(key, iv), buffer)
  } catch {
    throw new DataError('Could not decrypt stream', 400)
  }
}

function assertNotExamMeb(zipContents) {
  if (zipContents.includes('nsa.zip.bin')) {
    throw new DataError('User uploaded an exam meb', 415)
  }
}
