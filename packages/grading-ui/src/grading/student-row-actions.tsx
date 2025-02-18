import React, { useContext } from 'react'
import {
  GradingExamAndScores,
  GradingStudent,
  isEmptyAnswer,
  SetExamAndScores,
  SetLocalizedError,
  SetStudentEdited
} from './types'
import { postJson } from '../common/utils'
import { GradingContext, GradingUrlsContext } from './grading-view'
import { totalScoreDifferenceFor } from './grading-student-row'
import { useTranslation } from 'react-i18next'

type StudentRowActionsProps = {
  student: GradingStudent
  setStudentEdited?: SetStudentEdited
  examAndScores: GradingExamAndScores
  setExamAndScores: SetExamAndScores
  setLocalizedError: SetLocalizedError
}

export function StudentRowActions({
  student,
  setStudentEdited = () => {},
  examAndScores,
  setExamAndScores,
  setLocalizedError
}: StudentRowActionsProps) {
  const { lastName, firstNames, studentAnonIdentifier, studentUuid, answerPaperId, scoreDifferenceAcknowledgedBy } =
    student
  const studentAnonIdentifierOrName = lastName ? `${firstNames ?? ''} ${lastName}` : studentAnonIdentifier
  const { user } = useContext(GradingContext)
  const gradingUrls = useContext(GradingUrlsContext)
  const { t } = useTranslation()
  const censorId = user?.user?.censorId ?? ''
  const skipPregradingKey = student.skipPregrading ? 'arpa.skip_pregrading_revert' : 'arpa.skip_pregrading'
  const totalScoreDifference = totalScoreDifferenceFor(student)

  return (
    <div className="overlay-wrapper">
      <div id="disabled-background" onClick={() => setStudentEdited(undefined)}>
        <div className="studentRowActions">
          {lastName ? (
            <>
              <div
                className="pregrading-text"
                dangerouslySetInnerHTML={{
                  __html: t(skipPregradingKey, { studentAnonIdentifierOrName })
                }}
              />
              <div className="buttons">
                <button
                  className="button"
                  onClick={() => {
                    const skipPregrading = !student.skipPregrading
                    setStudentEdited(undefined)
                    toggleSkipAnswerPaper(
                      gradingUrls.toggleSkipAnswerPaper!,
                      answerPaperId,
                      skipPregrading,
                      studentUuid,
                      examAndScores.exam.schoolAnonCode,
                      setExamAndScores,
                      setLocalizedError
                    )
                  }}>
                  {student.skipPregrading ? t('arpa.skip_pregrading_button_revert') : t('arpa.skip_pregrading_button')}
                </button>
              </div>
            </>
          ) : (
            <>
              {t('arpa.censor.mark_student_to_2nd_round_label', {
                studentAnonIdentifierOrName
              })}
              <div className="buttons">
                <button
                  className="button"
                  onClick={() => {
                    markStudentTo2ndRound(
                      gradingUrls.postAnswerPaperToSecondRound!,
                      answerPaperId,
                      setExamAndScores,
                      setLocalizedError,
                      censorId
                    )
                    setStudentEdited(undefined)
                  }}>
                  {t('arpa.censor.mark_student_to_2nd_round_button')}
                </button>
                {totalScoreDifference && (
                  <button
                    className="button"
                    onClick={() => {
                      setStudentEdited(undefined)
                      toggleScoreDifferenceAcknowledgement(
                        gradingUrls.toggleAcknowledgeScoreDifference!,
                        studentUuid,
                        answerPaperId,
                        censorId,
                        scoreDifferenceAcknowledgedBy === null,
                        setExamAndScores,
                        setLocalizedError
                      )
                    }}>
                    {t(
                      scoreDifferenceAcknowledgedBy === null
                        ? 'arpa.censor.hide_score_difference'
                        : 'arpa.censor.show_score_difference'
                    )}
                  </button>
                )}
              </div>
            </>
          )}
          <a
            href=""
            className="close"
            onClick={e => {
              e.preventDefault()
              setStudentEdited(undefined)
            }}>
            ×
          </a>
        </div>
      </div>
    </div>
  )
}

function markStudentTo2ndRound(
  postAnswerPaperToSecondRound: (answerPaperId: number) => string,
  answerPaperId: number,
  setExamAndScores: SetExamAndScores,
  setLocalizedError: SetLocalizedError,
  censorId: string
) {
  void (async () => {
    const response = await postJson<{ updatedAnswerIds: number[] }>(postAnswerPaperToSecondRound(answerPaperId))
    if (response.json) {
      const { updatedAnswerIds } = response.json
      setExamAndScores(previousState => {
        if (!previousState) {
          return previousState
        }
        const examAndScoresCopy = { ...previousState }

        for (const updatedAnswerId of updatedAnswerIds) {
          const answerCopy = examAndScoresCopy.students
            .flatMap(student => student.answers)
            .find(a => a.answerId == updatedAnswerId)
          if (answerCopy) {
            // the endpoint cannot be used to other than sending to second round
            answerCopy.censoring!.censoringState = 'waiting_for_second'
            answerCopy.userCanScore = answerCopy.censoring!.scores.some(
              score => score.censorId !== censorId && score.censoringRound == 1
            )
          }
        }
        return examAndScoresCopy
      })
    }
    if (response.status >= 400) {
      setLocalizedError({ localizeKey: 'arpa.errors.problem' })
    }
  })()
}

function toggleScoreDifferenceAcknowledgement(
  toggleAcknowledgeScoreDifference: (endpoint: string, answerPaperId: number) => string,
  studentUuid: string,
  answerPaperId: number,
  censorId: string,
  acknowledge: boolean,
  setExamAndScores: SetExamAndScores,
  setLocalizedError: SetLocalizedError
) {
  const endpoint = acknowledge ? 'acknowledge-score-difference' : 'unacknowledge-score-difference'

  void (async () => {
    const response = await postJson(toggleAcknowledgeScoreDifference(endpoint, answerPaperId))
    if (response.status >= 400) {
      setLocalizedError({ localizeKey: 'arpa.errors.problem' })
    } else {
      setExamAndScores(previousState => {
        if (!previousState) {
          return previousState
        }
        const examAndScoresCopy = { ...previousState }
        const studentCopy = examAndScoresCopy.students.find(s => s.studentUuid === studentUuid)
        if (studentCopy) {
          studentCopy.scoreDifferenceAcknowledgedBy = acknowledge ? censorId : null
        }
        return examAndScoresCopy
      })
    }
  })()
}

function toggleSkipAnswerPaper(
  toggleSkipAnswerPaper: (schoolAnonCode: string, answerPaperId: number) => string,
  answerPaperId: number,
  skipPregrading: boolean,
  studentUuid: string,
  schoolAnonCode: string,
  setExamAndScores: SetExamAndScores,
  setLocalizedError: SetLocalizedError
) {
  void (async () => {
    const response = await postJson(toggleSkipAnswerPaper(schoolAnonCode, answerPaperId), {
      skipPregrading
    })
    if (response.status >= 400) {
      setLocalizedError({ localizeKey: 'arpa.errors.saving_skip_pregrading_failed' })
    } else {
      setExamAndScores(previousState => {
        if (!previousState) {
          return previousState
        }
        const examAndScoresCopy = { ...previousState }
        const s = examAndScoresCopy.students.find(s => s.studentUuid == studentUuid)
        const disabledStudentAnswers = s?.answers.map(ans => {
          if (isEmptyAnswer(ans)) {
            return {}
          }
          return { ...ans, userCanScore: !skipPregrading }
        })
        if (s) {
          s.skipPregrading = skipPregrading
          s.answers = disabledStudentAnswers ?? s.answers
        }
        return examAndScoresCopy
      })
    }
  })()
}
