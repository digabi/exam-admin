import path from 'node:path'
import { includeIgnoreFile } from '@eslint/compat'
import digabiConfig from '@digabi/eslint-config'

export default [
  ...digabiConfig(),
  includeIgnoreFile(path.resolve(import.meta.dirname, '.gitignore')),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: ['./src/tsconfig.json']
      }
    }
  }
]
