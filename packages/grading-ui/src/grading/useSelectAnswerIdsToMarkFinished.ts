import { useContext } from 'react'
import { GradingContext } from './grading-view'
import { UnfinishedGradedAnswer } from './types'

export const useSelectAnswerIdsToMarkFinished = () => {
  const {
    unfinishedStudentsAndAnswers,
    columnsToMarkFinished,
    rowsToMarkFinished,
    markOnlyMyGradesFinished,
    markOnlySelectedGradesFinished
  } = useContext(GradingContext)

  const maybSelectOnlyPregradedByUser = (i: UnfinishedGradedAnswer) =>
    markOnlyMyGradesFinished ? i.pregradedByUser : true

  const maybeSelectOnlySelected = (i: UnfinishedGradedAnswer) => {
    if (!markOnlySelectedGradesFinished) {
      return true
    }
    if (columnsToMarkFinished.length === 0 && rowsToMarkFinished.length === 0) {
      return false
    }
    if (columnsToMarkFinished.length > 0 && !columnsToMarkFinished.includes(i.displayNumber)) {
      return false
    }
    if (rowsToMarkFinished.length > 0 && !rowsToMarkFinished.includes(i.studentUuid)) {
      return false
    }
    return true
  }

  return unfinishedStudentsAndAnswers?.filter(maybSelectOnlyPregradedByUser).filter(maybeSelectOnlySelected) || []
}
