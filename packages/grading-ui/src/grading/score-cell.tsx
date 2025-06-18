import classNames from 'classnames'
import React, { useRef } from 'react'
import { CensoringState, GradingAnswerType, XOR } from './types'

import { getScoreRegExp } from '../common/score-regexp'
import { useAnimateMarkingReady, useDebouncedScoreChange, useLocalScoreState, useScrollIntoViewOnFocus } from './hooks'

type CommonScoreCellProps = {
  answer: GradingAnswerType
  scoreOverride?: string
  readOnlyOverride?: boolean
  isFocused?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => Promise<void>
  onClick?: () => void
}

type GradingScoreCellProps = {
  isWaitingForSecondOrThird: boolean
  censoringState?: CensoringState
  isWaitingForUser?: boolean
  scoreDifferenceText?: string
}

type PregradingScoreCellProps = { pregradedByUser?: boolean; isSelected?: boolean }

type GradingRoleSpecificProps = XOR<GradingScoreCellProps, PregradingScoreCellProps>

type ScoreCellProps = CommonScoreCellProps & GradingRoleSpecificProps

export function ScoreCell({
  answer,
  scoreOverride,
  readOnlyOverride,
  isFocused,
  onKeyDown,
  onClick,
  //pregrading
  isSelected,
  pregradedByUser,
  //grading
  censoringState,
  scoreDifferenceText,
  isWaitingForSecondOrThird,
  isWaitingForUser
}: ScoreCellProps) {
  const { answerId, maxScore, scoreValue } = answer

  const inputRef = useRef<HTMLInputElement>(null)

  const answerScorePattern = getScoreRegExp(maxScore)

  const isReadOnly = !answer.userCanScore || !!readOnlyOverride

  useScrollIntoViewOnFocus(!!isFocused, inputRef, isReadOnly)

  const justFinished = useAnimateMarkingReady(isReadOnly)

  const [localScore, setLocalScore] = useLocalScoreState(scoreValue, !!isWaitingForSecondOrThird)

  const { isSavingScore, isNotSaved, onScoreChange } = useDebouncedScoreChange(
    answer,
    localScore,
    setLocalScore,
    !!isWaitingForSecondOrThird
  )

  return (
    <td
      id={`cell-${answerId}`}
      data-censoring-state={censoringState}
      data-answer-id={answerId}
      className={classNames('answerScore', {
        isWaitingForUser
      })}>
      <input
        ref={inputRef}
        onKeyDown={e => void onKeyDown?.(e)}
        onClick={onClick}
        onInput={e => onScoreChange(e.currentTarget.value)}
        className={classNames('scorePoints', {
          highlight: isFocused,
          pregradedByUser,
          selected: isSelected,
          justFinished,
          savingScore: isSavingScore,
          notSaved: isNotSaved
        })}
        maxLength={2}
        data-answer-id={answerId}
        type="text"
        inputMode="numeric"
        pattern={answerScorePattern}
        value={scoreOverride ?? localScore}
        readOnly={isReadOnly}
      />
      <div className="score-difference">{scoreDifferenceText}</div>
      <div className={`saving-score fa-spin ${isSavingScore ? 'visible' : ''}`}>
        <div className="saving-score-dot-1" />
        <div className="saving-score-dot-2" />
        <div className="saving-score-dot-3" />
      </div>
    </td>
  )
}
