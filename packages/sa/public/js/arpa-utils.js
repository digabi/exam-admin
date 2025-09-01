import $ from 'jquery'
import _ from 'lodash'
import * as Bacon from 'baconjs'
import * as sautils from './sa-utils'
import i18n from 'i18next'

let ajaxReq

export function init(ajaxRequest) {
  ajaxReq = ajaxRequest
}

export function showPageStatus(i18nToken) {
  $('#pageStatus').attr('data-i18n', i18nToken).html(i18n.t(i18nToken)).show()
}

// Data handling

function sortStudentsByName(students) {
  return _.sortBy(students, student => `${student.lastName.toLowerCase()} ${student.firstNames.toLowerCase()}`)
}

function addScoreTotals(students) {
  return students.map(student => {
    student.totalScore = _.sum(_.filter(_.map(student.answers, 'scoreValue')))
    return student
  })
}

export function loadStudentsWithTotalScores(heldExamUuid) {
  const examAndScoresE = Bacon.combineTemplate({
    students: ajaxReq.getJson(`/exam-api/grading/${heldExamUuid}/student-answers-return`),
    exam: ajaxReq.getJson(`/exam-api/exams/held-exam/${heldExamUuid}/exam`)
  }).map(({ exam, students }) => ({
    exam: exam,
    students: sortStudentsByName(addScoreTotals(students))
  }))
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
