import { logger } from '../../logger'
import { getExam, getMexOptOutForExam } from '../../db/exam-data'

export async function isConvertibleToMex(examUuid) {
  const ownerOptedOut = await getMexOptOutForExam(examUuid)
  if (ownerOptedOut) {
    logger.debug(`Owner of exam ${examUuid} has opted out from mex conversion`)
    return false
  }
  const { content } = await getExam(examUuid, { includeDeleted: false })
  const illegalStrings = [';base64,', '<script', 'rel=\\"stylesheet\\"', '`']
  return isContentValid(content, illegalStrings, examUuid)
}

function isContentValid(content, illegalStrings, examUuid) {
  const illegalContent = illegalStrings.find(illegalString => {
    const found = JSON.stringify(content).indexOf(illegalString) !== -1
    if (found) {
      logger.debug(`Exam ${examUuid} cannot be converted to mex because it includes ${illegalString}`)
    }
    return found
  })
  return !illegalContent
}
