import React, { useEffect, useRef, useState } from 'react'
import { GradingAnswerType, GradingExamAndScores, GradingRole, SetExamAndScores, SetLocalizedError } from './types'
import { debounce } from 'lodash'
import classNames from 'classnames'
import { postJson } from '../common/utils'
import { useTranslation } from 'react-i18next'

type GradingAnswerCommentProps = {
  gradingRole: GradingRole
  answer: GradingAnswerType
  setExamAndScores: SetExamAndScores
  setLocalizedError: SetLocalizedError
  canBeCommented: boolean
  postCommentUrl: string
}

export function AnswerComment({
  gradingRole,
  answer,
  setExamAndScores,
  setLocalizedError,
  canBeCommented,
  postCommentUrl
}: GradingAnswerCommentProps) {
  const [saved, setSaved] = useState<boolean>(false)
  const { t } = useTranslation()

  const localizedCommentSuffixKey =
    gradingRole === 'pregrading' ? 'arpa.comment_suffix_teacher' : 'arpa.comment_suffix_censor'

  const [newComment, setNewComment] = useState<boolean>(false)
  const answerCommentRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    adjustInitialHeightOfCommentElement()
    setNewComment(false)
  }, [answer.answerId])
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }

    function handleKeyDown(e: KeyboardEvent) {
      const isCtrlI = e.key === 'i' && !e.altKey && e.ctrlKey && !e.metaKey && !e.shiftKey
      if (isCtrlI) {
        if (answer.comment == undefined) {
          setExamAndScores(previousState => updateCommentState(previousState, ''))
          setNewComment(true)
        } else {
          const scoreComment = answerCommentRef.current
          if (scoreComment) {
            scoreComment.focus()
            const contentLength = scoreComment.value.length
            scoreComment.setSelectionRange(contentLength, contentLength)
            scoreComment.scrollIntoView()
          }
        }
      }
    }
  }, [answer])

  return (
    <div className="comment">
      {answer.comment == undefined && !newComment ? (
        canBeCommented && (
          <button
            className="addCommentToAnswer button"
            onClick={() => {
              setExamAndScores(previousState => updateCommentState(previousState, ''))
              setNewComment(true)
            }}>
            {t('arpa.comment_answer')}
          </button>
        )
      ) : (
        <>
          {answer.isProductive && (
            <em data-testid="pregrading-only-for-teachers">{t('sa.pregrading.only_visible_to_teacher')}</em>
          )}
          <label htmlFor="note-textarea">
            <h4>
              {t('arpa.comment')}
              &nbsp;
              <span className="commentSuffix">{t(localizedCommentSuffixKey)}</span>
            </h4>
          </label>
          {(canBeCommented || newComment) && (
            <button
              className="removeComment"
              onClick={() => {
                updateComment(undefined)
                setNewComment(false)
              }}>
              <i className="fa fa-times-circle"></i>
              <span>{t('arpa.remove_comment')}</span>
            </button>
          )}
          {(canBeCommented || answer.comment?.length || newComment) && (
            <textarea
              ref={answerCommentRef}
              spellCheck={false}
              key={answer.answerId}
              id="note-textarea"
              className="scoreComment"
              tabIndex={-1}
              defaultValue={answer.comment}
              autoFocus
              disabled={!canBeCommented}
              onInput={e => {
                setSaved(false)
                adjustHeightOfCommentElement()
                answerCommentChange(e.currentTarget.value, (value?: string) => {
                  updateComment(value)
                  setSaved(true)
                })
              }}
            />
          )}
          <div className={classNames('savedIndicator', { 'savedIndicator--saved': saved, invisible: !saved })}>
            {t('arpa.saved')}
          </div>
        </>
      )}
    </div>
  )

  function updateCommentState(
    previousState?: GradingExamAndScores,
    comment?: string
  ): GradingExamAndScores | undefined {
    if (!previousState) return previousState
    return {
      ...previousState,
      students: previousState.students.map(student => {
        if (student?.answers.find(({ answerId }) => answerId === answer.answerId)) {
          return {
            ...student,
            answers: student.answers.map(studentAnswer => {
              if (studentAnswer.answerId === answer.answerId) {
                return { ...studentAnswer, comment } as GradingAnswerType
              } else return studentAnswer
            })
          }
        } else return student
      })
    }
  }

  function updateComment(valueWithWhitespace?: string) {
    const value = valueWithWhitespace?.trim()
    const postComment = async () => {
      const response = await postJson(postCommentUrl, {
        comment: value ?? null
      })
      if (response.status >= 400) {
        setLocalizedError({ localizeKey: 'arpa.errors.saving_comment_failed' })
      } else {
        setExamAndScores(previousState => updateCommentState(previousState, value))
      }
    }
    postComment().catch(err => {
      setLocalizedError({ localizeKey: 'arpa.errors.saving_comment_failed' })
    })
  }

  function adjustInitialHeightOfCommentElement() {
    const commentElement = document.querySelector<HTMLTextAreaElement>('.scoreComment')
    if (commentElement) {
      commentElement.style.height = `${commentElement.scrollHeight}px`
    }
  }
  function adjustHeightOfCommentElement() {
    const commentElement = document.querySelector<HTMLTextAreaElement>('.scoreComment')
    if (commentElement) {
      const { scrollX, scrollY } = window
      commentElement.style.height = 'auto'
      commentElement.style.height = `${commentElement.scrollHeight}px`
      window.scrollTo(Math.round(scrollX), Math.round(scrollY))
    }
  }
}

const answerCommentChange = debounce((value: string, fn: (value?: string) => void) => fn(value), 1000)
