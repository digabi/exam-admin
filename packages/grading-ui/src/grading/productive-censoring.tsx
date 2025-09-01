import React, { useContext, useEffect, useState } from 'react'
import { ProductiveGradingScoreList } from './productive-grading-score-list'
import { getJson } from '../common/utils'
import ErrorDialog from './error-dialog'
import { UserData } from '../common/types'
import { LocalizeKeyWithOptions } from './types'
import { GradingUrlsContext } from './grading-view'
import { useTranslation } from 'react-i18next'

/*
 * @deprecated Use productive-censoring.tsx from sa-yo for now
 */
export interface Answer {
  answerCount: number
  answerText: string
  examUuid: string
  language: string
  score: number | null
  shortCode: string
  examType: string
}

/*
 * @deprecated Use productive-censoring.tsx from sa-yo for now
 */
export interface FullAnswer extends Answer {
  ordinal: number
}

/*
 * @deprecated Use productive-censoring.tsx from sa-yo for now
 */
export interface ExamQuestion {
  displayNumber: number
  examCode: string
  examTitle: string
  id: number
  maxScore: number
  type: string
}

const idsFromUri = ({ examPathIndex, questionPathIndex }: { examPathIndex: number; questionPathIndex: number }) => {
  const pathSegments = window.location.pathname.split('/')
  return pathSegments.length > 4
    ? {
        examCode: pathSegments[examPathIndex],
        questionId: parseInt(pathSegments[questionPathIndex], 10)
      }
    : {}
}

function examTypeForUI(examType: string) {
  switch (examType) {
    case 'normal':
      return ''
    case 'visually-impaired':
      return 'NV'
    case 'hearing-impaired':
      return 'KV'
    default:
      return ''
  }
}

/*
 * @deprecated Use productive-censoring.tsx from sa-yo for now
 */
export const ProductiveCensoring = ({ PageBanner }: { PageBanner: JSX.Element }) => {
  const gradingUrls = useContext(GradingUrlsContext)
  const { t } = useTranslation()
  const [loading, setLoading] = useState<boolean>(true)
  const [language, setLanguage] = useState<string>('')
  const [answers, setAnswers] = useState<FullAnswer[]>([])
  const [examQuestion, setExamQuestion] = useState<ExamQuestion>({} as ExamQuestion)
  const [localizedError, setLocalizedError] = useState<LocalizeKeyWithOptions | undefined>()

  const { questionId, examCode } = idsFromUri({ examPathIndex: 3, questionPathIndex: 5 })

  const updateAnswerScore = (params: { examUuid: string; answerText: string; newScore: number | null }) => {
    const { examUuid, answerText, newScore } = params
    setAnswers(previousAnswers => {
      const answersCopy = [...previousAnswers]
      const answerIndex = answersCopy.findIndex(i => i.answerText === answerText && i.examUuid === examUuid)
      if (answerIndex != -1) {
        answersCopy[answerIndex].score = newScore ?? null
      }
      return answersCopy
    })
  }

  useEffect(() => {
    let isCancel = false
    const getUser = async () => {
      await getJson<UserData>(gradingUrls.getUser())
    }
    getUser().catch(() => {
      if (!isCancel) {
        setLocalizedError({ localizeKey: 'arpa.errors.problem', options: { logoutButton: true } })
      }
    })
    return () => {
      isCancel = true
    }
  }, [])

  const handleResponseErrors = (res: { json: object | null; status: number }) => {
    if (res.status >= 400) {
      if (res.status == 404) {
        const href = window.location.href
        window.location.replace(href.substring(0, href.lastIndexOf('/')))
      } else {
        setLocalizedError({ localizeKey: 'arpa.errors.problem', options: { logoutButton: true } })
      }
    }
  }

  useEffect(() => {
    let isCancel = false
    const fetchExamQuestion = async () => {
      if (!examCode || !questionId) {
        return
      }
      const question = await getJson<ExamQuestion>(gradingUrls.getExamQuestion!(examCode, questionId))
      setLoading(false)
      if (question.json) {
        setExamQuestion(question.json)
        document.title = `${question.json.displayNumber}. ${question.json.examTitle.replace(/(FI|SV) – /g, '')}`
      }
      setLoading(false)
      handleResponseErrors(question)
    }

    fetchExamQuestion().catch(() => {
      if (!isCancel) {
        setLocalizedError({ localizeKey: 'arpa.errors.problem', options: { logoutButton: true } })
      }
    })
    return () => {
      isCancel = true
    }
  }, [])

  useEffect(() => {
    let isCancel = false
    const fetchAnswers = async () => {
      if (!examCode || !questionId) {
        return
      }
      const answers = await getJson<Answer[]>(gradingUrls.getCorrectAnswers!(examCode, questionId))
      if (answers.json) {
        const fullAnswers = answers.json.map((i, index) => ({
          ...i,
          ordinal: index + 1,
          examType: examTypeForUI(i.examType),
          score: i.score
        }))
        return setAnswers(fullAnswers)
      }
      setLoading(false)
      handleResponseErrors(answers)
    }
    fetchAnswers().catch(() => {
      if (!isCancel) {
        setLocalizedError({ localizeKey: 'arpa.errors.problem', options: { logoutButton: true } })
      }
    })
    return () => {
      isCancel = true
    }
  }, [])

  const censorOrSchoolUrlPart = () => location.pathname.split('productivegrading')[0]

  if (loading) {
    return <div style={{ padding: '1rem' }}>{t('sa.censor.loading')}</div>
  }

  return (
    <div id="fixed-pos-wrapper">
      {localizedError && (
        <ErrorDialog
          err={{ localizeKey: localizedError.localizeKey, options: { showReload: true, ...localizedError.options } }}
        />
      )}
      {PageBanner}
      <div className="content">
        <div className="goBack">
          <a className="returnToEvents" href={`${censorOrSchoolUrlPart()}grading`}>
            {t('arpa.return_to_exams')}
          </a>
        </div>
        {/* REMEMBER TO SET EXAM NAME */}
        <div className="arpa-overview-exam-info">
          <h1>
            <span>{t('arpa.question_label')}</span>{' '}
            <span className="js-exam-question-name">
              {examQuestion.displayNumber} - {examQuestion.examTitle}
            </span>
          </h1>
          <p>{t('sa.productive.page_instructions')}</p>
        </div>
        <input type="checkbox" id="toggle-handled" />{' '}
        <label htmlFor="toggle-handled">{t('sa.productive.hide_handled')}</label>
        <select name="productive-language-filter" autoComplete="off" onChange={e => setLanguage(e.target.value)}>
          <option value="">{t('arpa.exam_language_filter.both')}</option>
          <option value="fi">{t('arpa.exam_language_filter.fi')}</option>
          <option value="sv">{t('arpa.exam_language_filter.sv')}</option>
        </select>
        <table id="productiveScoreTable" className={language}>
          <thead>
            <tr>
              <th className="prodIndex">#</th>
              <th className="examType"></th>
              <th className="prodAnswer">{t('sa.productive.answer_title')}</th>
              <th className="prodCount">{t('sa.productive.count_title')}</th>
              <th className="prodScore">
                <span>{t('sa.productive.scores_title')}</span>{' '}
                <span className="maxScore js-maxScore">(max {examQuestion.maxScore})</span>
              </th>
              <th className="prodCensor">{t('sa.productive.censor_title')}</th>
            </tr>
          </thead>
          <tbody>
            {answers.map((answer, index) => (
              <ProductiveGradingScoreList
                answer={answer}
                key={index}
                maxScore={examQuestion.maxScore}
                isRichText={false}
                questionId={questionId}
                updateAnswerScore={updateAnswerScore}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
