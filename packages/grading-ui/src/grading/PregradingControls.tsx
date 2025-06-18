import React, { useContext, useEffect, useState } from 'react'
import { GradingAnswerType, Pregrading } from './types'
import { format } from 'date-fns'
import { GradingContext, hasCensorWaitingPeriodPassedForAnswer } from './grading-view'
import { fi } from 'date-fns/locale/fi'
import { useTranslation } from 'react-i18next'

interface Props {
  answer: GradingAnswerType
  isImpersonating: boolean
  isPregradedByUser: boolean
  cellSavingOngoing: boolean
  postMarkPregradingFinished: (answerIds: number[]) => Promise<Array<Pregrading & { answerId: number }> | undefined>
  postRevertPregradingFinishedAt: (answerId: number) => Promise<void>
}

export const PregradingControls = ({
  answer,
  postMarkPregradingFinished,
  postRevertPregradingFinishedAt,
  isImpersonating,
  isPregradedByUser,
  cellSavingOngoing
}: Props) => {
  if (answer?.scoreValue == null) {
    return null
  }
  const { waitingForCensorHours } = useContext(GradingContext)
  const [saving, setSaving] = useState<boolean>(false)
  const { t } = useTranslation()
  const censorWaitingPeriodHasPassed = hasCensorWaitingPeriodPassedForAnswer(answer, waitingForCensorHours)
  useEffect(() => {
    setSaving(cellSavingOngoing)
  }, [cellSavingOngoing])
  const markFinished = async () => {
    setSaving(true)
    await postMarkPregradingFinished([answer.answerId])
    setSaving(false)
  }
  const revertFinished = async () => {
    setSaving(true)
    await postRevertPregradingFinishedAt(answer.answerId)
    setSaving(false)
  }

  return (
    <div className="finish-pregrading">
      {!answer?.pregrading?.pregradingFinishedAt ? (
        <>
          <p>{t('sa.pregrading.you_can_mark_just_this_finished')}</p>

          {!isPregradedByUser && (
            <p>
              <strong>{t('sa.pregrading.nb')}</strong> {t('sa.pregrading.not_graded_by_you')}
            </p>
          )}

          <button disabled={saving} onClick={() => void markFinished()} className="button">
            {t('sa.pregrading.mark_finished')}
          </button>
        </>
      ) : (
        <>
          {!isImpersonating && censorWaitingPeriodHasPassed && <b>{t('sa.pregrading.censor_waiting_period_passed')}</b>}

          <p className="grey">
            {t('sa.pregrading.answer_moved_to_censoring')}
            <br />
            {format(new Date(answer.pregrading.pregradingFinishedAt), 'Pp', { locale: fi })}.
          </p>

          {!censorWaitingPeriodHasPassed && (
            <p>
              {t(
                waitingForCensorHours
                  ? 'sa.pregrading.can_still_be_reverted'
                  : 'sa.pregrading.can_still_be_reverted_with_no_quarantine',
                { waitingForCensorHours }
              )}
            </p>
          )}

          {(isImpersonating || !censorWaitingPeriodHasPassed) && (
            <>
              {!isPregradedByUser && (
                <p>
                  <strong>{t('sa.pregrading.nb')}</strong> {t('sa.pregrading.not_graded_by_you')}
                </p>
              )}
              <button disabled={saving} className="button" onClick={() => void revertFinished()}>
                {t('sa.pregrading.revert_pregrading_finished')}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
