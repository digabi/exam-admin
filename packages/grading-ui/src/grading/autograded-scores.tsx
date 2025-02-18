import classNames from 'classnames'
import React from 'react'
import { StudentExamScores } from './types'

export function AutogradedScores({
  examAndScores: { autogradingAnswers, autogradingDone },
  student: { totalAutogradingScore }
}: StudentExamScores) {
  return (
    <>
      {autogradingAnswers && (
        <td
          className={classNames('totalScore', 'totalAutogradingScore', {
            gradingInProgress: !autogradingDone
          })}>
          {totalAutogradingScore}
        </td>
      )}
    </>
  )
}
