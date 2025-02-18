import React, { useContext, useEffect, useState } from 'react'
import { LoadingSpinner } from '../common/loading-spinner'
import { useAxiosGet } from '../hooks'
import { AnswersUploadPanel } from './answers-upload-panel'
import { formatPregradingStatus } from './format-held-exams'
import { ArpaExamPregradingStatus, ExamPregradingStatus, PregradingExamUrls } from './types'
import { HeldExam } from './held-exam'
import { useTranslation } from 'react-i18next'
import { RoleType } from '../common/types'
import { PregradingExamUrlsContext } from './pregrading'

export const PregradingExams = ({
  scopeId,
  roleType,
  allowedExams,
  examReviewRequired,
  examsDeletable
}: {
  scopeId: string
  roleType: RoleType
  allowedExams: string[]
  examReviewRequired: boolean
  examsDeletable: boolean
}) => {
  const pregradingExamUrls = useContext<PregradingExamUrls>(PregradingExamUrlsContext)
  const [heldExams, setHeldExams] = useState<ExamPregradingStatus[]>([])
  const [examsWithGrader, setExamsWithGrader] = useState<string[]>([])
  const [showDeleted, setShowDeleted] = useState<boolean>(false)
  const [get, loading] = useAxiosGet()
  const { t } = useTranslation()

  const loadHeldExams = async (schoolId: string) => {
    const data = await get<ArpaExamPregradingStatus[]>(pregradingExamUrls.heldExams(schoolId))

    if (data) {
      setHeldExams(formatPregradingStatus(data))
    }
  }

  useEffect(() => {
    void (async () => {
      if (roleType !== 'PRINCIPAL') return setExamsWithGrader([])
      const data = await get<string[]>(pregradingExamUrls.examsWithGrader(scopeId))
      if (data) {
        setExamsWithGrader(data)
      }
    })()
  }, [roleType, scopeId])

  useEffect(() => void loadHeldExams(scopeId), [scopeId])

  const heldExamsWithAllowedInformation = heldExams.map(exam => ({
    ...exam,
    isAllowedExam: allowedExams.includes(exam.examCode.replace(/_X|_E/, '')) || roleType === 'PRINCIPAL'
  }))

  const hasDeadlineDate = heldExamsWithAllowedInformation.some(
    exam => !!exam.pregradingDeadlines.intDeadline.date || !!exam.pregradingDeadlines.finalDeadline.date
  )
  return (
    <div id="exam-grading-tab" className="tab">
      <LoadingSpinner loading={loading} />
      <AnswersUploadPanel schoolId={scopeId} isPrincipal={roleType === 'PRINCIPAL'} loadHeldExams={loadHeldExams} />
      <h3>{t('sa.held_exams')}</h3>
      <p className="info-text">{t('sa.info_text')}</p>
      {examsDeletable && (
        <>
          <input
            type="checkbox"
            id="show-deleted-held-exams"
            className="show-deleted-input"
            onClick={e => setShowDeleted(e.currentTarget.checked)}
          />{' '}
          <label htmlFor="show-deleted-held-exams" className="show-deleted-label" data-i18n="sa.show_deleted">
            {t('sa.show_deleted')}
          </label>
        </>
      )}
      <table id="held-exams" className="is_pregrading held-exams-table basic-table">
        <thead>
          <tr>
            <th className="examDate">{t('sa.yo.exam_date')}</th>
            <th className="examName">{t('sa.held_exam_name')}</th>
            <th className="schoolAnonCode">{t('sa.yo.school_anon_code')}</th>
            <th className="students">{t('sa.students')}</th>
            <th className="answers">{t('sa.held_answers')}</th>
            <th className="progress">
              <div className="pregrading_graded">{t('sa.pre_grading_answers_graded')}</div>
              <div className="pregrading_finished">{t('sa.pre_grading_answers_finished')}</div>
            </th>
            <th className="work-left">{hasDeadlineDate ? t('sa.recommended_deadline') : ''}</th>
            <th className="grading-links" colSpan={1 + (examReviewRequired ? 1 : 0) + (examsDeletable ? 1 : 0)} />
          </tr>
        </thead>
        <tbody>
          {heldExamsWithAllowedInformation.map(exam => (
            <HeldExam
              key={exam.uuid}
              {...exam}
              schoolId={scopeId}
              activeRole={roleType}
              examHasGrader={examsWithGrader.includes(exam.examCode.replace(/_X|_E/, ''))}
              pregradingScores={exam.pregradingScores}
              examReviewRequired={examReviewRequired}
              examsDeletable={examsDeletable}
              setHeldExams={setHeldExams}
              heldExamDeletionDate={exam.heldExamDeletionDate}
              showDeleted={showDeleted}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
