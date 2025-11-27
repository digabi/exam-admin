import { developmentConfig } from './development'

import type { UnresolvedConfig, Config } from '../config-types'

export type AsyncAppEnv = 'development'

export const asyncEnvMap: Record<AsyncAppEnv, UnresolvedConfig> = {
  development: developmentConfig
}

export const syncEnvMap: Record<string, never> = {}
