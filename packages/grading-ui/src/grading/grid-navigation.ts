import { isEmpty } from 'lodash'
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
import { useMemo } from 'react'

type AnswerWithAnonCodes = GradingAnswerType &
  Pick<GradingStudent, 'studentAnonIdentifier'> &
  Pick<GradingExam, 'schoolAnonCode'> &
  Pick<GradingExam, 'examUuid'>

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

async function navigateToAnotherSchool(
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

function answerIsNotEmpty(answer: GradingAnswerType | Record<string, never>): answer is GradingAnswerType {
  return !isEmpty(answer)
}

type NavigationFn = (
  student: GradingStudent,
  answer: GradingAnswerType,
  studentIndex: number,
  answerIndex: number,
  alt: boolean
) => Promise<void>

export type Direction = 'right' | 'left' | 'down' | 'up'

export type NavigateInGrid = Record<Direction, NavigationFn>

export function useNavigateInGrid(
  examAndScores: GradingExamAndScores | undefined,
  gradingRole: GradingRole,
  gradingUrls: GradingUrlsContextData,
  setUpdating: (updating: boolean) => void,
  navigateToAnswer: (newStudentCode: number, newDisplayNumber: string, newSchoolExamCode?: string) => void
): NavigateInGrid {
  const navigateInGrid = useMemo(() => {
    if (!examAndScores) {
      return {
        right: async () => {},
        left: async () => {},
        down: async () => {},
        up: async () => {}
      }
    }

    const navigate =
      (getNextIndexes: (studentIndex: number, answerIndex: number) => [studentIndex: number, answerIndex: number]) =>
      async (
        student: GradingStudent,
        answer: GradingAnswerType,
        studentIndex: number,
        answerIndex: number,
        alt: boolean
      ) => {
        function canNavigateToAnswer(
          answer: GradingAnswerType | Record<string, never> | undefined
        ): answer is GradingAnswerType {
          if (!answer) return false
          const answerNeedsAScore = answer.userCanScore && answer.scoreValue === undefined
          return answerIsNotEmpty(answer) && (!alt || answerNeedsAScore)
        }

        const studentCount = examAndScores.students.length
        const answerCount = examAndScores.students[0].answers.length

        function handleOverflow([studentIndex, answerIndex]: [number, number]) {
          if (answerIndex >= answerCount) {
            studentIndex += 1
            answerIndex = 0
          }
          if (studentIndex >= studentCount && gradingRole === 'pregrading') {
            studentIndex = 0
            answerIndex += 1
          }
          if (answerIndex < 0) {
            studentIndex -= 1
            answerIndex = answerCount - 1
          }
          if (studentIndex < 0 && gradingRole === 'pregrading') {
            studentIndex = studentCount - 1
            answerIndex -= 1
          }
          return [studentIndex, answerIndex]
        }

        function indexesAreWithinBounds(studentIndex: number, answerIndex: number) {
          return 0 <= studentIndex && studentIndex < studentCount && 0 <= answerIndex && answerIndex < answerCount
        }

        let nextStudentIndex = studentIndex
        let nextAnswerIndex = answerIndex
        let nextAnswer: GradingAnswerType | Record<string, never> | undefined
        while (!canNavigateToAnswer(nextAnswer) && indexesAreWithinBounds(nextStudentIndex, nextAnswerIndex)) {
          ;[nextStudentIndex, nextAnswerIndex] = handleOverflow(getNextIndexes(nextStudentIndex, nextAnswerIndex))
          nextAnswer = examAndScores.students[nextStudentIndex]?.answers[nextAnswerIndex]
        }

        if (canNavigateToAnswer(nextAnswer)) {
          const nextStudent = examAndScores.students[nextStudentIndex]
          return navigateToAnswer(
            nextStudent.studentAnonIdentifier,
            nextAnswer.displayNumber,
            examAndScores.exam.schoolAnonCode
          )
        }
        const movingVertically = getNextIndexes(0, 0)[0] !== 0
        if (gradingRole === 'censoring' && movingVertically) {
          return void (await navigateToAnotherSchool(
            alt ? getPreviousOrNextAnswerWithNoScore : getStudentFromPreviousOrNextSchool,
            {
              ...answer,
              studentAnonIdentifier: student.studentAnonIdentifier,
              displayNumber: answer.displayNumber,
              examUuid: examAndScores.exam.examUuid,
              schoolAnonCode: examAndScores.exam.schoolAnonCode
            },
            nextStudentIndex > studentIndex || nextAnswerIndex > answerIndex ? 'next' : 'previous',
            navigateToAnswer,
            setUpdating,
            gradingUrls
          ))
        }
      }

    return {
      right: navigate((sI, aI) => [sI, aI + 1]),
      left: navigate((sI, aI) => [sI, aI - 1]),
      down: navigate((sI, aI) => [sI + 1, aI]),
      up: navigate((sI, aI) => [sI - 1, aI])
    }
  }, [examAndScores, gradingRole, gradingUrls, setUpdating, navigateToAnswer])

  return navigateInGrid
}
