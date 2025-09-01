import React, { useContext } from 'react'
import { GradingContext } from './grading-view'
import { GradingAnswerType } from './types'
import { canApproveOrReject } from './answer-controls'
import { ScoreCell } from './score-cell'
import { GridScoreCellPassThroughProps } from './grid-score-cell'
import { useTranslation } from 'react-i18next'

type GradingScoreCellProps = {
  answer: GradingAnswerType
  gridScoreCellPassThroughProps: GridScoreCellPassThroughProps
}

export function GradingScoreCell({ answer, gridScoreCellPassThroughProps }: GradingScoreCellProps) {
  const { user, showAllPregradingScores } = useContext(GradingContext)
  const { scoreValue, pregrading, censoring } = answer
  const { t } = useTranslation()

  const isWaitingForSecondOrThird =
    ['waiting_for_second', 'waiting_for_third'].includes(censoring?.censoringState || '') &&
    censoring?.scores[0].censorId !== user?.user?.censorId

  const isWaitingForUser = censoring && user && canApproveOrReject(censoring, user)

  const scoreDifference =
    scoreValue != undefined && pregrading?.scoreValue != undefined && censoring?.censoringState == 'initial_ok'
      ? scoreValue - pregrading.scoreValue
      : 0

  const scoreDifferenceText =
    scoreDifference > 0 ? `+${scoreDifference}` : scoreDifference < 0 ? `${scoreDifference}` : undefined

  const batchGraded = Number.isInteger(answer.batchGroupNumber)
  const batchGradedLabel = answer.scoreValue == null && batchGraded ? 'K' : undefined
  const title = batchGraded ? t('sa.censor.batch_graded_score_title') : undefined
  const scoreOverride = showAllPregradingScores ? (pregrading?.scoreValue?.toString() ?? '') : batchGradedLabel
  const readOnlyOverride = showAllPregradingScores || batchGraded

  return (
    <ScoreCell
      answer={answer}
      scoreOverride={scoreOverride}
      readOnlyOverride={readOnlyOverride}
      isWaitingForSecondOrThird={isWaitingForSecondOrThird}
      censoringState={censoring?.censoringState}
      isWaitingForUser={isWaitingForUser}
      scoreDifferenceText={scoreDifferenceText}
      title={title}
      {...gridScoreCellPassThroughProps}
    />
  )
}
