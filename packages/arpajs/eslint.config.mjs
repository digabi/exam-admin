import { includeIgnoreFile } from '@eslint/compat'
import digabiConfig from '@digabi/eslint-config'
import { fileURLToPath } from 'node:url'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default [includeIgnoreFile(gitignorePath), ...digabiConfig()]
