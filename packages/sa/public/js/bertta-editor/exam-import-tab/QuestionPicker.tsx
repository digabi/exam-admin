import React, { useEffect, useState } from 'react'
import {
  Attachment,
  BerttaExam,
  doReq,
  ErrorObject,
  ErrorResponse,
  FilterOptionsResponse,
  Language,
  listOf,
  parse,
  QuestionResponse,
  QuestionRow,
  removeNamespaces,
  replaceUuid,
  ResponseError,
  SetAttachments,
  Translations
} from '../util'
import './QuestionPicker.less'
import _ from 'lodash'
import { PublicExamPicker } from './PublicExamPicker'
import PublicExamFilters, { ExamFilterQuery } from './PublicExamFilters'
import { ExamList, ExamListExams } from './ExamList'

export type ImportQuestionData = {
  questions: {
    [key: string]: QuestionRow[]
  }
}

export const QuestionPicker = (props: {
  examUuid: string
  loadQuestions: () => Promise<QuestionResponse>
  loadPublicQuestions: (filterQuery: ExamFilterQuery) => Promise<QuestionResponse>
  loadFilterOptions: () => Promise<FilterOptionsResponse>
  getExam: (examUuid?: string) => Promise<BerttaExam>
  attachmentsUrl: string
  xmlDocument: XMLDocument | undefined
  setMasteredXmlForCopy: (state: { xml: XMLDocument | string | null; importUrl: string }) => void
  doSaveDebounced: (name: string, preSaveFn: () => XMLDocument) => Promise<void>
  setError: (errorObject: ErrorObject) => void
  setAttachments: SetAttachments
  t: Translations
  defaultExamLanguage: Language
}) => {
  const {
    loadQuestions,
    loadPublicQuestions,
    loadFilterOptions,
    getExam,
    attachmentsUrl,
    xmlDocument,
    setMasteredXmlForCopy,
    doSaveDebounced,
    setError,
    setAttachments,
    examUuid,
    t,
    defaultExamLanguage
  } = props
  const [isFetching, setIsFetching] = useState<boolean>(false)
  const [questionData, setQuestionData] = useState<ImportQuestionData | null>(null)
  const [exams, setExams] = useState<{ [key: string]: QuestionRow[] }>({})
  const [importExamUuid, setImportExamUuid] = useState('')
  const [publicExams, setPublicExams] = useState<boolean>(false)
  const [searchText, setSearchText] = useState<string>('')
  const [filterQuery, setFilterQuery] = useState<ExamFilterQuery | null>(null)

  useEffect(() => {
    let isCancelled = false
    void (async function () {
      if (!publicExams) {
        setFilterQuery(null)
      }
      setIsFetching(true)
      const q = await getQuestions(examUuid)
      if (q && !isCancelled) {
        setQuestionData(q)
        setExams(q.questions)
      }
      setIsFetching(false)
    })()
    return () => {
      setIsFetching(false)
      isCancelled = true
    }
  }, [publicExams, filterQuery])

  useEffect(() => {
    setSearchText('')
  }, [publicExams])

  async function getQuestions(examUuid: string) {
    try {
      const { questions } = await (publicExams ? loadPublicQuestions(filterQuery!) : loadQuestions())
      delete questions[examUuid] // remove current exam from the list

      return {
        questions
      }
    } catch (err) {
      setError({ title: t.error.connection_error, message: err instanceof Error ? err.message : '' })
      return null
    }
  }

  async function loadExam(examUuid: string, hash: string): Promise<string | void> {
    try {
      if (examUuid !== importExamUuid) {
        const response = await getExam(examUuid)
        setMasteredXmlForCopy({
          xml: response.masteredXml ? parse(response.masteredXml) : 'No mastered XML',
          importUrl: replaceUuid(attachmentsUrl, examUuid)
        })
        if (response.contentXml && exams) {
          const parsed = parse(response.contentXml)
          const questions = listOf('section > question', parsed)
          const allQuestions = questionData?.questions
          questions.forEach((q, i) => {
            const xmlElement = removeNamespaces(q.outerHTML)
            if (allQuestions?.[examUuid]) allQuestions[examUuid][i].xml_element = xmlElement
            if (exams[examUuid]) exams[examUuid][i].xml_element = xmlElement
          })
        }
        return setImportExamUuid(examUuid)
      }
      if (hash) {
        document.location.hash = hash
      } else {
        document.querySelector('.preview')!.scrollTop = 0
      }
    } catch (err) {
      const error = err as ErrorResponse
      setMasteredXmlForCopy({ xml: error.message.toString(), importUrl: '' })
    }
  }

  function addAttachments(attachmentNames: string[], examUuid: string): Promise<Attachment[]> {
    return Promise.all(
      attachmentNames.map(attachmentName => {
        const missingAttachment = { displayName: attachmentName, missing: true } as Attachment
        if (!attachmentName) return missingAttachment
        return doReq<Attachment>(
          'POST',
          `${attachmentsUrl}/copyFrom/${examUuid}/${encodeURIComponent(attachmentName)}`
        ).catch((err: ResponseError) => {
          if (err.status == 404) return missingAttachment
          throw err
        })
      })
    )
  }

  // workaround function to get rather exotic attachment names from copied xml_element right
  function decodeAttachmentName(attachmentName: string) {
    const tmpTextarea = document.createElement('textarea')
    tmpTextarea.innerHTML = attachmentName
    return tmpTextarea.value
  }

  async function insertQuestion(questionRow: QuestionRow, t: Translations): Promise<void> {
    if (!xmlDocument) return
    const sections = xmlDocument.querySelectorAll('section')
    const lastSection = sections.item(sections.length - 1)
    if (!lastSection) {
      setError({ title: t.error.general_error, message: t.no_sections_found })
      return
    }

    if (!questionRow.xml_element) await loadExam(questionRow.exam_uuid, questionRow.id)
    if (!questionRow.xml_element) {
      setError({ title: t.error.question_import_error, message: t.bad_question })
      return
    }

    const attachmentNames = _.uniq(
      [...questionRow.xml_element.matchAll(/src="([^"]*)"/gi)].map(s => decodeAttachmentName(s[1]))
    )

    const attachments = await addAttachments(attachmentNames, questionRow.exam_uuid)

    function prepareQuestionXml() {
      const renameAttachment = (attachmentName: string, newAttachmentName: string, xml: string) =>
        xml.replace(new RegExp(`src="${attachmentName}"`, 'g'), `src="${newAttachmentName}"`)

      const replacer = (attachmentName: string) => (substring: string, group: string) =>
        group == attachmentName ? '' : substring

      const removeMissingAttachment = (attachmentName: string, xml: string) =>
        xml.replace(
          new RegExp(`<e:(?:image|audio|video|file)[^\\/]*src="([^"]+)"[^\\/]*\\/\\s*>`, 'g'),
          replacer(attachmentName)
        )

      return attachments.reduce((xml, attachment) => {
        if (attachment.missing) {
          return removeMissingAttachment(attachment.displayName, xml)
        }
        if (attachment.originalName) {
          return renameAttachment(attachment.originalName, attachment.displayName, xml)
        }
        return xml
      }, questionRow.xml_element)
    }

    try {
      await doSaveDebounced('e:question', () => {
        const xml = prepareQuestionXml()
        setAttachments(att => _.uniqBy(att.concat(attachments.filter(a => !a.missing)), a => a.displayName))
        questionRow.inserted = true
        lastSection.insertAdjacentHTML('beforeend', xml)
        return xmlDocument
      })
    } catch (e) {
      questionRow.inserted = false
      const message = (e as ErrorResponse).message
      setError({ title: t.error.question_import_error, message })
    }
  }

  function convertToExamList(all: { [key: string]: QuestionRow[] }): ExamListExams {
    return Object.values(all).map(e => {
      const firstQuestion = e[0]
      const isPublicExam = !!firstQuestion.examinationCode
      return {
        examUuid: firstQuestion.exam_uuid,
        title: firstQuestion.title,
        questions: e,
        creationDate: new Date(firstQuestion.creation_date),
        ...(isPublicExam ? { examinationCode: firstQuestion.examinationCode } : {})
      }
    })
  }

  const hits = exams ? Object.keys(exams).reduce((acc, key) => exams[key].length + acc, 0) : 0

  const examList = convertToExamList(exams)
  return (
    <div className="questionPickerContainer basicContainer">
      <div className="searchOptions">
        <PublicExamPicker publicExams={publicExams} setPublicExams={setPublicExams} t={t} />
        {publicExams && (
          <PublicExamFilters
            t={t}
            questionData={questionData}
            defaultExamLanguage={defaultExamLanguage}
            setFilterQuery={setFilterQuery}
            loadFilterOptions={loadFilterOptions}
          />
        )}
        <input
          className="search"
          type="text"
          onChange={e => setSearchText(e.target.value)}
          value={searchText}
          placeholder={t.search.text}
          data-test-selector="search"
          autoFocus={true}
        />
      </div>
      {isFetching ? (
        <div className="question-picker-load-wait" />
      ) : (
        <>
          {hits == 0 && <div>{t.search.noResults}</div>}
          {hits > 0 && (
            <ExamList
              exams={examList}
              selectedExamUuid={importExamUuid}
              t={t}
              searchText={searchText}
              loadExam={loadExam}
              insertQuestion={insertQuestion}
            />
          )}
        </>
      )}
    </div>
  )
}
