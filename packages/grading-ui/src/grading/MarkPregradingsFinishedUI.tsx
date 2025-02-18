import React, { useContext, useState } from 'react'
import { GradingContext } from './grading-view'
import { Pregrading } from './types'
import { useSelectAnswerIdsToMarkFinished } from './useSelectAnswerIdsToMarkFinished'
import { UserData } from '../common/types'
import { useTranslation } from 'react-i18next'

interface Props {
  userData: UserData | undefined
  finishPregradingForMultipleAnswers: (ids: number[]) => Promise<Array<Pregrading & { answerId: number }> | undefined>
  markCensorWaitingTimePassedForMultipleAnswers: (
    ids: number[]
  ) => Promise<Array<Pregrading & { answerId: number }> | undefined>
  closeView: () => void
  setMarkOnlyMyGradesFinished: (value: boolean) => void
  markOnlyMyGradesFinished: boolean
  setMarkOnlySelectedGradesFinished: (value: boolean) => void
}

export const MarkPregradingsReadyUI = ({
  userData,
  finishPregradingForMultipleAnswers,
  markCensorWaitingTimePassedForMultipleAnswers,
  closeView,
  setMarkOnlyMyGradesFinished,
  setMarkOnlySelectedGradesFinished,
  markOnlyMyGradesFinished
}: Props) => {
  const { markOnlySelectedGradesFinished, waitingForCensorHours } = useContext(GradingContext)
  const { t } = useTranslation()
  const [confirmMarkingFinished, setConfirmMarkingFinished] = useState<boolean>(false)
  const [justMarkedFinishedCount, setJustMarkedFinishedCount] = useState<number>(0)
  const [markCensorPeriodPassed, setMarkCensorPeriodPassed] = useState<boolean>(false)

  const selectedUnfinishedAnswers = useSelectAnswerIdsToMarkFinished()

  const markAllGradesFinished = async () => {
    const answerIds: number[] = selectedUnfinishedAnswers?.flatMap(i => i.id)
    let res
    if (answerIds) {
      if (markCensorPeriodPassed) {
        res = await markCensorWaitingTimePassedForMultipleAnswers(answerIds)
      } else {
        res = await finishPregradingForMultipleAnswers(answerIds)
      }
      if (res) {
        setJustMarkedFinishedCount(res.length)
        setTimeout(() => {
          setJustMarkedFinishedCount(0)
        }, 7000) // 2s + 5s in grading.less
      }
      setConfirmMarkingFinished(false)
    }
  }

  return (
    <>
      <div>
        <button onClick={closeView} className="close-grading-ui">
          {t('sa.pregrading.close')}
        </button>
        <h3>{t('sa.pregrading.mark_gradings_finished')}</h3>
        <p>
          {t(waitingForCensorHours ? 'sa.pregrading.quarantine_infotext' : 'sa.pregrading.no_quarantine_infotext', {
            waitingForCensorHours
          })}
        </p>

        <fieldset>
          <legend>{t('sa.pregrading.mark_finished')}:</legend>
          <div>
            <input
              type="radio"
              id="all"
              name="all-or-selected"
              checked={!markOnlySelectedGradesFinished}
              onChange={() => setMarkOnlySelectedGradesFinished(false)}
            />
            <label htmlFor="all">{t('sa.pregrading.all_graded_by_me')}</label>
          </div>
          <div>
            <input
              type="radio"
              id="selected"
              name="all-or-selected"
              checked={markOnlySelectedGradesFinished}
              onChange={() => setMarkOnlySelectedGradesFinished(true)}
            />
            <label htmlFor="selected">{t('sa.pregrading.chosen_rows_columns')}</label>
          </div>
          <div>
            <input
              type="checkbox"
              id="own-or-all"
              name="own-or-all"
              onChange={value => setMarkOnlyMyGradesFinished(!value.currentTarget.checked)}
              checked={!markOnlyMyGradesFinished}
            />
            <label htmlFor="own-or-all">{t('sa.pregrading.also_those_graded_by_others')}</label>
          </div>
          {userData?.user?.mock && (
            <div>
              <input
                type="checkbox"
                id="set-censor-period-passed"
                name="set-censor-period-passed"
                onChange={value => setMarkCensorPeriodPassed(value.currentTarget.checked)}
                checked={markCensorPeriodPassed}
              />
              <label htmlFor="set-censor-period-passed">Aseta sensorin karenssiaika loppuneeksi</label>
            </div>
          )}
          {confirmMarkingFinished ? (
            <div className="confirm-grading-finished">
              <div className="confirm-dialog-overlay" onClick={() => setConfirmMarkingFinished(false)} />
              <div className="confirm-dialog">
                <h4>{t('sa.pregrading.shall_be_marked_finished', { count: selectedUnfinishedAnswers.length })}</h4>

                <p>
                  {t(
                    waitingForCensorHours
                      ? 'sa.pregrading.quarantine_infotext'
                      : 'sa.pregrading.no_quarantine_infotext',
                    { waitingForCensorHours }
                  )}
                </p>

                {selectedUnfinishedAnswers.filter(i => !i.pregradedByUser).length > 0 && (
                  <p>
                    <strong>{t('sa.pregrading.nb')}</strong> {t('sa.pregrading.you_are_about_to_mark_others_gradings')}
                  </p>
                )}

                <button className="button" onClick={() => void markAllGradesFinished()}>
                  {t('sa.pregrading.mark_finished')}
                </button>
                <a onClick={() => setConfirmMarkingFinished(false)}>{t('sa.pregrading.cancel')}</a>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmMarkingFinished(true)}
              className="button"
              disabled={selectedUnfinishedAnswers.length === 0}>
              {t('sa.pregrading.mark_finished_n', { count: selectedUnfinishedAnswers.length })}
            </button>
          )}
        </fieldset>

        {justMarkedFinishedCount > 0 && (
          <div className="just-marked-ready">
            {t('sa.pregrading.just_marked_finished_n', { count: justMarkedFinishedCount })}
          </div>
        )}
      </div>
    </>
  )
}
