import classNames from 'classnames'
import React from 'react'
import { StudentExamScores } from './types'

export function TotalScore({ examAndScores: { autogradingDone }, student: { totalScore } }: StudentExamScores) {
  return (
    <td className={classNames('totalScore', 'js-totalScore', { gradingInProgress: !autogradingDone })}>{totalScore}</td>
  )
}
