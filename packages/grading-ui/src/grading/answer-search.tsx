import { GradingStructureQuestion } from '@digabi/exam-engine-core'
import { format } from 'date-fns'
import { clamp, debounce, max, min } from 'lodash'
import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useState } from 'react'
import { getScoreRegExp } from '../common/score-regexp'
import { useAxiosGet } from '../hooks'
import { AnswerSearchResult } from './answer-search-result'
import { GradingExam, GradingExamAndScores, LocalizeKeyWithOptions, MaxScore, AnswerSearchResultData } from './types'
import { GradingUrlsContext } from './grading-view'
import { useTranslation } from 'react-i18next'

interface Props {
  maxScores: MaxScore[]
  displayNumber?: string
  examUuid: string
  questionIds: GradingStructureQuestion[]
  examDetails: GradingExam
  setExamAndScores: Dispatch<SetStateAction<GradingExamAndScores | undefined>>
  examAndScores: GradingExamAndScores
  setLocalizedError: Dispatch<SetStateAction<LocalizeKeyWithOptions | undefined>>
}

type TargetAnswers = 'scored-by-me' | 'scored-by-many'

export const AnswerSearch = ({
  maxScores,
  displayNumber,
  examUuid,
  questionIds,
  examDetails,
  setExamAndScores,
  examAndScores,
  setLocalizedError
}: Props) => {
  const gradingUrls = useContext(GradingUrlsContext)
  const { i18n, t } = useTranslation()
  const [answerSearchTerm, setAnswerSearchTerm] = useState<string>('')
  const [noteSearchTerm, setNoteSearchTerm] = useState<string>('')
  const [questionSearchNumber, setQuestionSearchNumber] = useState<string>(displayNumber || '')
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<AnswerSearchResultData>({
    totalResultCount: 0,
    slicedData: []
  })
  const [currentMaxScore, setCurrentMaxScore] = useState<number>(1)
  const [scoreValues, setScoreValues] = useState<[number, number]>([0, currentMaxScore])
  const [targetAnswers, setTargetAnswers] = useState<TargetAnswers>('scored-by-me')
  const [get] = useAxiosGet()

  useEffect(() => {
    if (displayNumber && !questionSearchNumber) {
      setQuestionSearchNumber(displayNumber)
    }
  }, [])

  const highestMaxScore = max(maxScores.map(a => a.maxScore)) || 1

  useEffect(() => {
    const maxScoreInSelectedQuestion = maxScores.find(a => a.displayNumber === questionSearchNumber)?.maxScore || 1
    const currentMaxScore = questionSearchNumber ? maxScoreInSelectedQuestion : highestMaxScore
    setCurrentMaxScore(currentMaxScore)
    setScoreValues([0, currentMaxScore])
  }, [questionSearchNumber, highestMaxScore])

  const scoreRangeIsNotMaxRange = scoreValues[0] !== 0 || scoreValues[1] !== currentMaxScore

  const shouldSearch =
    (!!answerSearchTerm || !!noteSearchTerm || scoreRangeIsNotMaxRange) &&
    !isNaN(scoreValues[0]) &&
    !isNaN(scoreValues[1])

  useEffect(() => {
    if (shouldSearch) {
      setLoading(true)
      void searchParametreChange(answerSearchTerm, questionSearchNumber, noteSearchTerm, scoreValues, targetAnswers)
    }
  }, [answerSearchTerm, questionSearchNumber, noteSearchTerm, scoreValues, targetAnswers])

  const doSearch = async (
    answerSearchTerm: string,
    answerNr: string,
    noteSearchTerm: string,
    sliderValues: [number, number],
    targetAnswers: TargetAnswers
  ) => {
    const questionId = questionIds.find(q => q.displayNumber === answerNr)?.id
    const searchResponseData = await get<AnswerSearchResultData>(
      gradingUrls.getAnswerSearchResults!(examUuid),
      0,
      'sa.errors.load_error',
      {
        params: {
          questionId,
          answerContentQuery: answerSearchTerm,
          commentContentQuery: noteSearchTerm,
          minScore: min(sliderValues),
          maxScore: max(sliderValues),
          shouldSearchNextLevelCensors: targetAnswers === 'scored-by-many'
        }
      }
    )
    if (searchResponseData) {
      setSearchResults(searchResponseData)
    } else {
      setSearchResults({ totalResultCount: 0, slicedData: [] })
    }
    setLoading(false)
  }

  const searchParametreChange = useCallback(
    debounce(
      (
        questionSearchNumber: string,
        answerSearchTerm: string,
        noteSearchTerm: string,
        sliderValues: [number, number],
        targetAnswers: TargetAnswers
      ) => doSearch(questionSearchNumber, answerSearchTerm, noteSearchTerm, sliderValues, targetAnswers),
      500
    ),
    []
  )

  const onSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    if (term.length > 1) {
      setLoading(shouldSearch)
      setAnswerSearchTerm(term)
    } else {
      setAnswerSearchTerm('')
    }
  }
  const onNoteSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const commentTerm = e.target.value
    if (commentTerm.length > 1) {
      setLoading(shouldSearch)
      setNoteSearchTerm(commentTerm)
    } else {
      setNoteSearchTerm('')
    }
  }

  const handleScoreValueChange = (value: number, index: number) => {
    const newValues: [number, number] = [...scoreValues]
    newValues[index] = clamp(value, 0, currentMaxScore)
    if (index === 0 && value > newValues[1]) {
      newValues[1] = clamp(value, 0, currentMaxScore)
    }
    if (index === 1 && value < newValues[0]) {
      newValues[0] = clamp(value, 0, currentMaxScore)
    }
    const isNotMaxScoreRange = newValues[0] !== 0 || newValues[1] !== currentMaxScore

    setLoading(shouldSearch && !isNaN(newValues[0]) && !isNaN(newValues[1]) && !isNotMaxScoreRange)
    setScoreValues(newValues)
  }

  const answerScorePattern = getScoreRegExp(currentMaxScore)

  return (
    <>
      <h3>
        {t('sa.answer_search.search_answers_title')}
        <div className="exam-details">
          {examDetails.content.title} ({format(examDetails.eventDate, 'd.M.yyyy')})
        </div>
      </h3>

      <fieldset>
        <div>
          <label htmlFor="question-number">{t('sa.answer_search.question_nr')}</label>

          <select
            id="question-number"
            name="question-number"
            onChange={e => setQuestionSearchNumber(e.target.value)}
            value={questionSearchNumber}>
            <option key="all" value="" label={t('sa.answer_search.any_question_nr', { lang: i18n.language })} />
            {maxScores.map((a, i) => (
              <option key={i} value={a.displayNumber}>
                {a.displayNumber} ({a.maxScore} p.)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="search-term">{t('sa.answer_search.free_text_search')}</label>
          <input
            type="text"
            id="search-term"
            name="search-term"
            onChange={onSearchTermChange}
            placeholder={t('sa.answer_search.search_term_placeholder', { lang: i18n.language })}
            autoFocus={true}
            size={15}
          />
        </div>

        <div>
          <label htmlFor="comment-search-term">{t('sa.answer_search.comment_search')}</label>
          <input
            type="text"
            id="comment-search-term"
            name="comment-search-term"
            onChange={onNoteSearchTermChange}
            placeholder={t('sa.answer_search.search_term_placeholder', { lang: i18n.language })}
            size={15}
          />
        </div>

        <div>
          <label htmlFor="comment-search-term">{t('sa.answer_search.score_search')}</label>
          <input
            type="number"
            value={scoreValues[0]}
            size={3}
            min={0}
            max={currentMaxScore}
            name="min-score"
            onFocus={e => e.target.select()}
            onChange={e => handleScoreValueChange(parseInt(e.target.value), 0)}
            onBlur={e => isNaN(parseInt(e.target.value)) && handleScoreValueChange(0, 0)}
            pattern={answerScorePattern}
          />
          <span className="range-dots">...</span>
          <input
            type="number"
            size={3}
            min={0}
            max={currentMaxScore}
            name="max-score"
            onFocus={e => e.target.select()}
            value={scoreValues[1]}
            pattern={answerScorePattern}
            onBlur={e => isNaN(parseInt(e.target.value)) && handleScoreValueChange(currentMaxScore, 1)}
            onChange={e => handleScoreValueChange(parseInt(e.target.value), 1)}
          />
        </div>

        <div className="search-target first">
          <input
            type="radio"
            id="search-target-my-answers"
            name="search-target"
            value="scored-by-me"
            checked={targetAnswers === 'scored-by-me'}
            onChange={e => setTargetAnswers(e.target.value as TargetAnswers)}
          />
          <label htmlFor="search-target-my-answers">{t('sa.answer_search.search_among_graded_by_you')}</label>
        </div>

        <div className="search-target">
          <input
            type="radio"
            id="search-target-all-answers"
            name="search-target"
            value="scored-by-many"
            checked={targetAnswers === 'scored-by-many'}
            onChange={e => setTargetAnswers(e.target.value as TargetAnswers)}
          />
          <label htmlFor="search-target-all-answers">{t('sa.answer_search.search_among_graded_by_many')}</label>
        </div>
      </fieldset>

      {loading ? (
        <p>{t('sa.answer_search.searching')}</p>
      ) : shouldSearch ? (
        <>
          <WrittenSearchCriteria
            answerSearchTerm={answerSearchTerm}
            noteSearchTerm={noteSearchTerm}
            scoreValues={scoreValues}
            scoreRangeIsNotMaxRange={scoreRangeIsNotMaxRange}
            searchResultCount={searchResults.totalResultCount}
            slicedResultCount={searchResults.slicedData.length}
          />
          <div className={`search-results ${searchResults.slicedData.length > 50 ? 'lots-of-results' : ''}`}>
            {searchResults.slicedData.map(result => (
              <AnswerSearchResult
                key={result.answerId}
                result={result}
                answerSearchTerm={answerSearchTerm}
                noteSearchTerm={noteSearchTerm}
                examAndScores={examAndScores}
                setExamAndScores={setExamAndScores}
                setLocalizedError={setLocalizedError}
              />
            ))}
          </div>
        </>
      ) : (
        <i>{t('sa.answer_search.add_search_term_or_score')}</i>
      )}
    </>
  )
}

const WrittenSearchCriteria = ({
  answerSearchTerm,
  noteSearchTerm,
  scoreValues,
  scoreRangeIsNotMaxRange,
  searchResultCount,
  slicedResultCount
}: {
  answerSearchTerm: string
  noteSearchTerm: string
  scoreValues: [number, number]
  scoreRangeIsNotMaxRange: boolean
  searchResultCount?: number
  slicedResultCount?: number
}) => {
  const { t } = useTranslation()
  const limitedResults = () =>
    slicedResultCount !== searchResultCount ? (
      <span key="limited_results">{t('sa.answer_search.limited_results', { count: slicedResultCount })}</span>
    ) : (
      <span key="limited_results"></span>
    )

  const nResults = () => (
    <b>
      <span data-testid="result-count">{searchResultCount}</span> {t('sa.answer_search.n_results')}
    </b>
  )

  const searchTermCriteria = () =>
    answerSearchTerm && (
      <>
        <label>{t('sa.answer_search.with_search_term')}</label>
        <div className="search-term-value in-answer" data-testid="answer-search-term">{`"${answerSearchTerm}"`}</div>
      </>
    )

  const noteCriteria = () =>
    noteSearchTerm && (
      <>
        <label>{t('sa.answer_search.with_search_term_in_notes')}</label>
        <div className="search-term-value in-note" data-testid="comment-search-term">{`"${noteSearchTerm}"`}</div>
      </>
    )

  const scoreCriteria = () => {
    if (scoreRangeIsNotMaxRange) {
      return (
        <>
          {t('sa.answer_search.with_score')}
          {scoreValues[0] === scoreValues[1] ? (
            <b>{scoreValues[0]}</b>
          ) : (
            <>
              {t('sa.answer_search.between')}
              <b>
                {scoreValues[0]}...{scoreValues[1]}
              </b>
            </>
          )}
        </>
      )
    }
  }

  const criteriaJoinedWithCommas = [nResults(), searchTermCriteria(), noteCriteria(), scoreCriteria()]
    .filter(Boolean)
    .map((criterion, i, arr) => {
      const separator = () => {
        if (arr.length > 2 && i === arr.length - 2) {
          return <>{t('sa.answer_search.and')}</>
        }
        if (i < arr.length - 1) {
          return ', '
        }
      }

      return (
        <span key={i}>
          {criterion}
          {separator()}
        </span>
      )
    })

  return <div className="search-parametres">{criteriaJoinedWithCommas.concat(limitedResults())}</div>
}
