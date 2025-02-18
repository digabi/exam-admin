import { isEmpty, mapValues, unzip } from 'lodash'
import {
  GradingAnswerType,
  GradingExam,
  GradingExamAndScores,
  GradingRole,
  GradingStudent,
  GradingUrlsContextData,
  NavigateToAnswerFunction
} from './types'
import { getJson } from '../common/utils'

export type NavigationMap = Record<string, NavigationFunctions>
export type Direction = 'up' | 'down' | 'left' | 'right'
type NavigationFunction = (() => Promise<void>) | (() => void)

type NavigationFunctions = {
  up: NavigationFunction
  down: NavigationFunction
  left: NavigationFunction
  right: NavigationFunction
  upAlt: NavigationFunction
  downAlt: NavigationFunction
  leftAlt: NavigationFunction
  rightAlt: NavigationFunction
}

type AnswerWithAnonCodes = GradingAnswerType &
  Pick<GradingStudent, 'studentAnonIdentifier'> &
  Pick<GradingExam, 'schoolAnonCode'> &
  Pick<GradingExam, 'examUuid'>

const directions = {
  up: ['column', -1],
  down: ['column', 1],
  left: ['row', -1],
  right: ['row', 1],
  upAlt: ['column', -1],
  downAlt: ['column', 1],
  leftAlt: ['row', -1],
  rightAlt: ['row', 1]
} as const

async function getStudentFromPreviousOrNextSchool(
  schoolExamAnonCode: string,
  examUuid: string,
  questionId: number,
  direction: 'previous' | 'next',
  gradingUrls: GradingUrlsContextData
): Promise<{ schoolExamAnonCode: string; studentAnonIdentifier: number } | null> {
  const response = await getJson<{ schoolExamAnonCode: string; studentAnonIdentifier: number }>(
    gradingUrls.getStudentFromPreviousOrNextSchool!(direction, examUuid, questionId, schoolExamAnonCode)
  )
  if (response.json) {
    return response.json
  }
  return null
}

async function getPreviousOrNextAnswerWithNoScore(
  schoolExamAnonCode: string,
  examUuid: string,
  questionId: number,
  direction: 'previous' | 'next',
  gradingUrls: GradingUrlsContextData
): Promise<{ schoolExamAnonCode: string; studentAnonIdentifier: number } | null> {
  const response = await getJson<{ schoolExamAnonCode: string; studentAnonIdentifier: number }>(
    gradingUrls.getPreviousOrNextAnswerWithNoScore!(direction, examUuid, questionId, schoolExamAnonCode)
  )
  if (response.json) {
    return response.json
  }
  return null
}

function getAnotherSchoolNavigationFunction(
  getStudentFromPreviousOrNextSchoolFn: (
    schoolExamAnonCode: string,
    examUuid: string,
    questionId: number,
    direction: 'previous' | 'next',
    gradingUrls: GradingUrlsContextData
  ) => Promise<{ schoolExamAnonCode: string; studentAnonIdentifier: number } | null>,
  focusedAnswer: AnswerWithAnonCodes,
  direction: 'previous' | 'next',
  navigateToAnswer: NavigateToAnswerFunction,
  setUpdating: (updating: boolean) => void,
  gradingUrls: GradingUrlsContextData
) {
  return async () => {
    const nextStudentFromAnotherSchool = await getStudentFromPreviousOrNextSchoolFn(
      focusedAnswer.schoolAnonCode,
      focusedAnswer.examUuid,
      focusedAnswer.questionId,
      direction,
      gradingUrls
    )

    if (!nextStudentFromAnotherSchool) {
      return () => {}
    }
    setUpdating(true)

    navigateToAnswer(
      nextStudentFromAnotherSchool.studentAnonIdentifier,
      focusedAnswer.displayNumber,
      nextStudentFromAnotherSchool.schoolExamAnonCode
    )
  }
}

function getNavigationFunction(
  focusedAnswer: AnswerWithAnonCodes,
  answersInRowOrder: AnswerWithAnonCodes[],
  answersInColumnOrder: AnswerWithAnonCodes[],
  columnOrRow: 'column' | 'row',
  delta: number,
  navigateToAnswer: NavigateToAnswerFunction,
  setUpdating: (updating: boolean) => void,
  scoreTableType: GradingRole,
  gradingUrls: GradingUrlsContextData
) {
  const answers =
    columnOrRow == 'row'
      ? answersInRowOrder
      : answersInColumnOrder.filter(
          a => scoreTableType === 'pregrading' || a.displayNumber === focusedAnswer.displayNumber
        )

  const nextAnswerIndex = answers.findIndex(a => focusedAnswer.answerId === a.answerId) + delta
  const nextAnswer = answers[nextAnswerIndex]

  if (!nextAnswer) {
    if (scoreTableType === 'censoring' && columnOrRow === 'column') {
      return getAnotherSchoolNavigationFunction(
        getStudentFromPreviousOrNextSchool,
        focusedAnswer,
        delta > 0 ? 'next' : 'previous',
        navigateToAnswer,
        setUpdating,
        gradingUrls
      )
    }
    return () => {}
  }

  const navigationFunction = () =>
    navigateToAnswer(nextAnswer.studentAnonIdentifier, nextAnswer.displayNumber, nextAnswer.schoolAnonCode)

  return navigationFunction
}

function getAltNavigationFunction(
  focusedAnswer: AnswerWithAnonCodes,
  answersInRowOrder: AnswerWithAnonCodes[],
  answersInColumnOrder: AnswerWithAnonCodes[],
  columnOrRow: 'column' | 'row',
  delta: number,
  navigateToAnswer: NavigateToAnswerFunction,
  setUpdating: (updating: boolean) => void,
  scoreTableType: GradingRole,
  gradingUrls: GradingUrlsContextData
) {
  const answers =
    columnOrRow == 'row'
      ? answersInRowOrder
      : answersInColumnOrder.filter(
          a => scoreTableType === 'pregrading' || a.displayNumber === focusedAnswer.displayNumber
        )

  const activeAnswersAndCurrentAnswer = answers.filter(
    a => a.answerId == focusedAnswer.answerId || (a.userCanScore && a.scoreValue == undefined)
  )

  const nextAnswerIndex = activeAnswersAndCurrentAnswer.findIndex(a => focusedAnswer.answerId === a.answerId) + delta

  const nextAnswer = activeAnswersAndCurrentAnswer[nextAnswerIndex]

  if (!nextAnswer) {
    if (scoreTableType === 'censoring' && columnOrRow === 'column') {
      return getAnotherSchoolNavigationFunction(
        getPreviousOrNextAnswerWithNoScore,
        focusedAnswer,
        delta > 0 ? 'next' : 'previous',
        navigateToAnswer,
        setUpdating,
        gradingUrls
      )
    }

    return () => {}
  }

  const navigationFunction = () =>
    navigateToAnswer(nextAnswer.studentAnonIdentifier, nextAnswer.displayNumber, nextAnswer.schoolAnonCode)

  return navigationFunction
}

export function initScoreTableNavigation(
  examAndScores: GradingExamAndScores | undefined,
  navigateToAnswer: (newStudentCode: number, newDisplayNumber: string, newSchoolExamCode?: string) => void,
  setUpdating: (updating: boolean) => void,
  scoreTableType: GradingRole,
  gradingUrls: GradingUrlsContextData
): NavigationMap {
  const isNotEmpty = (answer: AnswerWithAnonCodes | Record<string, never>): answer is AnswerWithAnonCodes =>
    !isEmpty(answer)

  const answers =
    examAndScores?.students.map(student =>
      student.answers.map(answer => {
        if (isEmpty(answer)) {
          return {}
        }
        return {
          ...answer,
          studentAnonIdentifier: student.studentAnonIdentifier,
          schoolAnonCode: examAndScores.exam.schoolAnonCode,
          examUuid: examAndScores.exam.examUuid
        }
      })
    ) ?? []

  const answersInRowOrder = answers.flat().filter(answer => isNotEmpty(answer))
  const answersInColumnOrder = unzip(answers)
    .flat()
    .filter(answer => isNotEmpty(answer))

  const answerIDsWithNavigationMap = answersInRowOrder.map<[number, NavigationFunctions]>(answer => {
    const navigationFunctionsForAnswer = mapValues(directions, ([columnOrRow, delta], direction) =>
      direction.endsWith('Alt')
        ? getAltNavigationFunction(
            answer,
            answersInRowOrder,
            answersInColumnOrder,
            columnOrRow,
            delta,
            navigateToAnswer,
            setUpdating,
            scoreTableType,
            gradingUrls
          )
        : getNavigationFunction(
            answer,
            answersInRowOrder,
            answersInColumnOrder,
            columnOrRow,
            delta,
            navigateToAnswer,
            setUpdating,
            scoreTableType,
            gradingUrls
          )
    )

    return [answer.answerId, navigationFunctionsForAnswer]
  })

  return Object.fromEntries(answerIDsWithNavigationMap)
}
