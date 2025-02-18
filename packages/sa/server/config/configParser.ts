import { z } from 'zod'
import config from './config'
import { logger } from '../logger'

const commonSchema = z
  .object({
    nodeEnv: z.string(),
    interface: z.string(),
    port: z.union([z.string(), z.number()]),
    stackTracesOnErrorResponses: z.boolean(),
    arpajsDbUrl: z.string(),
    examUri: z.string(),
    httpProxy: z.string().optional(),
    oauth: z.object({
      enabled: z.boolean(),
      accessTokenExpirySeconds: z.number(),
      authorizationCodeExpirySeconds: z.number(),
      refreshTokenExpirySeconds: z.number()
    }),
    sessionTimeout: z.number(),
    superUserUsername: z.string(),
    rootPage: z.string(),
    termsOfServicePage: z.object({
      fi: z.string(),
      sv: z.string()
    }),
    secrets: z.object({
      sessionSecret: z.string()
    }),
    registrationMail: z
      .function()
      .args(z.string(), z.string())
      .returns(
        z.object({
          from: z.string(),
          to: z.string(),
          subject: z.string(),
          text: z.string()
        })
      ),

    updateEmail: z
      .function()
      .args(z.string(), z.string())
      .returns(
        z.object({
          from: z.string(),
          to: z.string(),
          subject: z.string(),
          text: z.string()
        })
      )
  })
  .strict()

const CloudConfigurationSchema = commonSchema
  .extend({
    runningInCloud: z.literal(true),
    emailQueue: z.string(),
    trustProxy: z.number()
  })
  .strict()

const DevelopmentConfigurationSchema = commonSchema
  .extend({
    runningInCloud: z.literal(false),
    emailQueue: z.undefined(),
    trustProxy: z.undefined()
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
