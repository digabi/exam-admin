import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { PregradingExams } from './pregrading-exams'
import { Language } from '../common/types'
import i18next from '../locales/i18n'
import { PregradingExamUrls, PregradingExamUrlsContextData } from './types'
import '../../less/grading-exams.less'

export const PregradingExamUrlsContext = React.createContext<PregradingExamUrlsContextData>(
  {} as PregradingExamUrlsContextData
)

export function Pregrading({
  scopeId,
  principal,
  allowedExams,
  canViewAllExams = false,
  canViewMinutes = false,
  pregradingExamUrls,
  examReviewRequired = false,
  examsDeletable = false,
  answersUploadable = true,
  lang
}: {
  scopeId: string
  principal: boolean
  allowedExams: string[]
  canViewAllExams?: boolean
  canViewMinutes?: boolean
  pregradingExamUrls: PregradingExamUrls
  examReviewRequired: boolean
  examsDeletable: boolean
  answersUploadable?: boolean
  lang: Language
}) {
  return (
    <I18nextProvider i18n={i18next(lang)}>
      <PregradingExamUrlsContext.Provider value={pregradingExamUrls}>
        <PregradingExams
          scopeId={scopeId}
          principal={principal}
          allowedExams={allowedExams}
          canViewAllExams={canViewAllExams}
          canViewMinutes={canViewMinutes}
          examReviewRequired={examReviewRequired}
          examsDeletable={examsDeletable}
          answersUploadable={answersUploadable}
        />
      </PregradingExamUrlsContext.Provider>
    </I18nextProvider>
  )
}
