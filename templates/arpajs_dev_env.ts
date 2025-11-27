import { UnresolvedConfig } from '../config-types'
import { mockAwsFetch } from '../config-aws-fetch'
import { NodeHttpHandler } from '@aws-sdk/node-http-handler'
import { Agent } from 'https'
import fs from 'fs/promises'

function answerLinkMail(to: string, examTitle: string, firstNames: string, urlWithtoken: string) {
  return {
    from: `Example <example@example.com>`,
    to,
    subject: `Kokeen ${examTitle} palautus - Återlämning av provet ${examTitle}`,
    text:
      `Hei ${firstNames},\n\n` +
      `opettajasi on arvioinut tekemäsi kokeen ${examTitle}. Pääset katsomaan opettajan arviota suorituksesta alla olevan linkin kautta.\n` +
      `\nLinkki on henkilökohtainen ja mikäli et halua muiden näkevän suoritustasi, pidä linkki salassa.\n\n\n` +
      `Hej ${firstNames},\n\n` +
      `din lärare har bedömt provet ${examTitle} som du utfört. Du kan se lärarens bedömning av prestationen via nedanstående länk.\n` +
      `\nLänken är personlig och om du inte vill att andra ska se din prestation, håll den hemlig.\n\n\n${urlWithtoken}\n`
  }
}

export const emailTemplates = {
  answerLinkMail
}

const s3Config = {
  region: 'eu-north-1',
  credentials: {
    accessKeyId: 'minio',
    secretAccessKey: 'miniosecret'
  },
  endpoint: 'http://minio:9000',
  forcePathStyle: true,
  requestHandler: new NodeHttpHandler({
    httpsAgent: new Agent({
      maxSockets: 500,
      keepAlive: true,
      keepAliveMsecs: 1000,
      timeout: 600000
    }),
    requestTimeout: 600000
  })
}

export const developmentConfig: UnresolvedConfig = {
  arpaDbUrl: mockAwsFetch('postgres://db:5432/arpa'),
  interface: '0.0.0.0',
  port: 8030,
  runningInCloud: false,
  emailQueue: undefined,
  publicExamsRoleArn: undefined,
  s3ExamLogsBucket: 'logs',
  s3AttachmentsBucket: 'attachments',
  s3NsaScriptsBucket: 'nsa-scripts',
  s3NsaFindingsBucket: 'nsa-findings',
  prePackagedNsaScriptZipPath: `${__dirname}/../../nsa-scripts.zip`,
  useKtpUpdate: false,
  prePackagedKtpUpdatePath: `${__dirname}/../../../dist/ktp-update.zip`,
  useKoeUpdate: false,
  prePackagedKoeUpdatePath: `${__dirname}/../../../dist/koe-update.zip`,
  attachmentsLimitInBytes: 100 * 1024 * 1024,
  runningUnitTests: false,
  passphraseWordList: ['purku', 'koodeja', 'tänne', 'lisää'],
  emailTemplates,
  matriculationExamsBucket: 'public-exams',
  testRestRouter: undefined,
  s3Config: s3Config,
  s3ConfigForAttachments: s3Config,
  s3ConfigForLogs: s3Config,
  s3ConfigForFindings: s3Config,
  answersPrivateKey: () =>
    fs.readFile(require.resolve('@digabi/exam-engine-exams/exam_key.pem'), { encoding: 'utf-8' }),
  answersPublicKey: () =>
    fs.readFile(require.resolve('@digabi/exam-engine-exams/exam_cert.pem'), { encoding: 'utf-8' }),
  urlTokenKey: mockAwsFetch('0000000000000000000000000000000000000000000000000000000000000000'),
  urlTokenIv: mockAwsFetch('00000000000000000000000000000000'),
  multiChoiceShuffleSecret: mockAwsFetch('mock-multi-choice-shuffle-secret')
}
