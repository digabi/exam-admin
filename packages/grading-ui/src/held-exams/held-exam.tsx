import classNames from 'classnames'
import { differenceInCalendarDays } from 'date-fns'
import React, { useContext } from 'react'
import { localDateStringWithWeekdayAndYear } from '../common/client-utils-commonjs'
import { Language, RoleType } from '../common/types'
import { GradingProgress } from './grading-progress'
import { ExamPregradingStatus, PregradingExamUrls } from './types'
import { useTranslation } from 'react-i18next'
import { PregradingExamUrlsContext } from './pregrading'
import { deleteJson, postJson } from '../common/utils'

export const HeldExam = ({
  canBePregraded,
  eventDate,
  title,
  schoolAnonCode,
  answerPapers,
  answers,
  autogradedScores,
  teacherGradingCompleted,
  teacherGradingProgress,
  teacherGradingFinishedProgress,
  activeRole,
  examHasGrader,
  pregradingScores,
  pregradingFinishedCount,
  pregradingDeadlines,
  isAllowedExam,
  examReviewRequired,
  examsDeletable,
  heldExamDeletionDate,
  setHeldExams,
  showDeleted
}: ExamPregradingStatus & {
  schoolId: string
  activeRole: RoleType
  examHasGrader: boolean
  isAllowedExam: boolean
  examReviewRequired: boolean
  examsDeletable: boolean
  heldExamDeletionDate?: string
  setHeldExams: React.Dispatch<React.SetStateAction<ExamPregradingStatus[]>>
  showDeleted: boolean
}) => {
  const { t, i18n } = useTranslation()
  const pregradingExamUrls = useContext<PregradingExamUrls>(PregradingExamUrlsContext)
  const isPrincipal = activeRole === 'PRINCIPAL'
  const lang = i18n.language as Language
  const pregradableAnswerCount = answers - autogradedScores

  const answersLeftUntilTarget = (target: number) =>
    Math.ceil(target * pregradableAnswerCount - pregradingFinishedCount)

  const deadlineIsTodayAndNotDone = Object.values(pregradingDeadlines).some(deadline => {
    const deadlineisToday = deadline.date ? differenceInCalendarDays(deadline.date, new Date()) === 0 : false
    return deadlineisToday && answersLeftUntilTarget(deadline.target) > 0
  })

  const isLateFromAnyDeadline = Object.values(pregradingDeadlines).some(deadline => {
    const deadlineHasPassed = deadline.date ? differenceInCalendarDays(deadline.date, new Date()) < 0 : false
    return deadlineHasPassed && answersLeftUntilTarget(deadline.target) > 0
  })

  const nextDeadline =
    answersLeftUntilTarget(pregradingDeadlines.intDeadline.target) > 0
      ? pregradingDeadlines.intDeadline
      : pregradingDeadlines.finalDeadline

  function onToggleDeleteAnswers() {
    void (async function () {
      if (examsDeletable) {
        if (heldExamDeletionDate) {
          await postJson<{ heldExamUuid: string }[]>(pregradingExamUrls.undeleteAnswers(schoolAnonCode))
        } else if (window.confirm(t('sa.held_remove_exam_title'))) {
          await deleteJson<{ heldExamUuid: string }[]>(pregradingExamUrls.deleteAnswers(schoolAnonCode))
        } else {
          return
        }
      }

      setHeldExams(currentExams => {
        const newExams = [...currentExams]
        const exam = newExams.find(exam => exam.uuid == schoolAnonCode)
        if (exam) {
          exam.heldExamDeletionDate = exam.heldExamDeletionDate ? undefined : new Date().toISOString()
          return newExams
        }
        return currentExams
      })
    })()
  }

  return (
    <tr
      className={classNames(
        canBePregraded ? 'is_grading-active' : 'is_grading-finished',
        heldExamDeletionDate && !showDeleted ? 'deleted-row' : '',
        heldExamDeletionDate ? 'show-deleted' : '',
        {
          disabled: !isAllowedExam
        }
      )}>
      <td className="examDate">{localDateStringWithWeekdayAndYear({ date: eventDate, showWeekday: true, lang })}</td>
      <td className="examName">{title}</td>
      <td className="schoolAnonCode">{schoolAnonCode}</td>
      <td className="students">{answerPapers}</td>
      <td className="answers" data-testid="pregradable-answer-count">
        {pregradableAnswerCount}
      </td>
      <td className="progress">
        {examHasGrader || teacherGradingProgress > 0 || !isPrincipal ? (
          pregradableAnswerCount === 0 ? (
            t('sa.nothing_to_grade')
          ) : (
            <>
              <GradingProgress
                gradingProgress={teacherGradingProgress}
                label={pregradingScores.toString()}
                gradingCompleted={teacherGradingCompleted}
                testId="pregrading-progress"
                small
              />
              <GradingProgress
                gradingProgress={teacherGradingFinishedProgress}
                label={pregradingFinishedCount.toString()}
                gradingCompleted={teacherGradingFinishedProgress === 100}
                testId="pregrading-finished-progress"
                dateTargets={pregradingDeadlines}
              />
            </>
          )
        ) : (
          <span className="exam-with-no-grader">{t('sa.pregrading.exam_with_no_grader')}</span>
        )}
      </td>
      <td className={classNames('work-left', { late: isLateFromAnyDeadline })} data-testid="next-deadline">
        {teacherGradingFinishedProgress < 100 ? (
          <>
            <span>
              <div className="target-date">
                <div className="date">
                  {localDateStringWithWeekdayAndYear({ date: nextDeadline.date, showWeekday: true, lang })}
                </div>
                {isLateFromAnyDeadline ? (
                  <div className="late">{t('sa.late')}</div>
                ) : (
                  deadlineIsTodayAndNotDone && <div className="late">{t('sa.today')}</div>
                )}
              </div>
            </span>

            <div>
              {t('sa.still_to_be_finished')} <b>{answersLeftUntilTarget(nextDeadline.target)}</b> {t('sa.gradings')}
            </div>
          </>
        ) : (
          <span className="green">✔ {t('sa.pregrading_ready')}</span>
        )}
      </td>
      {isAllowedExam ? (
        <>
          <td className="grading-links">
            {!heldExamDeletionDate && (
              <>
                <a className="button for_grading-active" href={pregradingExamUrls.grading(schoolAnonCode)}>
                  {t('sa.held_exam_grade')}
                </a>
                <a className="for_grading-finished" href={pregradingExamUrls.grading(schoolAnonCode)}>
                  {t('sa.held_exam_submitted')}
                </a>
              </>
            )}
          </td>
          {examReviewRequired && (
            <td className="grading-links">
              {!heldExamDeletionDate && (
                <a className="button for_grading-finished" href={pregradingExamUrls.reviewAnswers(schoolAnonCode)}>
                  {t('sa.held_return')}
                </a>
              )}
            </td>
          )}
          {examsDeletable && (
            <td className="grading-links">
              <a className="button" onClick={onToggleDeleteAnswers}>
                {t(heldExamDeletionDate ? 'sa.undelete' : 'sa.held_remove_exam')}
              </a>
            </td>
          )}
        </>
      ) : (
        <td>
          <div className="not-allowed-exam">
            <i>{t('sa.pregrading.no_access')}</i>
          </div>
        </td>
      )}
    </tr>
  )
}
