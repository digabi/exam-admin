import React, { useContext } from 'react'
import { GradingRole, GradingStudent } from './types'
import _ from 'lodash'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale/fi'
import { GradingContext, GradingUrlsContext } from './grading-view'
import { useTranslation } from 'react-i18next'

export default ScoreTableInstructions

function ScoreTableInstructions(props: ScoreTableInstructionsProps) {
  return (
    <div className="score-table-instructions">
      <ScoreTableInstructionsByProps {...props} />
    </div>
  )
}

function ScoreTableInstructionsByProps(props: ScoreTableInstructionsProps) {
  const { canBeGraded, gradingRole, allStudentsVisible, students, schoolExamAnonCode } = props
  const maxTimestamp = maxPregradedAtIfAllPregraded(students)
  if (canBeGraded && gradingRole !== 'censoring') {
    return maxTimestamp ? <WaitingPeriod timestamp={maxTimestamp} /> : <GradingInstructions />
  }
  if (gradingRole == 'censoring') {
    return <></>
  }
  if (allStudentsVisible) {
    return <PregadingDownloadInstructions schoolExamAnonCode={schoolExamAnonCode} />
  }
  return <DisqualifiedDownloadInstructions />
}

function PregadingDownloadInstructions(props: { schoolExamAnonCode: string }) {
  const gradingUrls = useContext(GradingUrlsContext)
  const { t } = useTranslation()

  return (
    <>
      <p>{t('arpa.pregrading_export.prefix')}</p>
      <ul>
        <li>
          <a
            href={gradingUrls.exportAnswersCsv!(props.schoolExamAnonCode)}
            target="_self"
            className="download-score-csv-link">
            {t('arpa.pregrading_export.csv_link')}
          </a>{' '}
          <span>{t('arpa.pregrading_export.csv_suffix')}</span>
        </li>
        <li>
          <a
            href={gradingUrls.exportAnswersJson!(props.schoolExamAnonCode)}
            target="_self"
            className="download-score-json-link">
            {t('arpa.pregrading_export.json_link')}
          </a>{' '}
          <span>{t('arpa.pregrading_export.json_suffix')}</span>.
        </li>
      </ul>
    </>
  )
}

function WaitingPeriod({ timestamp }: { timestamp: string }) {
  const { waitingForCensorHours } = useContext(GradingContext)
  const { t } = useTranslation()
  const formatted = format(new Date(timestamp), 'Pp', { locale: fi })
  return (
    <p className="scoring-instruction">
      {t(waitingForCensorHours ? 'arpa.waiting_period' : 'arpa.waiting_period_no_quarantine', {
        timestamp: formatted,
        waitingForCensorHours
      })}
    </p>
  )
}

function GradingInstructions() {
  const { t } = useTranslation()
  return <span className="scoring-instruction">{t('arpa.grading_instruction')}</span>
}

function DisqualifiedDownloadInstructions() {
  const { t } = useTranslation()
  return <p className="js-pregrading-export-disqualified">{t('arpa.pregrading_export.disqualified')}</p>
}

type ScoreTableInstructionsProps = {
  schoolExamAnonCode: string
  canBeGraded: boolean
  allStudentsVisible: boolean
  gradingRole: GradingRole
  students: GradingStudent[]
}

function maxPregradedAtIfAllPregraded(students: GradingStudent[]) {
  const pregradedFinishedAts = students
    .filter(student => !student.skipPregrading)
    .flatMap(student => student.answers)
    .filter(answer => answer.pregrading)
    .map(answer => answer.pregrading!.pregradingFinishedAt)

  if (pregradedFinishedAts.some(at => !at)) {
    return null
  }
  const timeZoneNormalized = pregradedFinishedAts.map(at => new Date(at).toISOString())
  return _.max(timeZoneNormalized)
}
