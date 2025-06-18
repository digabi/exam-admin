import $ from 'jquery'
import * as Bacon from 'baconjs'
import * as sautils from './sa-utils'
import * as examA from './exam-answers'
import i18n from 'i18next'
import * as R from 'ramda'

let ajaxReq

export function getMaxScore(q) {
  if ('maxScore' in q) {
    return q.maxScore || 0
  }
  return q.choices.reduce((sum, choice) => sum + choice.options.map(({ score }) => score || 0).reduce(R.max, 0), 0)
}

export function init(ajaxRequest) {
  ajaxReq = ajaxRequest
}

export function showPageStatus(i18nToken) {
  $('#pageStatus').attr('data-i18n', i18nToken).html(i18n.t(i18nToken)).show()
}

export function setupAfterPrintHandling() {
  const afterPrintHandler = () => {
    clearPrintStyles()
  }
  sautils.afterPrint(afterPrintHandler)

  function clearPrintStyles() {
    $('body').removeClass('answerPapersPrint')
  }
}

// Data handling

function loadAnswersE(heldExamUuid) {
  const examAndScoresE = Bacon.combineTemplate({
    students: ajaxReq.getJson(`/exam-api/grading/${heldExamUuid}/student-answers-return`),
    exam: ajaxReq.getJson(`/exam-api/exams/held-exam/${heldExamUuid}/exam`)
  }).map(({ exam, students }) => {
    const questions = examA
      .questionMaxScores(exam.gradingStructure || exam.content)
      .map(q => ({ ...q, maxScore: getMaxScore(q) }))
    return {
      exam: exam,
      maxScores: questions,
      questionCount: questions.length,
      students: examA.prepareStudentsAnswers(students, questions, exam.gradingStructure != null)
    }
  })
  examAndScoresE.onError(handleLoadError)
  return examAndScoresE.skipErrors()

  function handleLoadError(error) {
    switch (error.status) {
      case 403:
        sautils.ui.showLocalizedError('arpa.errors.exam_not_found')
        break
      case 404:
        showPageStatus('arpa.errors.no_students_and_answers')
        break
      default:
        sautils.ui.showLocalizedError('arpa.errors.problem')
    }
  }
}

export function loadAnswersWithTotalScores(heldExamUuid) {
  return loadAnswersE(heldExamUuid).map(addTotalScoreForStudents)

  function addTotalScoreForStudents(examAndScores) {
    examAndScores.students = examA.addScoreTotals(examAndScores.students)
    return examAndScores
  }
}
