import { StudentAnonIdentifier } from './student-anon-identifier'
import classNames from 'classnames'
import { ExamCopyLink } from './exam-copy-link'
import { AutogradedScores } from './autograded-scores'
import { TotalScore } from './total-score'
import React from 'react'
import { GradingExamAndScores, GradingStudent, SetStudentEdited } from './types'
import { useParams } from 'react-router-dom'
import { GridScoreCell } from './grid-score-cell'
import { useTranslation } from 'react-i18next'

const smallTotalDifferenceThreshold = 7
const bigTotalDifferenceThreshold = 18

type GradingStudentRowProps = {
  examAndScores: GradingExamAndScores
  student: GradingStudent
  studentEdited?: string
  setStudentEdited: SetStudentEdited
}
export function GradingStudentRow({ student, examAndScores, studentEdited, setStudentEdited }: GradingStudentRowProps) {
  const { answers, studentUuid, score } = student
  const totalScoreDifference = totalScoreDifferenceFor(student)

  const incompleteStudent =
    !student.skipPregrading && answers.some(answer => answer.censoring?.censoringState === 'no_score')
  const everyAnswerInFurtherRound =
    answers.length > 0 &&
    answers.every(answer => !['no_score', 'initial_ok'].includes(answer.censoring?.censoringState || ''))
  const someAnswerIsNotGraded = answers.some(answer => answer.censoring?.censoringState === 'no_score')
  const actionsDisabled =
    !examAndScores.exam.censorDistributionDone || everyAnswerInFurtherRound || someAnswerIsNotGraded
  const highlightIsAcked = student.scoreDifferenceAcknowledgedBy !== null
  const { studentCode } = useParams()
  const { t } = useTranslation()
  const selected = Number(studentCode) === student.studentAnonIdentifier
  const canBeHighlighted = !highlightIsAcked && !incompleteStudent && !everyAnswerInFurtherRound
  return (
    <tr
      id={studentUuid}
      className={classNames('student', {
        selected,
        hide: examAndScores.updating && !selected,
        smallDifference: canBeHighlighted && totalScoreDifference == 'smallDifference',
        bigDifference: canBeHighlighted && totalScoreDifference == 'bigDifference'
      })}>
      {examAndScores.areResultsPublishedToKoski && (
        <ExamCopyLink
          exam={examAndScores.exam}
          studentAnonIdentifier={student.studentAnonIdentifier}
          regStudentUuid={student.regStudentUuid}
        />
      )}
      <StudentAnonIdentifier
        student={student}
        studentEdited={studentEdited}
        setStudentEdited={setStudentEdited}
        actionsDisabled={actionsDisabled}
      />
      {answers.map((answer, i) => (
        <GridScoreCell
          key={answer.questionId || `${studentUuid}_${i}`}
          answer={answer}
          student={student}
          isPregrading={false}
        />
      ))}
      <AutogradedScores student={student} examAndScores={examAndScores} />
      <TotalScore student={student} examAndScores={examAndScores} />
      <td className="totalScoreDifference">
        (<span>{t('arpa.pregrading_abbr')}</span> {score})
      </td>
    </tr>
  )
}

export function totalScoreDifferenceFor(student: GradingStudent) {
  const diff = Math.abs(Number(student.score.replace(/\s/g, '')))
  return diff >= bigTotalDifferenceThreshold || student.skipPregrading
    ? 'bigDifference'
    : diff >= smallTotalDifferenceThreshold
      ? 'smallDifference'
      : undefined
}
