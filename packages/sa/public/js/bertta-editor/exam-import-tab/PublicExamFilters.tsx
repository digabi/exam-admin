import React, { useEffect, useState } from 'react'
import { FilterOptionsResponse, Translations } from '../util'
import { ExamType } from '@digabi/grading-ui/lib/grading/types'
import { ImportQuestionData } from './QuestionPicker'
import './PublicExamFilters.less'

interface PublicExamFiltersProps {
  t: Translations
  defaultExamLanguage: string
  questionData: ImportQuestionData | null
  setFilterQuery: React.Dispatch<React.SetStateAction<ExamFilterQuery | null>>
  loadFilterOptions: () => Promise<FilterOptionsResponse>
}

export type ExamFilterQuery = {
  examCode: string
  examType: string
  examinationCode: string
  examLanguage: string
}

const PublicExamFilters: React.FC<PublicExamFiltersProps> = ({
  t,
  defaultExamLanguage,
  setFilterQuery,
  loadFilterOptions
}) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>()
  const [selectedExamCode, setSelectedExamCode] = useState<string>('')
  const [selectedExamType, setSelectedExamType] = useState<string>('')
  const [selectedExaminationCode, setSelectedExaminationCode] = useState<string>('')
  const [selectedExamLanguage, setSelectedExamLanguage] = useState<string>('')

  useEffect(() => {
    let isCancelled = false
    void (async function () {
      const options = await loadFilterOptions()
      if (options && !isCancelled) {
        setFilterOptions(options)
        if (options.examCodes.length) {
          const sortedExamTitles = getSortedExamTitleOptions(options)
          setSelectedExamCode(sortedExamTitles[0].key)
        }
      }
    })()
    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    setFilterQuery(prevValue => {
      if (selectedExamCode === '' && prevValue === null) {
        return null
      }

      return {
        examCode: selectedExamCode,
        examType: selectedExamType,
        examinationCode: selectedExaminationCode,
        examLanguage: selectedExamLanguage
      }
    })
  }, [selectedExamCode, selectedExamType, selectedExaminationCode, selectedExamLanguage])

  function examTypeTranslated(examType: ExamType | '') {
    switch (examType) {
      case 'normal':
        return t.search.examType.normal
      case 'visually-impaired':
        return t.search.examType.visually_impaired
      case 'hearing-impaired':
        return t.search.examType.hearing_impaired
      default:
        return ''
    }
  }

  function select(
    options: (string | { key: string; value: string })[],
    value: string,
    setSelection: React.Dispatch<React.SetStateAction<string>>,
    localizationObject?: Record<string, string>
  ) {
    return (
      <select
        value={value}
        onChange={e => {
          setSelection(() => e.target.value)
        }}
      >
        {options.map(option => {
          const key = typeof option == 'string' ? option : option.key
          const value = typeof option == 'string' ? option : option.value
          return (
            <option key={key} value={key || ''}>
              {localizationObject ? localizationObject[value] : value}
            </option>
          )
        })}
      </select>
    )
  }

  if (!filterOptions) {
    return <></>
  }

  function getSortedExamTitleOptions(filterOptions: FilterOptionsResponse) {
    return filterOptions.examCodes
      .map(examCode => ({
        key: examCode,
        value:
          filterOptions.examTitles[`${examCode}@${defaultExamLanguage}`] ??
          filterOptions.examTitles[
            `${examCode}@${filterOptions.examLanguages.find(lang => lang !== defaultExamLanguage && lang !== '')}`
          ] ??
          examCode
      }))
      .sort((a, b) => (a.value > b.value ? 1 : -1))
  }

  const examTypeOptions = filterOptions.examTypes
    .map(examType => ({ key: examType, value: examTypeTranslated(examType) ?? examType }))
    .sort((a, b) => (a.key === '' || (a.key === 'normal' && b.key !== '') ? -1 : 1))

  return (
    <div className="publicExamFilters">
      <div className="filter">
        <span className="selectTitle exam">{t.search.exam}:</span>{' '}
        {select(getSortedExamTitleOptions(filterOptions), selectedExamCode, setSelectedExamCode)}
      </div>
      <div className="filter">
        <span className="selectTitle period">{t.search.period}:</span>{' '}
        {select(filterOptions.examinationCodes, selectedExaminationCode, setSelectedExaminationCode)}
      </div>
      <div className="filter">
        <span className="selectTitle examType">{t.search.examType.title}:</span>{' '}
        {select(examTypeOptions, selectedExamType, setSelectedExamType)}
      </div>
      <div className="filter">
        <span className="selectTitle language">{t.search.language}:</span>{' '}
        {select(filterOptions.examLanguages, selectedExamLanguage, setSelectedExamLanguage, t.search.languages)}
      </div>
    </div>
  )
}

export default PublicExamFilters
