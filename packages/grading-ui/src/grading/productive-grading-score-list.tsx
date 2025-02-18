import React, { KeyboardEvent, useContext } from 'react'
import { FullAnswer } from './productive-censoring'
import { postJson } from '../common/utils'
import classNames from 'classnames'
import { GradingUrlsContext } from './grading-view'
import { useTranslation } from 'react-i18next'

interface Props {
  maxScore: number
  isRichText: boolean
  answer: FullAnswer
  questionId?: number
  updateAnswerScore: (params: { examUuid: string; answerText: string; newScore: number | null }) => void
}

interface ScoreResponse {
  score: number
  censorShortCode: string
}

export const ProductiveGradingScoreList = ({
  maxScore,
  answer,
  isRichText = false,
  questionId,
  updateAnswerScore
}: Props) => {
  const gradingUrls = useContext(GradingUrlsContext)
  const { t } = useTranslation()
  const { examType, answerCount, answerText, examUuid, language, score, shortCode, ordinal } = answer

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
      const el = e.target as HTMLInputElement
      const row = el.closest('.js-prodRow')!
      const sibling = (e.key === 'ArrowDown' ? row.nextSibling : row.previousSibling) as HTMLInputElement
      const nextScoreCell = sibling?.getElementsByClassName('scorePoints')[0] as HTMLInputElement
      nextScoreCell?.focus()
      nextScoreCell?.select()
    }
  }

  function updateRow(row: HTMLTableRowElement, { score = 0, censorShortCode = '' }) {
    row.classList.toggle('hasScore', score !== 0)
    row.classList.toggle('hasZeroScore', score === 0)
    row.classList.toggle('hasNonZeroScore', score > 0)
    row.getElementsByClassName('prodCensor')[0].innerHTML = censorShortCode
  }

  const onChangeScore = async (target: HTMLInputElement) => {
    const getSavedIndicator = (scorePoint: HTMLInputElement) => scorePoint.parentNode?.querySelector('.savedIndicator')

    if (!questionId) {
      return
    }

    const scoreValue = target.value ? parseInt(target.value, 10) : null
    const row = target.closest('tr')

    getSavedIndicator(target)?.classList.remove('savedIndicator--saved')

    const response = await postJson<ScoreResponse>(gradingUrls.postProductiveScore!(examUuid, questionId), {
      scoreValue,
      answerText
    })
    if (response.json) {
      target.classList.remove('invalid')
      updateAnswerScore({ examUuid, answerText, newScore: scoreValue })
      if (row) {
        updateRow(row, response.json)
      }
      getSavedIndicator(target)?.classList.add('savedIndicator--saved')
    }
    if (response.status >= 400) {
      target.classList.add('invalid')
      getSavedIndicator(target)?.classList.remove('savedIndicator--saved')
    }
  }

  const hasScore = score !== null
  const hasZeroScore = score === 0
  const hasNonZeroScore = score && score > 0

  return (
    <tr
      className={classNames('js-prodRow', language, {
        hasScore,
        hasZeroScore,
        hasNonZeroScore
      })}
      data-answer-text={answerText}>
      <td className="prodIndex">{ordinal}</td>
      <td className="examType">{examType}</td>
      {isRichText ? (
        <td className="prodAnswer answerRichText">{answerText}</td>
      ) : (
        <td className="prodAnswer answerPlainText">{answerText}</td>
      )}
      <td className="prodCount">{answerCount}</td>
      <td className="prodScore">
        <input
          className="scorePoints"
          type="number"
          pattern="\d*"
          data-exam-uuid={examUuid}
          data-answer-text={answerText}
          value={score ?? ''}
          min="0"
          max={maxScore}
          onChange={e => void onChangeScore(e.target)}
          onKeyDown={handleKeyDown}
        />
        <span className="savedIndicator">{t('arpa.saved')}</span>
      </td>
      <td className="prodCensor">{shortCode}</td>
    </tr>
  )
}
