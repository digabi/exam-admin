import { QuestionRow, Translations } from '../util'
import React, { useEffect, useState } from 'react'
import _ from 'lodash'
import classNames from 'classnames'
import sanitizeHtml from 'sanitize-html'

type ExamListPrivateExam = {
  title: string
  examUuid: string
  creationDate: Date
  questions: QuestionRow[]
}

type ExamListPublicExam = ExamListPrivateExam & {
  examinationCode: string
}

export type ExamListExams = (ExamListPublicExam | ExamListPrivateExam)[]

export function ExamList({
  exams,
  selectedExamUuid,
  searchText,
  loadExam,
  insertQuestion,
  t
}: {
  selectedExamUuid: string
  searchText: string
  exams: ExamListExams
  loadExam: (examUuid: string, hash: string) => Promise<string | void>
  insertQuestion: (questionRow: QuestionRow, t: Translations) => Promise<void>
  t: Translations
}) {
  const [spinnerActivated, setSpinnerActivated] = useState<{ examUuid: string; questionId: string } | null>(null)
  const [expanded, setExpanded] = useState<string[]>([])
  const [examsWithHighlight, setExamsWithHighlight] = useState<ExamListExams>(exams)

  useEffect(() => {
    if (!searchText) {
      setExpanded([])
      setExamsWithHighlight([])
      return
    }

    const highlightedExams: string[] = []
    const convertedExams = exams.map(exam => {
      const convertedQuestions = exam.questions.map(questionRow => {
        const questionTitleMatch = questionRow.question_title?.toLowerCase().includes(searchText.toLowerCase())
        if (questionTitleMatch) {
          highlightedExams.push(exam.examUuid)
        }
        return {
          ...questionRow,
          question_title: questionTitleMatch ? highlight(questionRow.question_title) : questionRow.question_title,
          matches: questionTitleMatch
        }
      })

      const titleMatch = exam.title?.toLowerCase().includes(searchText.toLowerCase())
      if (titleMatch) {
        highlightedExams.push(exam.examUuid)
      }
      return { ...exam, title: titleMatch ? highlight(exam.title) : exam.title, questions: convertedQuestions }
    })

    setExpanded(highlightedExams)
    setExamsWithHighlight(convertedExams.filter(e => highlightedExams.includes(e.examUuid)))
  }, [searchText])

  if (searchText.length && !examsWithHighlight.length) {
    return <div>{t.search.noResults}</div>
  }

  function sortExams(exams: ExamListExams) {
    return exams.sort((a, b) => {
      if ('examinationCode' in a && 'examinationCode' in b) {
        return a.examinationCode > b.examinationCode ? -1 : 1
      } else {
        return a.creationDate > b.creationDate ? -1 : 1
      }
    })
  }

  function toggleQuestions(examUuid: string) {
    if (expanded.includes(examUuid)) {
      setExpanded(_.without(expanded, examUuid))
    } else {
      setExpanded(expanded.concat(examUuid))
    }
    return false
  }

  function highlight(text: string) {
    return text.replace(new RegExp(`(${searchText.replace('?', '\\?')})`, 'gi'), '<mark>$1</mark>')
  }

  function sanitize(html: string): string {
    return sanitizeHtml(html, { allowedTags: ['mark'] })
  }

  function toggleExamVisibility(examUuid: string) {
    if (examUuid == selectedExamUuid) {
      toggleQuestions(examUuid)
    } else {
      void loadExam(examUuid, '')
      setExpanded(expanded.concat(examUuid))
    }
  }

  const sortedExams = sortExams(searchText ? examsWithHighlight : exams)
  return (
    <>
      {sortedExams.map(exam => (
        <div
          key={`exam${exam.examUuid}`}
          onClick={() => {
            toggleExamVisibility(exam.examUuid)
          }}
          className={classNames('examRow', { selected: exam.examUuid == selectedExamUuid })}
        >
          <div className="examRowHeader">
            <div className="examRowTitle">
              <span dangerouslySetInnerHTML={{ __html: sanitize(exam.title || 'Tehtävä') }} />
              {exam.examUuid == selectedExamUuid && <span className="eye fa fa-eye" />}
            </div>
            <div className="examRowHeaderMargin">
              <span className="created">
                {'examinationCode' in exam ? exam.examinationCode : exam.creationDate.toLocaleDateString()}
              </span>
              <i
                onClick={e => {
                  toggleQuestions(exam.examUuid)
                  e.stopPropagation()
                }}
                className={classNames(
                  'fa',
                  'toggleQuestions',
                  expanded.includes(exam.examUuid) ? 'fa-chevron-down' : 'fa-chevron-up'
                )}
              />
            </div>
          </div>
          {expanded.includes(exam.examUuid) &&
            exam.questions.map((questionRow, qIndex) => (
              <div
                key={`question${exam.examUuid}_${qIndex}`}
                className={classNames('questionRow', {
                  inserted: questionRow.inserted,
                  inserting:
                    spinnerActivated &&
                    spinnerActivated.examUuid === questionRow.exam_uuid &&
                    spinnerActivated.questionId === questionRow.id,
                  matches: questionRow.matches
                })}
                onClick={e => {
                  void loadExam(questionRow.exam_uuid, `question-title-${questionRow.id}`)
                  e.stopPropagation()
                }}
              >
                <span
                  className="rowTitle"
                  dangerouslySetInnerHTML={{
                    __html: sanitize(`${questionRow.id}. ${questionRow.question_title}`)
                  }}
                />
                {questionRow.inserted && <i className="fas fa-check-circle" data-test-selector="inserted" />}
                {!questionRow.inserted && (
                  <i
                    onClick={() => {
                      if (spinnerActivated) return
                      setSpinnerActivated({ examUuid: questionRow.exam_uuid, questionId: questionRow.id })
                      void insertQuestion(questionRow, t).finally(() => setSpinnerActivated(null))
                    }}
                    className={
                      spinnerActivated &&
                      spinnerActivated.examUuid === questionRow.exam_uuid &&
                      spinnerActivated.questionId === questionRow.id
                        ? ''
                        : 'fa fa-plus-circle'
                    }
                    data-test-selector="insert-question"
                  >
                    {spinnerActivated &&
                      spinnerActivated.examUuid === questionRow.exam_uuid &&
                      spinnerActivated.questionId === questionRow.id && <div className="insert-wait" />}
                  </i>
                )}
              </div>
            ))}
        </div>
      ))}
    </>
  )
}
