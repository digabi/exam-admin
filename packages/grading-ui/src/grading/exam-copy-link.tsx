import { useTranslation } from 'react-i18next'
import { GradingExam } from './types'
import React from 'react'

type ExamCopyLinkProps = {
  exam: GradingExam
  regStudentUuid: string
  studentAnonIdentifier: number
}

export function ExamCopyLink({ exam, regStudentUuid, studentAnonIdentifier }: ExamCopyLinkProps) {
  const { t } = useTranslation()
  return (
    <td className="download-pdf-score-link">
      <a
        href={`/grading/exam/${exam.examUuid}/reg-student/${regStudentUuid}/exam-copy`}
        download={`${studentAnonIdentifier}_${exam.examCode}.html`}
        target="_blank"
        title={t('arpa.exam_copy_download')}
        rel="noreferrer">
        <i className="fa fa-download" />
      </a>
    </td>
  )
}
