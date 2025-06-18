import { Request } from 'express'
import * as examination from './examination'
import { generatePassphraseAsync } from './passphrase-generator'
import { validateAttachments } from './exam-validators/attachment'
import { capitalizeName, getSortingNameFromName } from './name-utils'
import { examCopyFileNameToS3Path } from './copy-of-exam-paper'
import { asyncFilter } from './async-utils'
import * as answerValidator from './answer-validator'
import * as autogradingValidator from './autograding/autograding-validator'
import * as examAutograding from './autograding/exam-autograding'
import * as examValidatorAbitti from './exam-validators/abitti'
import * as examValidatorYo from './exam-validators/yo'
import * as validation from './validation'
import * as loggerUtils from './logger-utils'
import * as zipUtils from './zip-utils'
import * as vetumaStrategy from './vetuma-passport-strategy'
import * as expressUtils from './express-utils'
import * as appExc from './app-error'
import * as migrations from './migration-runner'

function randomString(length: number) {
  const usedLength = length || 12
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < usedLength; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

function baseUrlFromRequestHeaders(req: Request) {
  if (req.headers['x-forwarded-host'] && req.headers['x-forwarded-proto']) {
    return `${req.headers['x-forwarded-proto'] as string}://${req.headers['x-forwarded-host'] as string}`
  } else {
    return `${req.protocol}://${req.headers.host}`
  }
}

// http://nodejs.org/api/process.html#process_process_hrtime
const hrTimeDiffAsMillis = (diff: number[]) => Math.round((diff[0] * 1e9 + diff[1]) / 1e6)

const intFromSubstring = (string: string, start: number, end: number) => parseInt(string.substring(start, end), 10)

function getCenturyFromSsn(ssn: string) {
  const centuryMarker = ssn.substring(6, 7).toUpperCase()
  switch (true) {
    case centuryMarker === '+':
      return 1800
    case ['-', 'X', 'Y', 'V', 'W', 'U'].includes(centuryMarker):
      return 1900
    case ['A', 'B', 'C', 'D', 'E', 'F'].includes(centuryMarker):
      return 2000
    default:
      throw new appExc.DataError(`Invalid century marker in SSN: ${ssn}`)
  }
}

const getBirthYearFromSsn = (ssn: string) => getCenturyFromSsn(ssn) + intFromSubstring(ssn, 4, 6)

function getBirthDateFromSsn(ssn: string) {
  if (!validation.isSsnValid(ssn)) {
    throw new appExc.DataError(`Invalid SSN: ${ssn}`)
  }

  const day = intFromSubstring(ssn, 0, 2)
  const month = intFromSubstring(ssn, 2, 4)
  const year = getBirthYearFromSsn(ssn)

  return `${day}.${month}.${year}`
}

// Prefer namespaced modules; ancient utils are on top level
export {
  randomString,
  baseUrlFromRequestHeaders,
  appExc as exc,
  expressUtils,
  vetumaStrategy,
  generatePassphraseAsync,
  zipUtils as zip,
  hrTimeDiffAsMillis,
  validation,
  getBirthYearFromSsn,
  getBirthDateFromSsn,
  loggerUtils,
  examValidatorYo,
  validateAttachments as examValidatorYoAttachments,
  examValidatorAbitti,
  getSortingNameFromName,
  capitalizeName,
  answerValidator,
  autogradingValidator,
  examAutograding as autograding,
  migrations,
  examination,
  examCopyFileNameToS3Path,
  asyncFilter
}

export * from './object-manipulation-utils'
export * from './fetch-wrappers'
