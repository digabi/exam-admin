import { useParams } from 'react-router-dom'
import { StudentAnonIdentifier } from './student-anon-identifier'
import { ExamCopyLink } from './exam-copy-link'
import { AutogradedScores } from './autograded-scores'
import { TotalScore } from './total-score'
import React, { Dispatch, SetStateAction, useContext } from 'react'
import classNames from 'classnames'
import { GradingContext, GradingUrlsContext } from './grading-view'
import { GradingExamAndScores, GradingStudent, SetExamAndScores, SetStudentEdited } from './types'
import { GridScoreCell } from './grid-score-cell'

type PregradingStudentRowProps = {
  student: GradingStudent
  examAndScores: GradingExamAndScores
  studentEdited?: string
  setStudentEdited: SetStudentEdited
  setExamAndScores: SetExamAndScores
  setRowsToMarkFinished: Dispatch<SetStateAction<string[]>>
  showMarkGradingFinishedUI: boolean
  index: number
}

export function PregradingStudentRow({
  student,
  studentEdited,
  setStudentEdited,
  examAndScores,
  index,
  setRowsToMarkFinished,
  showMarkGradingFinishedUI
}: PregradingStudentRowProps) {
  const { lastName, firstNames, studentUuid, regStudentUuid, isHidden, answers } = student
  const { schoolExamAnonCode, studentCode } = useParams()
  const { user, rowsToMarkFinished, unfinishedStudentsAndAnswers, markOnlySelectedGradesFinished } =
    useContext(GradingContext)
  const gradingUrls = useContext(GradingUrlsContext)

  const href = gradingUrls.getStudentResults!(schoolExamAnonCode!, regStudentUuid)
  const selected = Number(studentCode) === student.studentAnonIdentifier
  const someAnswersCannotBeScored = answers.some(answer => answer.answerId && !answer.userCanScore)
  const someAnswerIsScored = answers.some(answer => answer.answerId && answer.pregrading?.scoreValue != undefined)
  const isPrincipal = user?.roles?.some(role => role.roleType == 'PRINCIPAL') ?? false
  const actionsDisabled =
    !examAndScores.exam.canBePregraded || (someAnswersCannotBeScored && !student.skipPregrading) || someAnswerIsScored
  const rowSelected = rowsToMarkFinished.includes(studentUuid)

  return (
    <tr
      id={studentUuid}
      className={classNames('student', {
        selected,
        rowSelected: showMarkGradingFinishedUI && markOnlySelectedGradesFinished && rowSelected
      })}>
      <td className="studentName">
        <span className="studentIndex">{index + 1}.</span>
        {isHidden ? (
          <>
            {lastName}, {firstNames}
          </>
        ) : (
          <a href={href}>
            {lastName}, {firstNames}
          </a>
        )}
      </td>
      <td className="select-for-marking-finished">
        {showMarkGradingFinishedUI && (
          <input
            type="checkbox"
            checked={rowSelected}
            disabled={!unfinishedStudentsAndAnswers?.flatMap(i => i.studentUuid).includes(studentUuid)}
            onChange={() => {
              if (rowSelected) {
                setRowsToMarkFinished(rowsToMarkFinished.filter(c => c !== studentUuid))
              } else {
                setRowsToMarkFinished([...rowsToMarkFinished, studentUuid])
              }
            }}
          />
        )}
      </td>
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
        showActions={isPrincipal}
      />

      {answers.map((answer, i) => (
        <GridScoreCell
          key={answer.questionId || `${studentUuid}_${i}`}
          answer={answer}
          student={student}
          isPregrading
        />
      ))}
      <AutogradedScores student={student} examAndScores={examAndScores} />
      <TotalScore student={student} examAndScores={examAndScores} />
    </tr>
  )
}
