import React, { Dispatch, SetStateAction, useContext } from 'react'
import { MaxScore, ScoreTableProps, UnfinishedGradedAnswer } from './types'
import classNames from 'classnames'
import { useNavigate, useParams } from 'react-router-dom'
import { GradingStudentRow } from './grading-student-row'
import { PregradingStudentRow } from './pregrading-student-row'
import { getJson } from '../common/utils'
import { GradingContext, GradingUrlsContext } from './grading-view'
import { useTranslation } from 'react-i18next'

type ConditionalProps<T extends typeof PregradingStudentRow | typeof GradingStudentRow> =
  T extends typeof PregradingStudentRow
    ? {
        setColumnsToMarkFinished: Dispatch<SetStateAction<string[]>>
        setRowsToMarkFinished: Dispatch<SetStateAction<string[]>>
        showMarkGradingFinishedUI: boolean
        markOnlyMyGradesFinished?: boolean
        unfinishedStudentsAndAnswers?: UnfinishedGradedAnswer[]
      }
    : NonNullable<unknown>

type CommonScoreTableProps<T extends typeof PregradingStudentRow | typeof GradingStudentRow> = ScoreTableProps &
  ConditionalProps<T>

export function PregradingScoreTable(props: CommonScoreTableProps<typeof PregradingStudentRow>) {
  return <ScoreTable {...props} StudentRow={PregradingStudentRow} />
}

export function GradingScoreTable(props: CommonScoreTableProps<typeof GradingStudentRow>) {
  return <ScoreTable {...props} StudentRow={GradingStudentRow} />
}

function ScoreTable(
  props: (CommonScoreTableProps<typeof GradingStudentRow> | CommonScoreTableProps<typeof PregradingStudentRow>) & {
    StudentRow: typeof PregradingStudentRow | typeof GradingStudentRow
  }
) {
  const {
    examAndScores,
    navigateToNextSchool,
    setExamAndScores,
    gradingRole,
    StudentRow,
    studentEdited,
    setStudentEdited,
    showMarkGradingFinishedUI,
    setColumnsToMarkFinished,
    setRowsToMarkFinished
  } = props
  if (!examAndScores) {
    return null
  }
  const {
    areResultsPublishedToKoski,
    scoreAverages,
    autogradingAnswers,
    maxAutogradingScore,
    meanAutogradingScore,
    maxScores,
    students
  } = examAndScores
  const { displayNumber } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { columnsToMarkFinished, markOnlySelectedGradesFinished, unfinishedStudentsAndAnswers } =
    useContext(GradingContext)
  const gradingUrls = useContext(GradingUrlsContext)
  function getFirstAnswerWithNoScore(examUuid: string, questionId: number, displayNumber: string) {
    void (async function () {
      const response = await getJson<{ schoolExamAnonCode: string; studentAnonIdentifier: string }>(
        gradingUrls.getFirstAnswerWithNoScore!(examUuid, questionId)
      )
      if (response.json) {
        const { schoolExamAnonCode, studentAnonIdentifier } = response.json
        navigate(gradingUrls.navigateToAnswer(gradingRole, schoolExamAnonCode, studentAnonIdentifier, displayNumber))
      }
    })()
  }

  function renderDisplayNumberHeader(maxScore: MaxScore) {
    if (gradingRole === 'pregrading') {
      return maxScore.displayNumber
    }
    return (
      <span
        className="clickableScoreHeaderDisplayNumber"
        title={t('arpa.scoreheader_tooltip')}
        onClick={() => getFirstAnswerWithNoScore(examAndScores.exam.examUuid, maxScore.id!, maxScore.displayNumber)}>
        {maxScore.displayNumber}
      </span>
    )
  }

  return (
    <div id="scoreScroller">
      <table id="scoreTable" className={classNames(showMarkGradingFinishedUI ? 'show-grading-ui' : '')}>
        <colgroup>
          <col span={areResultsPublishedToKoski ? 4 : 3} />
          {maxScores.map(i => (
            <col
              key={i.displayNumber}
              className={
                showMarkGradingFinishedUI &&
                columnsToMarkFinished.includes(i.displayNumber) &&
                markOnlySelectedGradesFinished
                  ? 'selected'
                  : ''
              }
            />
          ))}
          <col />
        </colgroup>
        <thead>
          <tr className="questionNumberRow">
            <th className={gradingRole == 'censoring' ? 'exam-quick-links-cell' : ''}>
              {gradingRole == 'censoring' && (
                <div className="exam-quick-links">
                  <a
                    className="js-prev-exam-quick-link exam-quick-link"
                    onClick={e => {
                      e.preventDefault()
                      if (navigateToNextSchool) navigateToNextSchool(-1)
                    }}>
                    <i className="fa fa-backward" />
                  </a>
                  <a className="js-exams-quick-link exam-quick-link" href={gradingUrls.returnToEvents(gradingRole)}>
                    <i className="fa fa-home exam-quick-link-separator" />
                  </a>
                  <a
                    className="js-next-exam-quick-link exam-quick-link"
                    onClick={e => {
                      e.preventDefault()
                      if (navigateToNextSchool) navigateToNextSchool(1)
                    }}>
                    <i className="fa fa-forward" />
                  </a>
                </div>
              )}
            </th>
            {gradingRole === 'pregrading' && <th />}
            <th colSpan={areResultsPublishedToKoski ? 2 : 1} />
            {maxScores.map(score => {
              const columnSelected = columnsToMarkFinished.includes(score.displayNumber)
              return (
                <th
                  key={score.displayNumber}
                  className={classNames('select-for-marking-finished', {
                    columnSelected: showMarkGradingFinishedUI && markOnlySelectedGradesFinished && columnSelected
                  })}>
                  <div className={classNames('wrapper', { selected: score.displayNumber === displayNumber })}>
                    {showMarkGradingFinishedUI && (
                      <input
                        type="checkbox"
                        checked={columnSelected}
                        disabled={
                          !unfinishedStudentsAndAnswers?.flatMap(i => i.displayNumber).includes(score.displayNumber)
                        }
                        onChange={() => {
                          if (columnSelected) {
                            setColumnsToMarkFinished(columnsToMarkFinished.filter(c => c !== score.displayNumber))
                          } else {
                            setColumnsToMarkFinished([...columnsToMarkFinished, score.displayNumber])
                          }
                        }}
                      />
                    )}

                    {renderDisplayNumberHeader(score)}
                    <div className="maxScore">
                      {score.maxScore}
                      &nbsp;
                      <span>{t('arpa.points_suffix')}</span>
                    </div>
                  </div>
                </th>
              )
            })}
            {autogradingAnswers && (
              <th>
                <div className="wrapper totalAutogradingScoreHeader" title={t('arpa.autograded_tooltip')}>
                  <span>{t('arpa.autograded_short_title')}</span>
                  <div className="maxScore">
                    {maxAutogradingScore}
                    &nbsp;
                    <span>{t('arpa.points_suffix')}</span>
                  </div>
                </div>
              </th>
            )}
            <th className="totalScoreHeader">Σ</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => (
            <StudentRow
              key={student.studentUuid}
              examAndScores={examAndScores}
              student={student}
              setExamAndScores={setExamAndScores}
              studentEdited={studentEdited}
              setStudentEdited={setStudentEdited}
              index={index}
              setRowsToMarkFinished={setRowsToMarkFinished}
              showMarkGradingFinishedUI={showMarkGradingFinishedUI}
            />
          ))}
        </tbody>
        <tfoot>
          {scoreAverages && scoreAverages.length > 0 && (
            <tr>
              <td className="meanRowHeader" colSpan={gradingRole === 'pregrading' ? 2 : 1}>
                {t('arpa.scored_average')}
              </td>
              <td colSpan={areResultsPublishedToKoski ? 2 : 1} />
              {scoreAverages.map(showAverage => (
                <td key={showAverage.questionId} className="meanScore js-meanScore">
                  {showAverage.average}
                </td>
              ))}
              {autogradingAnswers && <td className="meanScore js-autogradingMeanScore">{meanAutogradingScore}</td>}
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  )
}
