import React, { useContext, useEffect, useState } from 'react'
import { GradingAnswerType, GradingRole } from './types'
import classNames from 'classnames'
import { GradingContext } from './grading-view'
import { useTranslation } from 'react-i18next'

export default ScoreHistory

function ScoreHistory(props: {
  answer: GradingAnswerType
  gradingRole?: GradingRole
  skipPregrading?: boolean
  initialShowPregrading?: boolean
  inspectorShortCodes?: string[]
}) {
  const [showPregrading, setShowPregrading] = useState<boolean>(false)
  const { answer, gradingRole, skipPregrading, initialShowPregrading, inspectorShortCodes } = props
  const { censoring, pregrading, inspection } = answer
  const isPregraded = pregrading && pregrading.scoreValue != undefined
  const inspectionShortCodes = inspectorShortCodes || [answer.inspection?.shortCode]

  const { showAllPregradingScores } = useContext(GradingContext)
  const { t } = useTranslation()

  useEffect(() => setShowPregrading(initialShowPregrading ?? false), [answer])
  return (
    <>
      <div className="answer-score-history-max-score">
        {answer.maxScore} {t('arpa.points_suffix')} max
      </div>
      <div id="answer-score-history">
        {inspection && inspection.scoreValue != null && (
          <div className="inspectionScore scoreRow">
            <span className="scoreCell">
              {inspection.scoreValue} {t('arpa.points_suffix')}
            </span>{' '}
            <span>
              {inspectionShortCodes?.map((code, index) => (
                <div key={code}>
                  <span className="shortCode">{code}</span>{' '}
                  <span className="scoringRound">
                    ({t('arpa.censor.inspector_abbr')}
                    {index + 1})
                  </span>
                </div>
              ))}
            </span>{' '}
          </div>
        )}
        {censoring?.censoringState === 'handled' && renderCensoringScoresWhenHandled()}
        {censoring?.censoringState !== 'handled' && renderCensoringScoresWhenNotHandled()}

        <div
          className={classNames(
            showPregrading || showAllPregradingScores
              ? 'scoreHistoryPregradingScoreToggled'
              : 'scoreHistoryPregradingScore',
            'pregradingScore',
            'scoreRow'
          )}>
          {isPregraded ? (
            <span className="scoreCell">
              {pregrading.scoreValue} {t('arpa.points_suffix')}
            </span>
          ) : (
            <span>{gradingRole == 'pregrading' || !skipPregrading ? t('arpa.not_graded') : '-'}</span>
          )}{' '}
          <span className="shortCode">{isPregraded ? pregrading.shortCode : ''}</span>{' '}
          {(isPregraded || (gradingRole == 'censoring' && skipPregrading)) && (
            <span className="scoringRound">({t('arpa.pregrading_abbr')})</span>
          )}
        </div>

        {!showPregrading && !showAllPregradingScores && (
          <a onClick={() => setShowPregrading(true)} className="showSinglePregrading">
            {t('arpa.show_pregrading')}
          </a>
        )}
      </div>
    </>
  )

  function renderCensoringScoresWhenNotHandled() {
    const state = censoring?.censoringState
    return censoring?.scores.map(score => {
      const round = score.censoringRound
      return (
        <div
          key={`score-censoring-${round}`}
          className={classNames('censoringScore', 'scoreRow', {
            waiting:
              censoring?.scores.length &&
              ((round === 1 && ['needs_first_approval', 'needs_both_approvals'].includes(state!)) ||
                (round === 2 && ['needs_second_approval', 'needs_both_approvals'].includes(state!)))
          })}>
          <span className="scoreCell">{score.scoreValue} p</span> {score.shortCode}{' '}
          <span className="scoringRound">
            ({round}.{t('arpa.censor.short')})
          </span>
        </div>
      )
    })
  }

  function renderCensoringScoresWhenHandled() {
    return (
      <>
        <div className="handled">
          <b>
            {censoring!.scores[0].scoreValue}
            {' p '}
          </b>
          <div className="handled-censor-list">
            {censoring!.scores
              .slice(0) // can't be handled without scores
              .reverse()
              .map((score, i, scores) => (
                <span key={`score-censoring-handled-${score.censoringRound}`}>
                  {score.shortCode}{' '}
                  <span className="scoringRound">
                    ({score.censoringRound}.{t('arpa.censor.short')})
                  </span>
                </span>
              ))}
          </div>
        </div>
        {censoring!.scores.slice(1).map(score => (
          <div key={`score-censoring-history-${score.censoringRound}`}>{score.scoreValue} p</div>
        ))}
      </>
    )
  }
}
