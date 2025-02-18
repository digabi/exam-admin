import { z } from 'zod'
import config from './config'
import { logger } from '../logger'
import { NodeHttpHandler } from '@aws-sdk/node-http-handler'

const s3ConfigSchema = z.object({
  region: z.string(),
  endpoint: z.string().optional(),
  forcePathStyle: z.boolean().optional(),
  credentials: z
    .object({
      accessKeyId: z.string(),
      secretAccessKey: z.string()
    })
    .optional(),
  requestHandler: z.instanceof(NodeHttpHandler)
})

const commonSchema = z
  .object({
    arpaDbUrl: z.string(),
    interface: z.string(),
    port: z.union([z.string(), z.number()]),
    s3ExamLogsBucket: z.string(),
    s3AttachmentsBucket: z.string(),
    prePackagedNsaScriptZipPath: z.string(),
    useKtpUpdate: z.boolean(),
    prePackagedKtpUpdatePath: z.string(),
    useKoeUpdate: z.boolean(),
    prePackagedKoeUpdatePath: z.string(),
    attachmentsLimitInBytes: z.number(),
    passphraseWordList: z.array(z.string()),
    answerLinkMail: z
      .function()
      .args(z.string(), z.string(), z.string(), z.string())
      .returns(
        z.object({
          from: z.string(),
          to: z.string(),
          subject: z.string(),
          text: z.string()
        })
      ),
    matriculationExamsBucket: z.string(),
    s3ConfigForAttachments: s3ConfigSchema,
    s3ConfigForLogs: s3ConfigSchema
  })
  .strict()

const secretsSchema = z
  .object({
    multiChoiceShuffleSecret: z.string(),
    answersPrivateKey: z.union([z.string(), z.instanceof(Buffer)]),
    answersPublicKey: z.union([z.string(), z.instanceof(Buffer)]),
    urlTokenKey: z.string(),
    urlTokenIv: z.string(),
    s3Credentials: z
      .object({
        logUploader: z.object({
          accessKeyId: z.string(),
          secretAccessKey: z.string()
        }),
        attachmentUpAndDownloader: z.object({
          accessKeyId: z.string(),
          secretAccessKey: z.string()
        })
      })
      .optional()
  })
  .strict()

const CloudConfigurationSchema = commonSchema
  .extend({
    runningInCloud: z.literal(true),
    emailQueue: z.string(),
    publicExamsRoleArn: z.string(),
    runningUnitTests: z.literal(false),
    secrets: secretsSchema.extend({ s3Credentials: z.undefined() })
  })
  .strict()

const DevelopmentConfigurationSchema = commonSchema
  .extend({
    runningInCloud: z.literal(false),
    runningUnitTests: z.boolean(),
    secrets: secretsSchema,
    emailQueue: z.undefined(),
    publicExamsRoleArn: z.undefined(),
    testRestRouter: z.string().optional()
  })
  .strict()

const ConfigurationSchema = z.discriminatedUnion('runningInCloud', [
  CloudConfigurationSchema,
  DevelopmentConfigurationSchema
])

const parseResult = ConfigurationSchema.safeParse(config)

if (!parseResult.success) {
  logger.error('Launching application failed due to missing or invalid configuration. Closing application.', {
    zodError: parseResult.error
  })
  process.exit(1)
} else {
  logger.info('Configuration parsed successfully')
}

const parsedConfiguration = parseResult.data

export default parsedConfiguration
