import classNames from 'classnames'
import { differenceInCalendarDays } from 'date-fns'
import React, { useContext } from 'react'
import { localDateStringWithWeekdayAndYear } from '../common/client-utils-commonjs'
import { Language } from '../common/types'
import { GradingProgress } from './grading-progress'
import { ExamPregradingStatus, MinutesAccess, PregradingExamUrls } from './types'
import { useTranslation } from 'react-i18next'
import { PregradingExamUrlsContext } from './pregrading'
import { deleteJson, postJson } from '../common/utils'
import { HeldExamMinutesLink } from './held-exam-minutes-link'

export const HeldExam = ({
  canBePregraded,
  eventDate,
  uploaded,
  title,
  schoolAnonCode,
  answerPapers,
  answers,
  autogradedScores,
  teacherGradingCompleted,
  teacherGradingProgress,
  teacherGradingFinishedProgress,
  principal,
  examHasGrader,
  pregradingScores,
  pregradingFinishedCount,
  pregradingDeadlines,
  isAllowedToView,
  isAllowedToPregrade,
  examReviewRequired,
  examsDeletable,
  heldExamDeletionDate,
  setHeldExams,
  showDeleted,
  hasMinutes,
  heldExamUuid,
  minutesAccess = 'none'
}: ExamPregradingStatus & {
  schoolId: string
  principal: boolean
  examHasGrader: boolean
  isAllowedToView: boolean
  isAllowedToPregrade: boolean
  examReviewRequired: boolean
  examsDeletable: boolean
  heldExamDeletionDate?: string
  setHeldExams: React.Dispatch<React.SetStateAction<ExamPregradingStatus[]>>
  showDeleted: boolean
  hasMinutes?: boolean
  heldExamUuid: string
  minutesAccess?: MinutesAccess
}) => {
  const { t, i18n } = useTranslation()
  const pregradingExamUrls = useContext<PregradingExamUrls>(PregradingExamUrlsContext)
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

  const isNotDeleted = !heldExamDeletionDate
  const minutesViewUrl = pregradingExamUrls.minutesView?.(heldExamUuid)
  const canSeeRow = isAllowedToView || minutesAccess !== 'none'

  return (
    <tr
      className={classNames(
        heldExamDeletionDate && !showDeleted ? 'deleted-row' : '',
        heldExamDeletionDate ? 'show-deleted' : '',
        {
          disabled: !canSeeRow
        }
      )}>
      <td className="examDate">{localDateStringWithWeekdayAndYear({ date: eventDate, showWeekday: true, lang })}</td>
      <td className="examName">{title}</td>
      <td className="schoolAnonCode">{schoolAnonCode}</td>
      {minutesAccess === 'minutes-only' && (
        <td className="findings-and-minutes">
          <div className="findings-and-minutes-container">
            <HeldExamMinutesLink hasMinutes={hasMinutes} minutesViewUrl={minutesViewUrl} />
          </div>
        </td>
      )}
      {minutesAccess !== 'minutes-only' && (
        <>
          <td className="students">
            <div className="students-container">
              <i className="fa-solid fa-user" />
              <span data-testid="answer-papers-count">{answerPapers}</span>
              <i className="fa-regular fa-square" />
              <span data-testid="pregradable-answer-count">{pregradableAnswerCount}</span>
            </div>
          </td>

          <td className="progress">
            {examHasGrader || teacherGradingProgress > 0 || !principal ? (
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
              <span className="grading-done">{t('sa.pregrading_ready')}</span>
            )}
          </td>

          {canSeeRow ? (
            <>
              <td className="grading-links">
                <div className="grading-links-container">
                  {isAllowedToView &&
                    isNotDeleted &&
                    (isAllowedToPregrade && canBePregraded ? (
                      <a className="button" href={pregradingExamUrls.grading(schoolAnonCode)}>
                        {t('sa.held_exam_grade')}
                      </a>
                    ) : (
                      <>
                        <a href={pregradingExamUrls.grading(schoolAnonCode)}>{t('sa.held_exam_submitted')}</a>

                        {examReviewRequired && isAllowedToPregrade && (
                          <a className="button" href={pregradingExamUrls.reviewAnswers(schoolAnonCode)}>
                            {t('sa.held_return')}
                          </a>
                        )}
                      </>
                    ))}
                </div>
              </td>

              {minutesAccess === 'grading-and-minutes' && (
                <td className="findings-and-minutes">
                  <div className="findings-and-minutes-container">
                    <HeldExamMinutesLink hasMinutes={hasMinutes} minutesViewUrl={minutesViewUrl} />
                  </div>
                </td>
              )}
            </>
          ) : (
            <td colSpan={1 + (examsDeletable ? 1 : 0)}>
              <div className="not-allowed-exam">
                <i>{t('sa.pregrading.no_access')}</i>
              </div>
            </td>
          )}

          {canSeeRow && examsDeletable && (
            <td>
              <a
                className={classNames({ delete: !heldExamDeletionDate })}
                onClick={onToggleDeleteAnswers}
                data-testid={heldExamDeletionDate ? 'undelete-exam' : 'delete-exam'}>
                {heldExamDeletionDate ? (
                  <i className="fa-solid fa-rotate-left" />
                ) : (
                  <i className="fa-regular fa-trash-can" />
                )}
              </a>
            </td>
          )}
        </>
      )}
    </tr>
  )
}
