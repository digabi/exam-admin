import $ from 'jquery'
import * as Bacon from 'baconjs'
import * as sautils from './sa-utils'
import * as examA from './exam-answers'
import i18n from 'i18next'
import * as R from 'ramda'
import * as annotationsRendering from '@digabi/answer-annotation/dist/annotations-rendering'
import _ from 'lodash'

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

export function clearPageStatus() {
  $('#pageStatus').removeAttr('data-i18n').empty().hide()
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

export function loadAnswersE(heldExamUuid) {
  const examAndScoresE = Bacon.combineTemplate({
    students: ajaxReq.getJson(`/exam-api/grading/${heldExamUuid}/student-answers`),
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

export function hasGradedAnswers(students) {
  return students.some(student => student.answers.some(answer => answer.scoreValue !== undefined))
}

export function makeAnnotationDb(allAnswers) {
  const metadata = {}
  allAnswers
    .filter(answer => answer.metadata)
    .forEach(answer => {
      metadata[answer.id] = answer.metadata.annotations
    })

  return {
    get: getAnnotations,
    save: saveAnnotation
  }
  function getAnswerId($answerText) {
    return $answerText.closest('.answer').attr('data-answer-id')
  }

  function getAnnotations($answerText) {
    const answerId = getAnswerId($answerText)
    return metadata[answerId] || []
  }
  function saveAnnotation(answerId, annotations) {
    const ajax = ajaxReq.postJson(`/exam-api/grading/metadata/${parseInt(answerId, 10)}`, {
      metadata: { annotations: annotations }
    })
    ajax.onError(() => sautils.ui.showLocalizedError('arpa.errors.saving_metadata_failed'))
  }
}

export function loadAnswersWithTotalScores(heldExamUuid) {
  return loadAnswersE(heldExamUuid).map(addTotalScoreForStudents)

  function addTotalScoreForStudents(examAndScores) {
    examAndScores.students = examA.addScoreTotals(examAndScores.students)
    return examAndScores
  }
}

export function loadSingleStudentAnswers(heldExamUuid, answerPaperId) {
  return loadAnswersE(heldExamUuid)
    .map(examAndAnswers => selectAnswerPaperAndAddExamUuid(examAndAnswers, answerPaperId))
    .map(examA.addScoreTotals)

  function selectAnswerPaperAndAddExamUuid(examAndAnswers, apId) {
    return examAndAnswers.students
      .filter(student => student.answerPaperId === parseInt(apId, 10))
      .map(student => ({ ...student, examUuid: examAndAnswers.exam.examUuid }))
  }
}

export function renderAbittiAnnotations(answers, getAbittiAnnotations, readOnly) {
  if (readOnly === true) {
    $('body').addClass('preview')
  }
  _.forEach($(answers), elem => {
    const $elem = $(elem)
    const annotations = getAbittiAnnotations($elem)
    annotationsRendering.renderInitialAnnotationsForElement($elem, annotations)
  })
}
