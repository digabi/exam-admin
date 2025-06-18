import React, { useContext } from 'react'
import { GradingContext } from './grading-view'
import { GradingAnswerType, GradingStudent } from './types'
import { GradingScoreCell } from './grading-score-cell'
import { PregradingScoreCell } from './pregrading-score-cell'
import { useGridNavigation } from './hooks'

type GridScoreCellProps = {
  student: GradingStudent
  answer: GradingAnswerType
  isPregrading: boolean
  studentIndex: number
  answerIndex: number
}

export type GridScoreCellPassThroughProps = {
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => Promise<void>
  isFocused: boolean
  onClick: () => void
}

export function GridScoreCell(props: GridScoreCellProps) {
  const { currentAnswer, navigateToAnswer } = useContext(GradingContext)
  const { answer, student, isPregrading, studentIndex, answerIndex } = props
  const onKeyDown = useGridNavigation()

  const { studentCode, displayNumber } = currentAnswer

  const isCurrentAnswer =
    student.studentAnonIdentifier?.toString() == studentCode && answer.displayNumber?.toString() == displayNumber

  const gridScoreCellPassThroughProps: GridScoreCellPassThroughProps = {
    onKeyDown: e => onKeyDown(e, student, answer, studentIndex, answerIndex),
    isFocused: isCurrentAnswer,
    onClick: () => navigateToAnswer(student.studentAnonIdentifier, answer.displayNumber)
  }

  const Cell = isPregrading ? PregradingScoreCell : GradingScoreCell
  return <Cell answer={answer} student={student} gridScoreCellPassThroughProps={gridScoreCellPassThroughProps} />
}
