import { debounce } from 'lodash'
import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getScoreRegExp } from '../common/score-regexp'
import { postJson } from '../common/utils'
import { ExpandableText } from './ExpandableText'
import { postScoreUpdateState } from './post-score-utils'
import {
  GradingExamAndScores,
  LocalizeKeyWithOptions,
  PostPreGradingScoreResponse,
  AnswerSearchResultDetails
} from './types'
import { GradingUrlsContext } from './grading-view'
import { useTranslation } from 'react-i18next'

interface Props {
  result: AnswerSearchResultDetails
  answerSearchTerm: string
  noteSearchTerm: string
  examAndScores: GradingExamAndScores
  setExamAndScores: Dispatch<SetStateAction<GradingExamAndScores | undefined>>
  setLocalizedError: Dispatch<SetStateAction<LocalizeKeyWithOptions | undefined>>
}

export const AnswerSearchResult = ({
  result,
  answerSearchTerm,
  noteSearchTerm,
  examAndScores,
  setExamAndScores,
  setLocalizedError
}: Props) => {
  const {
    answerContent,
    censoringScoreValue,
    schoolAnonCode,
    studentAnonIdentifier,
    answerId,
    versionNumber,
    maxScore,
    questionId,
    displayNumber,
    comment = '',
    userCanScore
  } = result

  const gradingUrls = useContext(GradingUrlsContext)
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const [localScore, setLocalScore] = useState(censoringScoreValue?.toString() ?? '')
  const [localVersionNumber, setLocalVersionNumber] = useState(versionNumber)

  const searchResultRef = React.createRef<HTMLDivElement>()

  const answerFromExamAndScores = examAndScores.students
    .find(s => s.studentAnonIdentifier === studentAnonIdentifier)
    ?.answers.find(a => a.answerId === answerId)

  const versionNumberFromExamAndScores = answerFromExamAndScores?.versionNumber
  const scoreFromExamAndScores = answerFromExamAndScores?.scoreValue

  useEffect(() => {
    if (versionNumberFromExamAndScores !== undefined && versionNumberFromExamAndScores > versionNumber) {
      setLocalVersionNumber(versionNumberFromExamAndScores)
      setLocalScore(scoreFromExamAndScores?.toString() || '')
    }
  }, [versionNumberFromExamAndScores, scoreFromExamAndScores])

  const openAnswer = (type: 'answer' | 'note', wholeTextRef: React.RefObject<HTMLSpanElement>) => {
    setExpanded(true)
    if (type === 'answer' && searchResultRef.current) {
      maybeScrollIntoView(searchResultRef.current, 'start')
    }
    if (type === 'note' && wholeTextRef.current) {
      maybeScrollIntoView(wholeTextRef.current, 'center')
    }
  }

  const maybeScrollIntoView = (ref: HTMLSpanElement, position: 'start' | 'center') => {
    setTimeout(() => {
      const overlapsWindowBottom = ref.getBoundingClientRect().bottom > window.innerHeight
      if (overlapsWindowBottom) {
        ref.scrollIntoView({ behavior: 'smooth', block: position })
      }
    }, 200)
  }

  const onScoreChange = (scoreValue: string) => {
    setLocalScore(scoreValue)
    void debounceAnswerChange(scoreValue)
  }

  const debounceAnswerChange = useCallback(
    debounce((scoreValue: string) => updateIfValidScore(scoreValue), 750),
    [localVersionNumber]
  )

  const answerScorePattern = getScoreRegExp(maxScore)
  const answerScoreRegex = new RegExp(answerScorePattern)

  const updateIfValidScore = async (scoreValue: string) => {
    const newScore = scoreValue === '' ? undefined : Number(scoreValue)
    const previousScore = Number(localScore)
    const isValidScore = answerScoreRegex.test(scoreValue)

    if (isValidScore && previousScore !== newScore) {
      try {
        await postScoreAndUpdateState(scoreValue)
      } catch (error) {
        setLocalizedError({ localizeKey: 'arpa.errors.saving_score_failed' })
      }
    }
  }

  const postScoreAndUpdateState = async (scoreValue: string) => {
    const scoreValueNumber = scoreValue == '' ? null : Number(scoreValue)
    const scoreResponse = await postJson<PostPreGradingScoreResponse>(gradingUrls.postScore('censoring', answerId), {
      scoreValue: scoreValueNumber,
      versionNumber: localVersionNumber + 1
    })
    if (scoreResponse.json) {
      if (scoreValueNumber !== scoreResponse.json.scoreValue) {
        setLocalizedError({ localizeKey: 'arpa.errors.saving_score_failed' })
      } else {
        const shouldUpdateCensoringState = true
        postScoreUpdateState(
          setExamAndScores,
          scoreResponse.json,
          questionId,
          shouldUpdateCensoringState,
          scoreValueNumber
        )
        if (scoreResponse.json.scoreValue !== undefined && scoreResponse.json.versionNumber !== undefined) {
          setLocalScore(scoreResponse.json.scoreValue?.toString() || '')
          setLocalVersionNumber(scoreResponse.json.versionNumber)
        }
      }
    }
    if (scoreResponse.status >= 400) {
      if (scoreResponse.status == 401) {
        window.location.assign('/')
      } else {
        setLocalizedError({ localizeKey: 'arpa.errors.saving_score_failed' })
      }
    }
  }

  const PREVIEW_LENGTH = 160 // keep dividable by 2

  const isAnswerSearchResult =
    answerSearchTerm && !!answerContent?.toLowerCase().includes(answerSearchTerm.toLowerCase())
  const isNoteSearchResult = noteSearchTerm && !!comment?.toLowerCase().includes(noteSearchTerm.toLowerCase())

  const isExpandableAnswer = answerContent.length > (isAnswerSearchResult ? PREVIEW_LENGTH : PREVIEW_LENGTH / 2)
  const isExpandableNote = !!comment && comment.length > PREVIEW_LENGTH

  return (
    <div key={studentAnonIdentifier} className={`search-result ${expanded ? 'expanded' : ''}`} ref={searchResultRef}>
      <div className="search-result-details">
        <div className="search-result-details-half">
          <input
            className="scorePoints"
            value={localScore}
            onFocus={() => isExpandableAnswer && setExpanded(true)}
            onChange={e => void onScoreChange(e.target.value)}
            inputMode="numeric"
            disabled={!userCanScore}
            pattern={answerScorePattern}
            maxLength={2}
          />
          <span className="max-score">max {maxScore} p.</span>
          <Link
            to={gradingUrls.navigateToAnswer(
              'censoring',
              schoolAnonCode,
              studentAnonIdentifier.toString(),
              displayNumber
            )}
            title={t('sa.answer_search.show_in_score_table')}
            className="go-to-scoretable">
            <i className="fa fa-table-cells-large" />
            <span data-testid="question-display-number">
              {t('sa.answer_search.question_abbr')} {displayNumber}
            </span>
          </Link>
        </div>
        <div className="search-result-details-half">
          <i className="fa fa-school" />
          <div className="school-anon-code">{schoolAnonCode}</div>
          <i className="fa fa-user" />
          <div className="student-uuid">{studentAnonIdentifier}</div>
        </div>
      </div>

      <div className={`answer-and-note ${expanded ? 'expanded' : ''}`}>
        {expanded && (
          <a className="close-result" onClick={() => setExpanded(!expanded)}>
            <i className="fa fa-arrow-up" />
            <span className="toggle-text">{t('sa.answer_search.collapse_answer')}</span>
          </a>
        )}

        <span className="answer-content">
          <ExpandableText
            text={answerContent}
            answerSearchTerm={answerSearchTerm}
            expanded={expanded}
            isExpandable={isExpandableAnswer}
            previewTextLength={isAnswerSearchResult ? PREVIEW_LENGTH : PREVIEW_LENGTH / 2}
            oneLine={false}
            openAnswer={ref => openAnswer('answer', ref)}
          />
        </span>

        {comment && (
          <div className="note-content">
            <i className="fa fa-comment" />
            <ExpandableText
              text={comment}
              answerSearchTerm={noteSearchTerm}
              expanded={expanded}
              isExpandable={isExpandableNote}
              previewTextLength={PREVIEW_LENGTH}
              oneLine={!isNoteSearchResult && !expanded}
              openAnswer={ref => openAnswer('note', ref)}
            />
          </div>
        )}

        {expanded && (
          <a className="close-result" onClick={() => setExpanded(false)}>
            <i className="fa fa-arrow-up" />
            <span className="toggle-text">{t('sa.answer_search.collapse_answer')}</span>
          </a>
        )}
      </div>
    </div>
  )
}
