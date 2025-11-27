import { developmentConfig } from './development'
import type { UnresolvedConfig } from '../config-types'

export type AppEnv = 'development'

export const envMap: Record<AppEnv, UnresolvedConfig> = {
  development: developmentConfig
}
