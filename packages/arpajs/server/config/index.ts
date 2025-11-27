import { logger } from '../logger'
import { Config, UnresolvedConfig } from './config-types'
import { asyncEnvMap, type AsyncAppEnv, syncEnvMap, type SyncAppEnv } from './env/env-map'

let exportedConfig: Config

export async function loadConfig() {
  const appEnv = process.env.APP_ENV

  logger.info('Initializing configuration', { appEnv: process.env.APP_ENV })

  if (exportedConfig) {
    return { ...exportedConfig }
  }

  try {
    const asyncConfig = appEnv ? asyncEnvMap[appEnv as AsyncAppEnv] : undefined
    const syncConfig = appEnv ? syncEnvMap[appEnv as SyncAppEnv] : undefined

    if (syncConfig) {
      exportedConfig = syncConfig
      logger.info('Loaded synchronous configuration', { appEnv })
    } else if (asyncConfig) {
      exportedConfig = await resolveAsyncConfigurations(asyncConfig)
      logger.info('Loaded asynchronous configuration', { appEnv })
    } else {
      logger.error('APP_ENV missing or unsupported', { appEnv })
      process.exit(1)
    }

    return exportedConfig
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
      logger.error('Configuration file not found for environment', { appEnv })
    } else {
      logger.error('Failed to load configuration for environment', { appEnv, error })
    }

    return process.exit(1)
  }
}

async function resolveAsyncConfigurations(unresolvedConfig: UnresolvedConfig) {
  const resolved = {} as Record<string, unknown>

  for (const [key, value] of Object.entries(unresolvedConfig)) {
    if (typeof value === 'function') {
      resolved[key] = await value()
    } else {
      resolved[key] = value
    }
  }

  return resolved as Config
}

export const config = () => {
  if (!exportedConfig) {
    throw new Error('Config not initialized. Did you forget to call initialize method?')
  }

  return { ...exportedConfig }
}

export const loadTestConfig = () => {
  const appEnv = process.env.APP_ENV as SyncAppEnv | undefined
  if (appEnv && syncEnvMap[appEnv]) {
    exportedConfig = syncEnvMap[appEnv]
  } else {
    logger.error('APP_ENV is missing or is not synchronous one', { appEnv })
    process.exit(1)
  }
}
