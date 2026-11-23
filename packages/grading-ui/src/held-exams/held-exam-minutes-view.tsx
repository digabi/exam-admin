import React, { JSX } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { Language } from '../common/types'
import { localDateStringWithWeekdayAndYear } from '../common/client-utils-commonjs'
import i18next from '../locales/i18n'
import { HeldExamMinutes } from './held-exam-minutes'
import { MinutesApiResponse, PregradingExamUrls } from './types'
import '../../less/grading-exams-held-exam-minutes.less'
import { LoadingSpinner } from '../common/loading-spinner'
import { useHeldExamMinutes } from './useHeldExamMinutes'

export function HeldExamMinutesView({
  lang,
  PageBanner,
  pregradingExamUrls
}: {
  lang: Language
  PageBanner: JSX.Element
  pregradingExamUrls: PregradingExamUrls
}) {
  return (
    <I18nextProvider i18n={i18next(lang)}>
      <CommonHeldExamMinutesView PageBanner={PageBanner} pregradingExamUrls={pregradingExamUrls} />
    </I18nextProvider>
  )
}

function CommonHeldExamMinutesView({
  PageBanner,
  pregradingExamUrls
}: {
  PageBanner: JSX.Element
  pregradingExamUrls: PregradingExamUrls
}) {
  const { t } = useTranslation()
  const { heldExamUuid = '' } = useParams()

  if (!pregradingExamUrls.minutesData?.(heldExamUuid)) {
    return null
  }

  const { minutes, defaultExamUuid, isLoading, hasError } = useHeldExamMinutes(
    pregradingExamUrls.minutesData(heldExamUuid)
  )

  const heldExamsViewUrl = pregradingExamUrls.heldExamsView?.()

  return (
    <>
      {PageBanner}
      <div id="held-exam-minutes">
        {heldExamsViewUrl ? (
          <button type="button" className="minutes-back-link" onClick={() => window.location.assign(heldExamsViewUrl)}>
            <i className="fa fa-solid fa-arrow-left" /> {t('sa.minutes.back_to_held_exams')}
          </button>
        ) : null}
        <LoadingSpinner loading={isLoading} />
        {hasError ? (
          <div className="info-text error">{t('sa.minutes.fetch_error')}</div>
        ) : minutes ? (
          <>
            <HeldExamMinutesHeader minutes={minutes} />
            <HeldExamMinutes defaultExamUuid={defaultExamUuid} minutes={minutes} />
          </>
        ) : (
          !isLoading && <div className="info-text">{t('sa.no_minutes')}</div>
        )}
      </div>
    </>
  )
}

function HeldExamMinutesHeader({ minutes }: { minutes: MinutesApiResponse }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Language

  if (minutes.notes.length === 0) {
    return null
  }

  return (
    <>
      <h2>
        {t('sa.minutes.title')}{' '}
        {localDateStringWithWeekdayAndYear({
          date: new Date(minutes.notes[0].timestamp).toISOString(),
          showWeekday: true,
          showYear: true,
          lang
        })}
      </h2>

      <div className="minutes-summary">
        {t('sa.minutes.exams_on_minutes')}
        <ul className="minutes-summary-exam-list">
          {minutes.exams.map(exam => (
            <li key={exam.examUuid} className="minutes-summary-exam-name">
              {exam.examTitle}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
