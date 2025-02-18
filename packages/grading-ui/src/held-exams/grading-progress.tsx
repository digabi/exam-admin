import classNames from 'classnames'
import { differenceInCalendarDays } from 'date-fns'
import React from 'react'
import { useAnimatedWidth } from '../common/useAnimateWidth'
import { ExamPregradingDeadlines } from './types'
import { localDateStringWithWeekdayAndYear } from '../common/client-utils-commonjs'
import { useTranslation } from 'react-i18next'
import { Language } from '../common/types'
import '../../less/grading-progress.less'

interface GradingProgressProps {
  gradingCompleted?: boolean
  gradingProgress?: number
  testId?: string
  small?: boolean
  label?: string
  dateTargets?: ExamPregradingDeadlines
}

export const GradingProgress = ({
  gradingCompleted,
  gradingProgress,
  testId,
  small = false,
  dateTargets,
  label
}: GradingProgressProps) => {
  const progress = gradingProgress || 0
  const animatedStyle = useAnimatedWidth(progress)
  const { i18n } = useTranslation()
  const dates = dateTargets ? Object.values(dateTargets) : []
  const completed = gradingCompleted || gradingProgress === 100

  label = label || `${progress} %`
  const lang = i18n.language as Language

  return (
    <span
      className={classNames('grading-progress', {
        small,
        completed,
        'with-dates': dates.length > 0
      })}>
      <span className="progress-text" data-testid={testId ? `${testId}-text` : undefined}>
        {label}
      </span>

      <span className="progress-bg">
        <div className="progress-fg-container">
          <span
            className={classNames('progress-fg', {
              'has-progress': !!gradingProgress
            })}
            style={animatedStyle}
          />
        </div>

        {dates?.map((t, index) => {
          const deadlineIsPassedOrToday = t.date
            ? differenceInCalendarDays(t.date, new Date()) <= 0 && progress < t.target * 100
            : false
          return (
            <span
              key={[t.date, index].join('-')}
              className={classNames('intermediate-mark', {
                'hidden-mark': t.target === 1
              })}
              style={{ left: `calc(${t.target * 100}% - 2px)` }}>
              <div
                className={classNames('date', {
                  red: deadlineIsPassedOrToday,
                  green: progress >= t.target * 100
                })}
                data-testid="pregrading-deadline-date">
                {localDateStringWithWeekdayAndYear({ date: t.date, lang })}
                {t.date && progress >= t.target * 100 && <span className="reached">✔</span>}
              </div>
            </span>
          )
        })}
      </span>
    </span>
  )
}
