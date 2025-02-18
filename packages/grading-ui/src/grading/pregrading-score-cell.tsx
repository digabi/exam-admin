import React, { useContext } from 'react'
import { GradingContext } from './grading-view'
import { GradingAnswerType, GradingStudent } from './types'
import { useSelectAnswerIdsToMarkFinished } from './useSelectAnswerIdsToMarkFinished'
import { ScoreCell } from './score-cell'
import { GridScoreCellPassThroughProps } from './grid-score-cell'

type PregradingScoreCellProps = {
  student: GradingStudent
  answer: GradingAnswerType | Record<string, never>
  gridScoreCellPassThroughProps: GridScoreCellPassThroughProps
}

export function PregradingScoreCell({ student, answer, gridScoreCellPassThroughProps }: PregradingScoreCellProps) {
  const { user } = useContext(GradingContext)
  const { pregrading, answerId } = answer

  const pregradedByUser =
    pregrading?.authorId && pregrading?.authorId === user?.user?.userAccountId && pregrading?.scoreValue != null

  const selectedIds = useSelectAnswerIdsToMarkFinished()?.flatMap(i => i.id) ?? []
  const isSelectedForMarkingFinished = selectedIds.includes(answerId)

  return (
    <ScoreCell
      answer={answer}
      scoreOverride={student.skipPregrading ? '-' : undefined}
      pregradedByUser={!!pregradedByUser}
      isSelected={isSelectedForMarkingFinished}
      {...gridScoreCellPassThroughProps}
    />
  )
}
