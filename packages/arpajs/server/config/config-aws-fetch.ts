import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'
import { logger } from '../logger'

async function fetchAwsSecret(awsSecretId: string): Promise<string> {
  const client = new SecretsManagerClient({ region: 'eu-north-1' })
  const command = new GetSecretValueCommand({ SecretId: awsSecretId })

  try {
    const response = await client.send(command)
    if (!response.SecretString) {
      const errorMessage = 'Secret fetch returned empty string. Please check AWS secret value'
      logger.error(errorMessage, { awsSecretId })
      throw new Error(errorMessage)
    }
    return response.SecretString || ''
  } catch (error) {
    logger.error('Error fetching AWS secret', { error, awsSecretId })
    throw error
  }
}

async function fetchSsmParameter(parameterName: string, secureString = true): Promise<string> {
  const client = new SSMClient({ region: 'eu-north-1' })
  const command = new GetParameterCommand({
    Name: parameterName,
    WithDecryption: secureString
  })

  try {
    const response = await client.send(command)
    const value = response.Parameter?.Value
    if (!value) {
      const errorMessage = 'SSM parameter fetch returned empty. Please check AWS ssm value'

      logger.error(errorMessage, { parameterName })
      throw new Error(errorMessage)
    }
    return value
  } catch (error) {
    logger.error('Error fetching SSM parameter', { error, parameterName })
    throw error
  }
}

export function getAwsSecret(awsSecretId: string): () => Promise<string> {
  return () => fetchAwsSecret(awsSecretId)
}

export function getSsmParameter(parameterName: string, secureString = true): () => Promise<string> {
  return () => fetchSsmParameter(parameterName, secureString)
}

export function mockAwsFetch(value: string): () => Promise<string> {
  return () => Promise.resolve(value)
}
