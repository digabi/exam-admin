'use strict'

import crypto from 'crypto'
import * as cryptoUtils from '@digabi/crypto-utils'
import fs from 'fs'
import path from 'path'
import config from '../config/configParser'
import { zip as zipUtils } from '@digabi/js-utils'
import _ from 'lodash'
import * as utils from '@digabi/js-utils'
import BPromise from 'bluebird'
const { using } = BPromise
import * as examDb from './exam-data'
import { pgrm } from './local-pg-resource-management'
import R from 'ramda'
import * as L from 'partial.lenses'
import { testDataGenerator } from '@digabi/js-test-utils'
const { createXmlExamContent } = testDataGenerator
import { parseExam } from '@digabi/exam-engine-mastering'
import { v4 as createRandomUUID } from 'uuid'

export function createUser(userName = `User ${createRandomUUID()}`, password) {
  return pgrm
    .queryRowsAsync(
      `
      insert into user_account (
        user_account_username,
        user_account_passwd
      )
      values ($1, crypt($2, gen_salt('bf', 8)))
      returning user_account_id
      `,
      [userName, password]
    )
    .then(res => res[0].user_account_id)
}

// TODO: this file is ported from test-data-generator.js. Implement also rest of that file's
// functionalities for XML exams here.
export function createXmlExamForUser(userId, overridesOrExam) {
  return using(pgrm.getConnection(), connection =>
    createXmlExamForUserAndPutIntoDb(userId, overridesOrExam, R.partial(insertXmlExamForUserIntoDb, [connection]))
  )
}

async function createXmlExamForUserAndPutIntoDb(userId, overridesOrExam, dbFunc) {
  const defaults = {
    locked: true,
    examUuid: createRandomUUID(),
    accessible: false,
    attachmentsFilename: null,
    title: 'Generoitu koe'
  }
  const examFields = _.assign(defaults, overridesOrExam)
  const exam = L.isDefined('xmlContent', overridesOrExam)
    ? { examXml: overridesOrExam.xmlContent, gradingStructure: overridesOrExam.gradingStructure }
    : await createXmlExamContent(examFields.examUuid, examFields, { groupChoiceAnswers: true })
  const contentValid = isValidXmlContent(exam.examXml)

  return dbFunc(
    userId,
    examFields.examUuid,
    exam.examXml,
    exam.gradingStructure,
    examFields.title,
    examFields.password,
    examFields.locked,
    examFields.accessible,
    examFields.attachmentsFilename,
    contentValid
  )
}

function isValidXmlContent(xmlContent) {
  try {
    parseExam(xmlContent, true)
    return true
  } catch (err) {
    return false
  }
}

async function insertXmlExamForUserIntoDb(
  connection,
  userId,
  examUuid,
  xmlExamContent,
  gradingStructure,
  title,
  password,
  locked,
  accessible,
  attachmentsFilename,
  contentValid
) {
  const passphrase = password || (await utils.generatePassphraseAsync(config.passphraseWordList))

  await connection.queryAsync(
    ` INSERT INTO exam (
          exam_uuid,
          content_xml,
          grading_structure,
          title,
          locked,
          password,
          accessible,
          attachments_filename,
          content_valid,
          user_account_id,
          creation_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
    [
      examUuid,
      xmlExamContent,
      gradingStructure,
      title,
      locked,
      passphrase,
      accessible,
      attachmentsFilename,
      contentValid,
      userId
    ]
  )
  return await examDb.getExamWithConnection(connection, examUuid)
}

export function createAnswersZipWithoutAnswerPapers() {
  return createAnswerMebWithDummyLog({ answersJson: { answerPapers: [] } })
}

export function createAnswersZip({
  examUuid,
  maybeTextAnswersQuestions,
  maybeRichTextAnswersQuestions,
  maybeMultiChoiceAnswerQuestions,
  maybeMultiChoiceGapAnswerQuestions,
  environmentData
}) {
  return createMultiExamAnswersZip({
    examUuids: [examUuid],
    maybeTextAnswersQuestions,
    maybeRichTextAnswersQuestions,
    maybeMultiChoiceAnswerQuestions,
    maybeMultiChoiceGapAnswerQuestions,
    environmentData
  })
}

export function createMultiExamAnswersZip({
  examUuids,
  maybeTextAnswersQuestions,
  maybeRichTextAnswersQuestions,
  maybeMultiChoiceAnswerQuestions,
  maybeMultiChoiceGapAnswerQuestions,
  environmentData
}) {
  const textAnswersQuestions = maybeTextAnswersQuestions || [1]
  const richTextAnswersQuestions = maybeRichTextAnswersQuestions || []
  const multiChoiceAnswerQuestions = maybeMultiChoiceAnswerQuestions || []
  const multiChoiceGapAnswerQuestions = maybeMultiChoiceGapAnswerQuestions || []

  const textAnswers = generateTextAnswers(textAnswersQuestions)
  const richTextAnswers = generateRichTextAnswers(richTextAnswersQuestions)

  const multiChoiceAnswers = mapMultiChoiceAnswerListToAnswers(multiChoiceAnswerQuestions)
  const multiChoiceGapAnswers = mapMultiChoiceAnswerListToAnswers(multiChoiceGapAnswerQuestions)

  const answersJson = examUuids.map(examUuid => ({
    examUuid: examUuid,
    answerPapers: [
      {
        examStarted: new Date().toISOString(),
        student: { firstNames: 'Erkki', lastName: 'Esimerkki', uuid: createRandomUUID() },
        answers: _.union(textAnswers, richTextAnswers, multiChoiceAnswers, multiChoiceGapAnswers)
      }
    ]
  }))

  return createAnswerMebWithDummyLog({ answersJson, environmentData })

  function mapMultiChoiceAnswerListToAnswers(list) {
    return list.map(c => ({
      questionId: c.questionId,
      content: { type: 'choice', value: `${c.choice}` }
    }))
  }
}

export function createAnswerZipWith2Students(examUuid) {
  return createAnswerMebWithDummyLog({ answersJson: create2StudentsWithSameNameDiffernetSSNAnswersJson(examUuid) })
}

export function createAnswerZipWithScreenshotListButMissingScreenshotFiles(examUuid) {
  const answersJson = create2StudentsWithSameNameDiffernetSSNAnswersJson(examUuid)
  answersJson[0].answerPapers[1].answers[0].content.screenshots = [createRandomUUID(), createRandomUUID()]
  return createAnswerMebWithDummyLog({ answersJson })
}

function create2StudentsWithSameNameDiffernetSSNAnswersJson(examUuid) {
  return [
    {
      examUuid: examUuid,
      answerPapers: [
        {
          examStarted: new Date().toISOString(),
          student: { firstNames: 'Erkki', lastName: 'Esimerkki', uuid: createRandomUUID() },
          answers: generateTextAnswers([1])
        },
        {
          examStarted: new Date().toISOString(),
          student: { firstNames: 'Erkki', lastName: 'Esimerkki', uuid: createRandomUUID() },
          answers: generateTextAnswers([1])
        }
      ]
    }
  ]
}

export function createAnswersWithExternalComputerAllowed(examUuid) {
  return [
    {
      examUuid,
      answerPapers: [
        {
          examStarted: new Date().toISOString(),
          student: { firstNames: 'Erkki', lastName: 'Esimerkki', uuid: createRandomUUID() },
          answers: [
            {
              questionId: 1,
              content: {
                type: 'richText',
                value: 'vastaus'
              }
            }
          ]
        },
        {
          examStarted: new Date().toISOString(),
          student: { firstNames: 'Erkki2', lastName: 'Esimerkki2', uuid: createRandomUUID() },
          answers: [
            {
              questionId: 1,
              content: {
                type: 'richText',
                value: 'vastaus2'
              }
            }
          ],
          allowExternalComputer: true
        }
      ]
    }
  ]
}

export function createAnswersWith2StudentsAndScreenshots(examUuid) {
  const screenshotUuids = [createRandomUUID(), createRandomUUID()]
  const answers = screenshotUuid =>
    generateAnswers(
      questionId => ({
        type: 'richText',
        value: `<div>Vastaus ${questionId + 1} <img src="/screenshot/${screenshotUuid}" /></div>`,
        screenshots: [screenshotUuid]
      }),
      [1]
    )

  return {
    answers: [
      {
        examUuid,
        answerPapers: [
          {
            examStarted: new Date().toISOString(),
            student: { firstNames: 'Erkki', lastName: 'Esimerkki', uuid: createRandomUUID() },
            answers: answers(screenshotUuids[0])
          },
          {
            examStarted: new Date().toISOString(),
            student: { firstNames: 'Erkki', lastName: 'Esimerkki', uuid: createRandomUUID() },
            answers: answers(screenshotUuids[1])
          }
        ]
      }
    ],
    screenshotUuids
  }
}

export function createAnswerZipWithOneStudentInTwoExams(examUuid1, examUuid2) {
  return createAnswerMebWithDummyLog({ answersJson: createOneStudentInTwoExamsAnswersJson(examUuid1, examUuid2) })
}

function createOneStudentInTwoExamsAnswersJson(examUuid1, examUuid2) {
  const studentUuid = createRandomUUID()
  return [
    {
      examUuid: examUuid1,
      answerPapers: [
        {
          examStarted: new Date().toISOString(),
          student: { firstNames: 'Erkki', lastName: 'Esimerkki', uuid: studentUuid },
          answers: generateTextAnswers([1])
        }
      ]
    },
    {
      examUuid: examUuid2,
      answerPapers: [
        {
          examStarted: new Date().toISOString(),
          student: { firstNames: 'Erkki', lastName: 'Esimerkki', uuid: studentUuid },
          answers: generateTextAnswers([1])
        }
      ]
    }
  ]
}

export function createAnswerZipWith2Exams({ examUuid1, examUuid2, environmentData }) {
  const answersJson = createMultiExamsAnswersJson([examUuid1, examUuid2], [1, 2])
  return createAnswerMebWithDummyLog({ answersJson, environmentData })
}

function createMultiExamsAnswersJson(examUuids, studentCountsPerExam) {
  return _.map(examUuids, (examUuid, i) => ({
    examUuid: examUuid,
    answerPapers: _.times(studentCountsPerExam[i], () => ({
      examStarted: new Date().toISOString(),
      student: {
        firstNames: 'Erkki',
        lastName: 'Esimerkki',
        uuid: createRandomUUID()
      },
      answers: generateTextAnswers([1])
    }))
  }))
}

export function createAnswersZipWithRichTextAnswerContent(examUuid, answerContent) {
  return createAnswerMebWithDummyLog({
    answersJson: [
      {
        examUuid: examUuid,
        answerPapers: [
          {
            examStarted: new Date().toISOString(),
            student: {
              firstNames: 'Erkki',
              lastName: 'Esimerkki',
              uuid: createRandomUUID()
            },
            answers: [
              {
                questionId: 1,
                content: { type: 'richText', value: answerContent }
              }
            ]
          }
        ]
      }
    ]
  })
}

export function createLegacyAnswersZip(examUuid) {
  const answersJson = createLegacyAnswersJson(examUuid)
  return createAnswerMebWithDummyLog({ answersJson })
}

function createLegacyAnswersJson(examUuid) {
  return {
    answerPapers: [
      {
        examUuid: examUuid,
        examStarted: new Date().toISOString(),
        student: { firstNames: 'Erkki', lastName: 'Esimerkki', uuid: createRandomUUID() },
        answers: generateTextAnswers([1])
      }
    ]
  }
}

function generateAnswers(generator, ids) {
  return ids.map((questionId, i) => ({
    questionId,
    content: generator(questionId, i)
  }))
}

function textAnswerGenerator(questionId) {
  return {
    type: 'text',
    value: `Vastaus + ${questionId + 1}`
  }
}

function richTextAnswerGenerator(questionId) {
  return {
    type: 'richText',
    value: `<div>Vastaus + ${questionId}</div>`
  }
}

function generateTextAnswers(ids) {
  return generateAnswers(textAnswerGenerator, ids)
}

function generateRichTextAnswers(ids) {
  return generateAnswers(richTextAnswerGenerator, ids)
}

export async function createAnswerMebWithDummyLog({ answersJson, screenshotUuids, environmentData }) {
  const logFileContents = 'Log line 1\nLog line 2\nLog line 3'
  const zippedLogFile = await zipUtils.createZip([
    { name: 'everything.log', content: Buffer.from(logFileContents, 'utf-8') }
  ])
  const keys = cryptoUtils.generateKeyAndIv()

  const screenshotBuffer = await BPromise.fromNode(cb =>
    fs.readFile(path.resolve(__dirname, '../../test/resources/attachment_test_pic.png'), undefined, cb)
  )
  const screenshotsZip = await zipUtils.createZip(
    (screenshotUuids || []).map(uuid => ({ name: `${uuid}.png`, content: screenshotBuffer }))
  )

  const answersEncrypted = await cryptoUtils.encryptAES256Async(JSON.stringify(answersJson), keys.key, keys.iv)
  const logsEncrypted = await cryptoUtils.encryptAES256Async(zippedLogFile, keys.key, keys.iv)
  const screenshotsEncrypted = await cryptoUtils.encryptAES256Async(screenshotsZip, keys.key, keys.iv)
  const environmentEncrypted = await cryptoUtils.encryptAES256Async(environmentData, keys.key, keys.iv)

  const encodedKeys = { key: keys.key.toString('base64'), iv: keys.iv.toString('base64') }
  const keysEncrypted = cryptoUtils.encryptWithPublicKeyBuffer(
    config.secrets.answersPublicKey,
    JSON.stringify(encodedKeys)
  )

  return zipUtils.createZip([
    {
      name: 'answerPapers.json.bin',
      content: answersEncrypted
    },
    { name: 'everything.log.zip.bin', content: logsEncrypted },
    { name: 'keys.json.bin', content: keysEncrypted },
    { name: 'screenshots.zip.bin', content: screenshotsEncrypted },
    { name: 'environment.json.bin', content: environmentEncrypted }
  ])
}

export function generateTestBuffer(size) {
  // Fill with pseudorandom data
  const result = Buffer.alloc(size)
  const randomBuf = crypto.randomBytes(3117)
  // Loop to generate huge buffers more quickly
  for (let i = 0; i < size; i += 3117) {
    // non power of 2 to catch crazy block duplication etc bugs ;)
    randomBuf.copy(result, i)
  }
  return result
}
