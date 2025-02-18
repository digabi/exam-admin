import _ from 'lodash'
import * as utils from '../common/client-utils-commonjs'
import { ArpaExamGradingStatus, ExamGradingStatus, ArpaExamPregradingStatus, ExamPregradingStatus } from './types'

export function formatPregradingStatus(pregradingStatuses: ArpaExamPregradingStatus[]) {
  return pregradingStatuses.map(addExtraFields)

  function addExtraFields(pregradingStatus: ArpaExamPregradingStatus): ExamPregradingStatus {
    const teacherGradingProgress = gradingPercentage(
      pregradingStatus.answers,
      pregradingStatus.autogradedScores,
      pregradingStatus.pregradingScores
    )
    const teacherGradingFinishedProgress = gradingPercentage(
      pregradingStatus.answers,
      pregradingStatus.autogradedScores,
      pregradingStatus.pregradingFinishedCount
    )
    const eventDateStr = utils.finnishDateString(new Date(pregradingStatus.eventDate))
    return {
      ...pregradingStatus,
      teacherGradingProgress,
      teacherGradingCompleted: teacherGradingProgress === 100,
      eventDateStr,
      teacherGradingFinishedProgress
    }
  }

  function gradingPercentage(answerCount: number, autogradedScoresCount: number, manualScoresCount: number) {
    if (answerCount === 0 || answerCount === autogradedScoresCount) {
      return 100
    } else {
      const percentage = Math.floor((manualScoresCount / (answerCount - autogradedScoresCount)) * 100)
      return percentage === 0 && manualScoresCount > 0 ? 1 : percentage
    }
  }
}

export function formatGradingStatus(gradingStatuses: ArpaExamGradingStatus[]) {
  return _.orderBy(
    gradingStatuses,
    ['eventDate', 'title', 'schoolAnonCode'],
    ['desc', 'asc', 'asc']
  ).map<ExamGradingStatus>(addExtraFields)

  function addExtraFields(gradingStatus: ArpaExamGradingStatus): ExamGradingStatus {
    const teacherGradingProgress = gradingPercentage(
      gradingStatus.answers,
      gradingStatus.autogradedScores,
      gradingStatus.pregradingScores
    )
    const teacherGradingFinishedProgress = gradingPercentage(
      gradingStatus.answers,
      gradingStatus.autogradedScores,
      gradingStatus.pregradingFinishedCount
    )
    const eventDateStr = utils.finnishDateString(new Date(gradingStatus.eventDate))
    return {
      ...gradingStatus,
      teacherGradingProgress,
      teacherGradingCompleted: teacherGradingFinishedProgress === 100,
      censorGradingCompleted: gradingStatus.censoringProgress === 100,
      eventDateStr,
      teacherGradingFinishedProgress
    }
  }

  function gradingPercentage(answerCount: number, autogradedScoresCount: number, manualScoresCount: number) {
    if (answerCount === 0 || answerCount === autogradedScoresCount) {
      return 100
    } else {
      const percentage = Math.floor((manualScoresCount / (answerCount - autogradedScoresCount)) * 100)
      return percentage === 0 && manualScoresCount > 0 ? 1 : percentage
    }
  }
}
