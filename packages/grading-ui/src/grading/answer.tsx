import { Annotation, GradingAnswer } from '@digabi/exam-engine-core'
import classNames from 'classnames'
import React, { memo, MutableRefObject, useContext } from 'react'
import { postJson } from '../common/utils'
import {
  Annotations,
  GradingAnswerType,
  GradingRole,
  isEmptyAnswer,
  SetExamAndScores,
  SetLocalizedError
} from './types'
import { GradingUrlsContext } from './grading-view'
import { useTranslation } from 'react-i18next'

export default memo(Answer)

function Answer(props: {
  innerRef: MutableRefObject<HTMLDivElement | null>
  answer: GradingAnswerType
  gradingRole: GradingRole
  setLocalizedError: SetLocalizedError
  setExamAndScores: SetExamAndScores
  AnswerCommentElement: JSX.Element
  canBeAnnotated: boolean
  showPregradingAnnotations: boolean
}) {
  const {
    innerRef,
    answer,
    gradingRole,
    setLocalizedError,
    setExamAndScores,
    AnswerCommentElement,
    canBeAnnotated,
    showPregradingAnnotations
  } = props

  const gradingUrls = useContext(GradingUrlsContext)
  const { i18n } = useTranslation()

  return (
    <div
      ref={innerRef}
      tabIndex={1}
      id="answer-wrap"
      className={classNames('e-exam', { 'hide-pregrading-annotations': !showPregradingAnnotations })}>
      <GradingAnswer
        answer={answer.content}
        language={`${i18n.language}-FI`}
        isReadOnly={!canBeAnnotated}
        gradingRole={gradingRole}
        annotations={{
          pregrading: showPregradingAnnotations ? answer.pregrading?.metadata?.annotations || [] : [],
          censoring: answer.censoring?.metadata?.annotations || []
        }}
        maxLength={answer.maxLength}
        saveAnnotations={saveAnnotations}
        popupTopMargin={0}
      />
      {AnswerCommentElement}
    </div>
  )

  function filterInvalidAnnotations(annotations: Annotation[]) {
    return annotations.filter(annotation => 'startIndex' in annotation || 'attachmentIndex' in annotation)
  }

  function saveAnnotations(annotations: Annotations) {
    const updateAnnotations = async () => {
      const response = await postJson(gradingUrls.postAnnotation(gradingRole, answer.answerId), {
        metadata: { annotations: filterInvalidAnnotations(annotations[gradingRole]) }
      })
      if (response.status >= 400) {
        setLocalizedError({ localizeKey: 'arpa.errors.saving_metadata_failed' })
      } else {
        setExamAndScores(previousState => {
          if (!previousState) return previousState
          return {
            ...previousState,
            students: previousState.students.map(student => ({
              ...student,
              answers: student.answers.map(a => {
                if (!isEmptyAnswer(a) && a.answerId === answer.answerId && a[gradingRole]) {
                  return {
                    ...a,
                    [gradingRole]: {
                      ...a[gradingRole],
                      metadata: { annotations: filterInvalidAnnotations(annotations[gradingRole]) }
                    }
                  }
                }
                return { ...a }
              })
            }))
          }
        })
      }
    }
    updateAnnotations().catch(() => {
      setLocalizedError({ localizeKey: 'arpa.errors.saving_metadata_failed' })
    })
  }
}
