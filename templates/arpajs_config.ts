import { NodeHttpHandler } from '@aws-sdk/node-http-handler'
import { Agent } from 'https'
import * as fs from 'node:fs'

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

const configuration = {
  arpaDbUrl: 'postgres://db:5432/arpa',
  interface: '0.0.0.0',
  port: 8030,
  runningInCloud: false,
  runningUnitTests: false,
  s3ExamLogsBucket: 'logs',
  s3AttachmentsBucket: 'attachments',
  useKtpUpdate: false,
  useKoeUpdate: false,
  prePackagedNsaScriptZipPath: `${__dirname}/../nsa-scripts.zip`,
  prePackagedKoeUpdatePath: '/dev/null',
  prePackagedKtpUpdatePath: '/dev/null',
  publicExamsRoleArn: undefined,
  attachmentsLimitInBytes: 100 * 1024 * 1024,
  passphraseWordList: ['purku', 'koodeja', 'tänne', 'lisää'],
  answerLinkMail,
  matriculationExamsBucket: 'abitti-exam-attachments-test',
  s3ConfigForAttachments: s3Config,
  s3ConfigForLogs: s3Config,
  secrets: {
    multiChoiceShuffleSecret: 'secret',
    s3Credentials: {
      logUploader: { accessKeyId: 'INVALID', secretAccessKey: 'INVALID' },
      attachmentUpAndDownloader: {
        accessKeyId: 'INVALID',
        secretAccessKey: 'INVALID'
      },
      examDownloader: {
        test: { accessKeyId: 'INVALID', secretAccessKey: 'INVALID' }
      }
    },
    urlTokenKey: '0000000000000000000000000000000000000000000000000000000000000000',
    urlTokenIv: '00000000000000000000000000000000',
    answersPrivateKey: fs.readFileSync(require.resolve('@digabi/exam-engine-exams/exam_key.pem')),
    answersPublicKey: fs.readFileSync(require.resolve('@digabi/exam-engine-exams/exam_cert.pem'))
  }
}

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

export default configuration
