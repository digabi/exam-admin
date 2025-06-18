import React from 'react'
import '@digabi/exam-engine-core/dist/main.css'
import { createRoot } from 'react-dom/client'
import * as i18n from '../i18n'
import * as sautils from '../sa-utils'
import { ExamCopy } from '@digabi/grading-ui/lib/grading/exam-copy'
import { PageBanner, PageBannerWithoutUser, useLanguage } from '../page-banner/page-banner'
import { useFetchUser } from '../grading/hooks'

i18n.init(() => {
  const examContainer = createRoot(document.getElementById('answers')!)
  examContainer.render(<ExamCopyPage />)
})

function ExamCopyPage() {
  type ExamExtraData = { examUuid: string; heldExamUuid: string }
  const language = useLanguage()
  const userName = useFetchUser()
  const source = new URL(location.href).searchParams.get('source')

  const resolveExamContentURI = (exam: ExamExtraData) => (name: string) =>
    `/exam-api/exams/${exam.examUuid}/attachments/${encodeURIComponent(name)}`
  const token = sautils.getTokenFromURL()
  return (
    <>
      {userName ? <PageBanner userName={userName} /> : <PageBannerWithoutUser />}
      <ExamCopy<ExamExtraData>
        getExam={() => `/exam-api/grading/student/exam/${token}`}
        getStudentAnswers={() => `/exam-api/grading/student/answers/${token}`}
        resolveAttachment={resolveExamContentURI}
        examContent={exam => `/school/preview/${exam.examUuid}`}
        attachmentsContent={exam => `/school/preview/${exam.examUuid}/attachments`}
        returnToGrid={exam => `/school/grading/${exam.heldExamUuid}`}
        language={language}
        hideActionBar={!userName || source === 'returnExams'}
        singleGrading={true}
      />
    </>
  )
}
