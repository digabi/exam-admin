import { developmentConfig } from './development'

import type { UnresolvedConfig } from '../config-types'

export type AsyncAppEnv = 'development'
export type SyncAppEnv = 'development'

export const asyncEnvMap: Record<AsyncAppEnv, UnresolvedConfig> = {
  development: developmentConfig
}

export const syncEnvMap: Record<string, never> = {}
