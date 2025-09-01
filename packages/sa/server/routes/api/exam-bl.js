'use strict'

import config from '../../config/configParser'
import { getJsonAsync } from '@digabi/fetch'
import * as examHandling from '../../db/exam-handling'

export function getHeldExams(userId) {
  return getJsonAsync(`${config.examUri}/grading/status/${userId}`)
}

export function markExamAsDeleted(userId, examUuid) {
  return examHandling.markExamDeletedInSa(userId, examUuid)
}

export function markExamAsUndeleted(userId, examUuid) {
  return examHandling.markExamUndeletedInSa(userId, examUuid)
}

function getSchoolFromArpaAndCheckAccessRights(url, userAccountId) {
  return getJsonAsync(url).then(result => {
    const examUuid = result.examUuid
    return examHandling.userCanAccessExam(userAccountId, examUuid)
  })
}

export function checkUserHasAccessToAnswer(userAccountId, answerId) {
  const url = `${config.examUri}/grading/answerId/${answerId}/examUuid`
  return getSchoolFromArpaAndCheckAccessRights(url, userAccountId)
}

export function checkUserHasAccessToAnswerPaper(userAccountId, answerPaperId) {
  const url = `${config.examUri}/grading/answerPaperId/${answerPaperId}/examUuid`
  return getSchoolFromArpaAndCheckAccessRights(url, userAccountId)
}
