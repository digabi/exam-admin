import React, { useEffect } from 'react'
import '@digabi/exam-engine-core/dist/main.css'
import { createRoot } from 'react-dom/client'
import * as i18n from '../i18n'
import { useLanguage } from '../page-banner/page-banner'
import { ExamAnswer, parseExam, Results, Score } from '@digabi/exam-engine-core'
import { CopyOfExamPaperExam } from '@digabi/grading-ui/lib/grading/types'
import '../../../less/print-results.less'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin' })
  if (!response.ok) {
    throw new Error(`Fetch failed for ${path}`)
  }
  return (await response.json()) as Promise<T>
}

i18n.init(() => {
  const examContainer = createRoot(document.getElementById('print-results')!)
  examContainer.render(<PrintResults />)
})

type ResultsData = {
  exam: CopyOfExamPaperExam
  answersAndScores: {
    answers: ExamAnswer[]
    scores: Score[]
    gradingText?: string
    answerPaperId: string
    studentName: string
  }[]
}

function getHeldExamUuidFromURL() {
  const locationPath = window.location.pathname
  const printResultsRegex = RegExp('/.*/print-results/(.*)$', 'i')
  const parts = locationPath.match(printResultsRegex)
  return parts ? parts[1] : undefined
}

function getWithoutEmailSearchParam() {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('withoutEmail') ?? undefined
}

function PrintResults() {
  const language = useLanguage()
  const [resultsData, setResultsData] = React.useState<ResultsData>()
  const heldExamUuid = getHeldExamUuidFromURL()

  useEffect(() => {
    const withoutEmail = getWithoutEmailSearchParam()
    const fetchResultsData = async () => {
      const resultsData = await fetchJson<ResultsData>(
        `/exam-api/grading/results/${heldExamUuid}${withoutEmail ? `?withoutEmail=${withoutEmail}` : ''}`
      )
      setResultsData(resultsData)
    }

    void fetchResultsData()
  }, [heldExamUuid])

  useEffect(() => {
    if (resultsData) {
      window.print()
    }
  }, [resultsData])
  if (!resultsData) {
    return <></>
  }

  const doc = parseExam(resultsData.exam.contentXml)
  type ExamExtraData = { examUuid: string; heldExamUuid: string }
  const resolveExamContentURI = (exam: ExamExtraData) => (name: string) =>
    `/exam-api/exams/${heldExamUuid}/attachments/${encodeURIComponent(name)}`
  return (
    <>
      {resultsData.answersAndScores.map(as => (
        <div className="answerPaper" key={as.answerPaperId}>
          <h1>{as.studentName}</h1>
          <Results
            answers={as.answers}
            attachmentsURL={''}
            doc={doc}
            language={`${language}-FI`}
            gradingStructure={resultsData.exam.gradingStructure}
            scores={as.scores}
            resolveAttachment={resolveExamContentURI}
            isPreviewPage={false}
            singleGrading={true}
            gradingText={as.gradingText}
          />
        </div>
      ))}
    </>
  )
}
