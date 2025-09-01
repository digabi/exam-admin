'use strict'

import _ from 'lodash'
import * as awsUtils from '../aws-utils'
import * as gradingDb from '../db/grading-data'
import BPromise from 'bluebird'
import * as examDb from '../db/exam-data'
import * as cryptoUtils from '@digabi/crypto-utils'
import config from '../config/configParser'
import R from 'ramda'
import { DataError } from '@digabi/express-utils'
import { extractZip } from '@digabi/zip-utils'

const zipEntrySizeLimit = 300 * 1024 * 1024

export async function extractAndDecryptZipContents(zipBuffer) {
  const zipContents = await extractZipAsync(zipBuffer)
  assertNotExamMeb(zipContents)
  try {
    const keys = await decryptKeys(zipContents)

    return { zipContents, keys }
  } catch (err) {
    throw new DataError('Could not decrypt zip file', 400, err)
  }
}

export function decryptAnswers(keys, zipContents) {
  return decryptUsing(keys, zipContents['answerPapers.json.bin'])
}

export function decryptScreenshots(keys, zipContents) {
  const buffer = zipContents['screenshots.zip.bin']
  if (buffer) {
    return decryptUsing(keys, buffer).then(extractZipAsync)
  }
}

export function decryptAudios(keys, zipContents) {
  const buffer = zipContents['audios.zip.bin']
  if (buffer) {
    return decryptUsing(keys, buffer).then(extractZipAsync)
  }
}

export function decryptEnvironmentData(keys, zipContents) {
  const buffer = zipContents['environment.json.bin']
  if (buffer) {
    return decryptUsing(keys, buffer)
  }
  return Promise.resolve([])
}

export function decryptLogs(keys, zipContents) {
  const logs = zipContents['everything.log.zip.bin'] || zipContents['logs.zip.bin']
  if (logs) {
    return decryptUsing(keys, logs)
  }
}

export async function importAnswersFromZip(answers, screenshots, audios, environmentData) {
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

  await gradingDb.importAnswers(examsWithAnswerPapers, screenshots, audios, environmentData)

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
    examUuids
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

function decryptKeys(zipContents) {
  const keyfile = zipContents['keys.json.bin']
  if (!keyfile) {
    throw new DataError('Keys missing from zip file')
  }
  return JSON.parse(cryptoUtils.decryptWithPrivateKeyFromBuffer(config.secrets.answersPrivateKey, keyfile).toString())
}

function decryptUsing(keys, thingToDecrypt) {
  return Promise.resolve(cryptoUtils.decryptAES256Async(thingToDecrypt, keys.key, keys.iv))
}

function extractZipAsync(zip) {
  return extractZip(zip, zipEntrySizeLimit)
}

export function importLogs(logBuffer, examUuids) {
  const logIdentifier = `exam_${_.first(examUuids)}`
  return logBuffer ? awsUtils.uploadLogToS3(logIdentifier, logBuffer) : undefined
}

function assertNotExamMeb(zipContents) {
  if (zipContents['nsa.zip.bin']) {
    throw new DataError('User uploaded an exam meb', 415)
  }
}
