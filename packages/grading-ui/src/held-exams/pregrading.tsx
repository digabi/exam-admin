import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { PregradingExams } from './pregrading-exams'
import { Language, RoleType } from '../common/types'
import i18next from '../locales/i18n'
import { PregradingExamUrls, PregradingExamUrlsContextData } from './types'
import '../../less/grading-exams.less'

export const PregradingExamUrlsContext = React.createContext<PregradingExamUrlsContextData>(
  {} as PregradingExamUrlsContextData
)

export function Pregrading({
  scopeId,
  roleType,
  allowedExams,
  pregradingExamUrls,
  examReviewRequired = false,
  examsDeletable = false,
  lang
}: {
  scopeId: string
  roleType: RoleType
  allowedExams: string[]
  pregradingExamUrls: PregradingExamUrls
  examReviewRequired: boolean
  examsDeletable: boolean
  lang: Language
}) {
  return (
    <I18nextProvider i18n={i18next(lang)}>
      <PregradingExamUrlsContext.Provider value={pregradingExamUrls}>
        <PregradingExams
          scopeId={scopeId}
          roleType={roleType}
          allowedExams={allowedExams}
          examReviewRequired={examReviewRequired}
          examsDeletable={examsDeletable}
        />
      </PregradingExamUrlsContext.Provider>
    </I18nextProvider>
  )
}
