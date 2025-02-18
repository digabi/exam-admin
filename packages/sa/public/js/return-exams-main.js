import './init-side-effects'
import $ from 'jquery'
import _ from 'lodash'
import * as Bacon from 'baconjs'
import '@digabi/js-utils/dist/hbs-helpers'
import * as arpautils from './arpa-utils'
import * as sautils from './sa-utils'
import utils from './utils'

import * as annotationsEditing from '@digabi/answer-annotation/dist/annotations-editing'

import examAnswersT from '../templates/exam-answers.hbs'
import reviewActionBarT from '../templates/review-action-bar.hbs'
import studentDetailsActionBarT from '../templates/student-details-action-bar.hbs'
import gradingSummaryT from '../templates/grading-summary.hbs'
import examReturningT from '../templates/exam-returning.hbs'

import '../../less/arpa.less'
import { reactComponentAsContainer } from './react-container'
import { PageBanner } from './page-banner/page-banner'
import { Footer } from './footer/footer'

const uri = sautils.parseIdsFromLocation()
const eventViewUri = '/school/grading'
const gradingUri = `/school/grading/${uri.eventId}`
const ajaxReq = utils.net.ajaxRequests(ajaxErrorHandler)

if (!sautils.ui.showErrorIfBrowserUnsupported()) {
  sautils.setupAjax()
  arpautils.init(ajaxReq)

  arpautils.setupAfterPrintHandling()

  ajaxReq.getJson('/kurko-api/user').onValue(userData => {
    $('#pagebanner').replaceWith(reactComponentAsContainer(PageBanner, { userName: userData.userName }))
    sautils.setDefaultUserRole(userData.roles)
    if (uri.routeId === 'review') {
      loadAndRenderReviewUI(uri.eventId)
    } else if (uri.routeId === 'details') {
      loadAndRenderStudentDetails(uri.eventId, uri.apId)
    }
    $('#footer').append(reactComponentAsContainer(Footer))
  })
}

function ajaxErrorHandler(error) {
  return error.status === 401 ? location.reload(true) : new Bacon.Error(error)
}

function showExamName(examName) {
  $('.exam-name').text(examName)
}

// Review UI goes here

function loadAndRenderReviewUI(heldExamUuid) {
  $('body').addClass('gradingSummary')
  const answersWithTotalScoresStream = arpautils.loadAnswersWithTotalScores(heldExamUuid)
  answersWithTotalScoresStream.onValue(renderReviewUI)
  setupPrintStudentsWithoutEmail(answersWithTotalScoresStream)
  addActionBar()
  addGradingTextHandler()
  arpautils.showPageStatus('arpa.review_instruction')

  function addGradingTextHandler() {
    $('#scoreTable')
      .asEventStream('input cut paste', '.gradingText')
      .map(event => ({ target: event.target, row: $(event.target).closest('tr')[0] }))
      .doAction(({ row }) => row.classList.remove('saved'))
      .debounce(500)
      .flatMap(({ target, row }) => {
        const answerPaperId = parseInt(target.getAttribute('data-answer-paper-id'), 10)
        const gradingText = target.value.trim()
        return ajaxReq
          .postJson(`/exam-api/grading/gradingTexts/${answerPaperId}`, { gradingText: gradingText })
          .doAction(() => row.classList.add('saved'))
      })
      .onError(() => {
        sautils.ui.showLocalizedError('arpa.errors.saving_grading_text_failed')
      })
  }

  function setupPrintStudentsWithoutEmail(answersWithTotalScoresStream) {
    answersWithTotalScoresStream.map(withoutEmail).onValue(renderStudents)

    $('#gradingInfo')
      .asEventStream('click', '#printAnswerPapersWithoutEmailLink')
      .doAction(event => event.preventDefault())
      .onValue(printRest)

    function renderStudents(papers) {
      const $answers = $('#answers')
      $answers
        .empty()
        .hide()
        .append(examAnswersT({ isReadOnly: true, students: papers }))
      const annotationDb = arpautils.makeAnnotationDb(_.flatten(_.map(papers, 'answers')))
      arpautils.renderAbittiAnnotations('.answerText', annotationDb.get, true)
      annotationsEditing.setupAnnotationDisplaying($answers, false)
      sautils.ui.renderMathInMultiChoiceAnswers()
    }

    function printRest() {
      $('body').addClass('answerPapersPrint')
      window.print()
    }
  }
  function addActionBar() {
    $('#actionBar').append(reviewActionBarT())
    $('.returnToEvents').attr('href', eventViewUri)
    $('.goToScoring').attr('href', gradingUri)
    sautils.ui.makePrintButton('.printGradingSummaryLink')
  }

  function renderReviewUI(examAndScores) {
    showExamName(examAndScores.exam.title)
    setupEmailReturning(examAndScores.students)
    $('#scoreTable').append(
      gradingSummaryT({
        students: examAndScores.students
      })
    )

    sautils.popupHandlerByDelegateTarget('.answerPaperLink', 'answerPaper')

    function setupEmailReturning(students) {
      const studentsWithEmail = students.filter(student => student.email).length
      const emailData = {
        studentsWithEmail: studentsWithEmail,
        studentsInTotal: students.length,
        studentsWithoutEmail: students.length - studentsWithEmail,
        answerEmailsSent: examAndScores.exam.answerEmailsSent
          ? sautils.finnishDateString(new Date(examAndScores.exam.answerEmailsSent))
          : undefined
      }

      renderEmailInfo(emailData)

      const sendEmailsE = $('#gradingInfo')
        .asEventStream('click', '#sendGradingByEmailButton')
        .doAction(toggleEmailingDisabled(true))
        .flatMap(() => ajaxReq.postJson('/kurko-api/send-answer-emails', { heldExamUuid }))
        .doAction(toggleEmailingDisabled(false))

      sendEmailsE.onValue(result => {
        const date = { answerEmailsSent: sautils.finnishDateString(new Date(result.answerEmailsSent)) }
        renderEmailInfo(_.assign({}, emailData, date))
      })
      sendEmailsE.onError(error => {
        switch (error.status) {
          case 403:
          case 404:
            sautils.ui.showLocalizedError('arpa.errors.exam_not_found')
            break
          case 400:
            sautils.ui.showLocalizedError('arpa.errors.sending_emails_failed')
            break
          default:
            sautils.ui.showLocalizedError('arpa.errors.problem')
        }
      })

      function renderEmailInfo(emailInfo) {
        $('#gradingInfo').html(examReturningT(emailInfo))
        if (emailData.studentsWithEmail === 0) {
          $('#sendGradingByEmailButton').attr('disabled', true)
        }
        if (emailData.studentsWithoutEmail === 0) {
          $('#printAnswerPapersWithoutEmailLink').addClass('disabled')
        }
      }
      function toggleEmailingDisabled(disabled) {
        return () => {
          $('sendGradingByEmailButton').prop('disabled', disabled)
        }
      }
    }
  }
  function withoutEmail(examAndAnswers) {
    return examAndAnswers.students.filter(student => _.isUndefined(student.email) || student.email === null)
  }
}

// Student answer paper view

function loadAndRenderStudentDetails(heldExamUuid, answerPaperId) {
  $('body').addClass('studentDetails')
  arpautils.loadSingleStudentAnswers(heldExamUuid, answerPaperId).onValue(renderAnswerPaperUI)

  function renderAnswerPaperUI(answerPapers) {
    const annotationDb = arpautils.makeAnnotationDb(_.flatten(_.map(answerPapers, 'answers')))

    $('#actionBar').append(studentDetailsActionBarT())
    sautils.ui.makePreviewButton('.previewLink', _.get(answerPapers, '[0].examUuid'))
    sautils.ui.makePrintButton('.printStudentDetailsLink')
    $('#answers')
      .append(examAnswersT({ isReadOnly: true, students: answerPapers }))
      .show(0, sautils.ui.renderMathInMultiChoiceAnswers)
    arpautils.renderAbittiAnnotations('.answerText', annotationDb.get, true)
  }
}
