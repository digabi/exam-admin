import './init-side-effects'
import $ from 'jquery'
import _ from 'lodash'
import * as Bacon from 'baconjs'
import './hbs-helpers'
import * as arpautils from './arpa-utils'
import * as sautils from './sa-utils'
import utils from './utils'

import reviewActionBarT from '../templates/review-action-bar.hbs'
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

  ajaxReq.getJson('/kurko-api/user').onValue(userData => {
    $('#pagebanner').replaceWith(reactComponentAsContainer(PageBanner, { userName: userData.userName }))
    sautils.setDefaultUserRole(userData.roles)
    loadAndRenderReviewUI(uri.eventId)
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
  const answersWithTotalScoresStream = arpautils.loadStudentsWithTotalScores(heldExamUuid)
  answersWithTotalScoresStream.onValue(renderReviewUI)
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
        heldExamUuid: heldExamUuid,
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
}
