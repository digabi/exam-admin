import { ExamCopyActionBar } from './action-bar'
import { parseExam, Results, Score, ExamAnswer } from '@digabi/exam-engine-core'
import React, { useEffect, useState } from 'react'
import { CopyOfExamPaperExam } from './types'
import i18next from '../locales/i18n'
import { I18nextProvider } from 'react-i18next'
import { getJson } from '../common/utils'
import { ErrorKey, FloatingError } from '../common/floating-error'

import '../../less/grading.less'
import { Language } from '../common/types'

export function ExamCopy<ExamExtraData>(props: {
  getExam: () => string
  getStudentAnswers: () => string
  resolveAttachment: (exam: CopyOfExamPaperExam & ExamExtraData) => (filename: string) => string
  examContent: (exam: CopyOfExamPaperExam & ExamExtraData) => string
  attachmentsContent: (exam: CopyOfExamPaperExam & ExamExtraData) => string
  returnToGrid: (exam: CopyOfExamPaperExam & ExamExtraData) => string
  language: Language
  hideActionBar?: boolean
  singleGrading?: boolean
}) {
  const [examCopyData, setExamCopyData] = useState<{
    exam: CopyOfExamPaperExam & ExamExtraData
    answersAndScores: { answers: ExamAnswer[]; scores: Score[]; gradingText?: string }
  }>()
  const [error, setError] = useState<ErrorKey | null>(null)

  useEffect(() => {
    async function getData() {
      const [exam, answersAndScores] = await Promise.all([
        getJson<CopyOfExamPaperExam & ExamExtraData>(props.getExam()),
        getJson<{ answers: ExamAnswer[]; scores: Score[]; gradingText?: string }>(props.getStudentAnswers())
      ])
      if (!exam.json || exam.status >= 400 || !answersAndScores.json || answersAndScores.status >= 400) {
        setError('sa.errors.answers_fetch_error')
      } else {
        if (exam.json.contentXml) {
          setExamCopyData({ exam: exam.json, answersAndScores: answersAndScores.json })
        } else {
          setError('sa.errors.answers_missing_xml_error')
        }
      }
    }
    void getData()
  }, [])

  if (!examCopyData) {
    return (
      <I18nextProvider i18n={i18next(props.language)}>
        <FloatingError currentError={error} showButtons={false} />
      </I18nextProvider>
    )
  }

  const exam = examCopyData.exam
  const doc = parseExam(exam.contentXml)

  return (
    <I18nextProvider i18n={i18next(props.language)}>
      {!props.hideActionBar && (
        <div id="fixed-pos-wrapper" className="is_scoring">
          <ExamCopyActionBar
            navigate={url => document.location.assign(url)}
            examContentUrl={props.examContent(exam)}
            attachmentContentUrl={props.attachmentsContent(exam)}
            returnToGridUrl={props.returnToGrid(exam)}
          />
        </div>
      )}
      <div id="results">
        <Results
          answers={examCopyData.answersAndScores.answers}
          attachmentsURL={''}
          doc={doc}
          language={`${examCopyData.exam.language || props.language}-FI`}
          gradingStructure={exam.gradingStructure}
          scores={examCopyData.answersAndScores.scores}
          resolveAttachment={props.resolveAttachment(exam)}
          isPreviewPage={false}
          singleGrading={!!props.singleGrading}
          gradingText={examCopyData.answersAndScores.gradingText}
        />
      </div>
    </I18nextProvider>
  )
}
