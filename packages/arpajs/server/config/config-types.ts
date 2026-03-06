import type { NodeHttpHandler } from '@aws-sdk/node-http-handler'

type S3Config = {
  region: string
  endpoint?: string
  forcePathStyle?: boolean
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
  requestHandler?: NodeHttpHandler
}

type AnswerLinkMailResult = {
  from: string
  to: string
  subject: string
  text: string
}

type CommonConfiguration = {
  arpaDbUrl: () => Promise<string>
  interface: string
  port: string | number
  s3ExamLogsBucket: string
  s3AttachmentsBucket: string
  s3NsaScriptsBucket: string
  s3NsaFindingsBucket: string
  prePackagedNsaScriptZipPath: string
  useKtpUpdate: boolean
  prePackagedKtpUpdatePath: string
  useKoeUpdate: boolean
  prePackagedKoeUpdatePath: string
  attachmentsLimitInBytes: number
  passphraseWordList: string[]
  emailTemplates: {
    answerLinkMail: (to: string, emailTitle: string, firstNames: string, urlWithtoken: string) => AnswerLinkMailResult
  }
  matriculationExamsBucket: string
  s3Config: S3Config
  s3ConfigForAttachments: S3Config
  s3ConfigForLogs: S3Config
  s3ConfigForFindings: S3Config
  multiChoiceShuffleSecret: () => Promise<string>
  answersPrivateKey: () => Promise<string>
  answersPublicKey: () => Promise<string>
  urlTokenKey: () => Promise<string>
  urlTokenIv: () => Promise<string>
}

type CloudConfiguration = CommonConfiguration & {
  runningInCloud: true
  emailQueue: string
  runningUnitTests: false
  publicExamsRoleArn: string
  testRestRouter: undefined
}

type DevelopmentConfiguration = CommonConfiguration & {
  runningInCloud: false
  emailQueue: undefined
  runningUnitTests: boolean
  publicExamsRoleArn: undefined
  testRestRouter?: string
}

export type UnresolvedConfig = CloudConfiguration | DevelopmentConfiguration

export type ResolvedConfig = {
  [K in keyof UnresolvedConfig]: UnresolvedConfig[K] extends () => Promise<infer T>
    ? T
    : UnresolvedConfig[K] extends (() => Promise<string>) | string
      ? string
      : UnresolvedConfig[K] extends (() => Promise<string>) | undefined
        ? string | undefined
        : UnresolvedConfig[K]
}

export type Config = ResolvedConfig
