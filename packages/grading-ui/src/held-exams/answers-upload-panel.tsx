import axios, { AxiosError } from 'axios'
import React, { Fragment, useContext, useEffect, useRef, useState } from 'react'
import { useAxiosGet } from '../hooks'
import { LoadingSpinner } from '../common/loading-spinner'
import { useTranslation } from 'react-i18next'
import { PregradingExamUrls } from './types'
import { PregradingExamUrlsContext } from './pregrading'

export const AnswersUploadPanel = ({
  schoolId,
  isPrincipal,
  loadHeldExams
}: {
  schoolId: string
  isPrincipal: boolean
  loadHeldExams: (schoolId: string) => Promise<void>
}) => {
  const pregradingExamUrls = useContext<PregradingExamUrls>(PregradingExamUrlsContext)
  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<UploadErrorKey | null>(null)
  const [uploadResult, setUploadResult] = useState<SchoolWithAnswer[]>([])
  const [uploading, setUploading] = useState<boolean>(false)
  const [get] = useAxiosGet()
  const { t } = useTranslation()
  const [unmappedStudents, setUnmappedStudents] = useState<UnMappedStudent[]>([])

  useEffect(() => void loadUnmappedStudents(schoolId), [isPrincipal, schoolId])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    uploadRef.current?.click()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.name.trim() === '') return
    setUploading(true)
    setUploadError(null)
    setUploadResult([])

    const formData = new FormData()
    formData.append('examUpload', file)
    axios
      .post<SchoolWithAnswer[]>(pregradingExamUrls.uploadAnswers(schoolId), formData, {
        headers: {
          enctype: 'multipart/form-data'
        }
      })
      .then(async response => {
        setUploadResult(response.data)
        await loadHeldExams(schoolId)
        await loadUnmappedStudents(schoolId)
        return
      })
      .catch((error: AxiosError) => {
        setUploadError(getUploadErrorMessageKey(error))
      })
      .finally(() => {
        if (uploadRef.current) {
          uploadRef.current.value = ''
        }
        setUploading(false)
      })
  }

  async function loadUnmappedStudents(schoolId: string) {
    if (!isPrincipal) return setUnmappedStudents([])
    const data = await get<UnMappedStudent[]>(pregradingExamUrls.unmappedStudents(schoolId))
    if (data) {
      setUnmappedStudents(data)
    }
  }

  return (
    <div id="answers-upload-main-panel">
      <div id="answers-upload">
        <LoadingSpinner loading={uploading} />
        <form id="answers-upload-panel" name="answers-upload" method="POST" action="">
          <p className="import-answers-instructions">{t('sa.import_answers_instructions')}</p>
          <div className="answers-upload-button-wrapper">
            <label htmlFor="examUpload">
              <button className="upload-button" disabled={uploading} onClick={e => handleClick(e)} tabIndex={0}>
                {t('sa.import_answers')}
              </button>
            </label>
            {uploading && (
              <div className="upload-takes-long-container">
                <span className="upload-spinner"></span>
                <span className="notification-text">{t('sa.answer_upload_takes_time')}</span>
              </div>
            )}
          </div>
          <input
            id="examUpload"
            className="upload-input"
            ref={uploadRef}
            type="file"
            name="examUpload"
            accept=".meb"
            onChange={e => handleFile(e)}
          />
          {uploadError && <div className="upload-error error-notice">{t(uploadError)}</div>}
          {uploadResult.length > 0 && <UploadNotification schools={uploadResult} />}
        </form>
      </div>
      {unmappedStudents.length > 0 && <UnMappedStudents students={unmappedStudents} />}
    </div>
  )
}

type SchoolWithAnswer = {
  gradingSchoolId: string | null
  gradingSchoolName: string | null
  answerCountsByExam: {
    examUuid: string
    examTitle: string
    answerCount: number
    isDeleted?: boolean
    isDuplicate?: boolean
  }[]
}

type UnMappedStudent = {
  lastName: string
  firstNames: string
  ssn: string
  examTitles: string[]
}

type UploadErrorKey =
  | 'sa.errors.no_answer_papers'
  | 'sa.errors.grading_started'
  | 'sa.errors.exam_meb'
  | 'sa.errors.payload_too_large'
  | 'sa.errors.exam_structure_not_imported'
  | 'sa.errors.incorrect_exam'
  | 'sa.errors.invalid_file'
  | 'sa.errors.answer_upload_failed'

function getUploadErrorMessageKey(error: AxiosError): UploadErrorKey {
  const data = error?.response?.data as { errorCode: 'exam_structure_not_imported' }
  switch (error?.response?.status) {
    case 422:
      return 'sa.errors.no_answer_papers'
    case 428:
      return 'sa.errors.grading_started'
    case 415:
      return 'sa.errors.exam_meb'
    case 413:
      return 'sa.errors.payload_too_large'
    case 409:
      return `sa.errors.${data.errorCode || 'incorrect_exam'}`
    case 400:
      return 'sa.errors.invalid_file'
    default:
      return 'sa.errors.answer_upload_failed'
  }
}

const UploadNotification = ({ schools }: { schools: SchoolWithAnswer[] }) => {
  const { t } = useTranslation()
  const divRef = useRef<HTMLDivElement>(null)
  const [styles, setStyles] = useState({ opacity: 0, maxHeight: '0', overflow: 'hidden' })
  const count = schools
    .filter(school => school.gradingSchoolId == null)
    .flatMap(school => school.answerCountsByExam)
    .reduce((sum, e) => sum + e.answerCount, 0)

  const filteredSchools = schools.filter(school => school.gradingSchoolId != null)

  useEffect(() => {
    const scrollHeight = divRef.current?.scrollHeight ?? 0
    setStyles(prev => ({ ...prev, maxHeight: `${scrollHeight}px` }))

    setTimeout(() => {
      setStyles(prev => ({
        ...prev,
        opacity: 1,
        transition: 'opacity 1s, max-height 1s' // Transition effects
      }))
    }, 100)
  }, [])

  const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    setStyles(prev => ({
      ...prev,
      opacity: 0,
      maxHeight: '0'
    }))
  }

  // ugly hack to decide whether or not to show answer-visibility-info (isDuplicate is defined)
  const answersVisibilityInfo = filteredSchools.some(school =>
    school.answerCountsByExam.some(exam => exam.isDuplicate != undefined)
  )

  return (
    <div
      className="answers-uploaded-notification"
      ref={divRef}
      style={{ ...styles, transition: 'max-height 0.1s ease-out, opacity 0.1s ease-in' }}>
      <div className="upload-notification-title">{t('sa.answers_uploaded.title')}</div>
      {count > 0 && <div className="without-school">{t('sa.answers_uploaded.no_registration', { count })}</div>}
      <table>
        {filteredSchools.map(({ gradingSchoolId, gradingSchoolName, answerCountsByExam }) => (
          <tbody key={gradingSchoolId}>
            <tr className="school-title">
              <td colSpan={2}>
                {gradingSchoolName ? gradingSchoolName : <span>{t('sa.answers_uploaded.unknown_school')}</span>}:
              </td>
            </tr>
            {answerCountsByExam.map(({ examUuid, examTitle, answerCount, isDeleted, isDuplicate }) => (
              <Fragment key={examUuid}>
                <tr>
                  <td className="exam-title">{examTitle}</td>
                  <td className="answer-count">{answerCount}</td>
                </tr>
                {(isDeleted || isDuplicate) && (
                  <tr>
                    <td colSpan={2}>
                      {isDuplicate && (
                        <span className="error-notice">{t('sa.answers_uploaded.answers_uploaded_already')}</span>
                      )}
                      {isDeleted && (
                        <div
                          className="js-answers-uploaded-to-deleted"
                          dangerouslySetInnerHTML={{
                            __html: t('sa.answers_uploaded.answers_uploaded_to_deleted_instructions')
                          }}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        ))}
      </table>
      {answersVisibilityInfo && (
        <div className="answers-visibility-info"> {t('sa.answers_uploaded.answers_visibility_info')}</div>
      )}
      <button id="answers-uploaded-close" onClick={handleCloseClick}>
        {t('sa.answers_uploaded.close')}
      </button>
      <div className="clear-both" />
    </div>
  )
}

const UnMappedStudents = ({ students }: { students: UnMappedStudent[] }) => {
  const { t } = useTranslation()
  return (
    <div className="unmapped-students js-unmapped-students">
      <h3>{t('sa.unmapped_students.title')}</h3>
      <table className="basic-table">
        <thead>
          <tr>
            <th>{t('sa.unmapped_students.name')}</th>
            <th>{t('sa.unmapped_students.ssn')}</th>
            <th>{t('sa.unmapped_students.exam')}</th>
          </tr>
        </thead>
        <tbody>
          {students.map(({ lastName, firstNames, ssn, examTitles }) => (
            <tr key={ssn}>
              <td>
                {lastName}, {firstNames}
              </td>
              <td>{ssn}</td>
              <td>
                {examTitles.map((title, index) => (
                  <div key={index}>{title}</div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p
        className="js-unmapped-students-instructions"
        dangerouslySetInnerHTML={{ __html: t('sa.unmapped_students.instructions') }}
      />
    </div>
  )
}
