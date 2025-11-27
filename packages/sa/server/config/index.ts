import { logger } from '../logger'
import { Config, UnresolvedConfig } from './config-types'
import { envMap, type AppEnv } from './env/env-map'

let exportedConfig: Config

export async function loadConfig() {
  const appEnv = process.env.APP_ENV as AppEnv | undefined

  try {
    const unresolvedConfig = appEnv ? envMap[appEnv] : undefined
    if (!unresolvedConfig) {
      logger.error('APP_ENV missing or unsupported', { appEnv })
      process.exit(1)
    }

    exportedConfig = await resolveAsyncConfigurations(unresolvedConfig)

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
