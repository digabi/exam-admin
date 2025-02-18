import $ from 'jquery'
import _ from 'lodash'
import * as sautils from './sa-utils'
import setupUploadForm from './setup-upload-form'

import examGradingTabT from '../templates/exam-grading-tab.hbs'
import examGradingUploadT from '../templates/exam-grading-upload.hbs'
import answersUploadedT from '../templates/answers-uploaded-notification.hbs'
import heldExamRemoveNotificationT from '../templates/held-exam-remove-notification-template.hbs'
import heldExamsRowT from '../templates/exam-grading-table-row.hbs'

let ajaxReq
let onLoadErrorCallback
let $heldExamView

export function init(ajaxRequest, $examGradingTab, onErrorCallback) {
  ajaxReq = ajaxRequest
  onLoadErrorCallback = onErrorCallback
  $examGradingTab.empty().append(examGradingTabT({}))
  $heldExamView = $examGradingTab
  setupAnswersUploadPanel()
  setupHeldExamHandlers()
}

function setupHeldExamHandlers() {
  addRemoveHeldExamHandler()
  addUndeleteHeldExamHandler()

  function positionPopup($clickedLink) {
    const triangleSize = 11
    $('.notification-popup').css({
      position: 'absolute',
      top: $clickedLink.position().top + $clickedLink.outerHeight() + triangleSize,
      right: -30
    })
  }

  function addRemoveHeldExamHandler() {
    const removeExamClickE = $heldExamView.asEventStream('click', '.js-remove-held-exam-button')
    removeExamClickE
      .map(e => e.currentTarget)
      .doAction(hideNotificationPopups)
      .onValue(showRemoveExamWarning)

    $heldExamView
      .asEventStream('click', '.js-cancel-remove')
      .doAction(e => e.preventDefault())
      .onValue(hideNotificationPopups)

    $heldExamView
      .asEventStream('click', '.js-proceed-remove')
      .doAction(e => e.preventDefault())
      .map(e => e.currentTarget)
      .doAction(removeButton => removeButton.setAttribute('disabled', 'true'))
      .map(removeButton => removeButton.dataset.examUuid)
      .flatMap(heldExamUuid =>
        ajaxReq
          .deleteJson(`/exam-api/exams/held-exam/${heldExamUuid}`, {})
          .doAction(update)
          .doAction(sautils.ui.hideError)
          .doError(() => sautils.ui.showLocalizedError('sa.errors.removing_held_exam_failed'))
      )
      .mapError()
      .onValue(hideNotificationPopups)

    function showRemoveExamWarning(removeLink) {
      const uuid = removeLink.dataset.examUuid
      const title = removeLink.dataset.examTitle
      const $removeLink = $(removeLink)
      $removeLink.parent().append(heldExamRemoveNotificationT({ uuid, title }))
      positionPopup($removeLink)
    }
  }

  function addUndeleteHeldExamHandler() {
    $heldExamView
      .asEventStream('click', '.js-undelete-held-exam-button')
      .doAction(e => e.preventDefault())
      .map(e => e.currentTarget)
      .map(removeButton => removeButton.dataset)
      .flatMap(({ heldExamUuid }) => ajaxReq.postJson(`/exam-api/exams/held-exam/${heldExamUuid}/undelete`))
      .onValue(update)
  }

  function hideNotificationPopups() {
    $('.notification-popup').remove()
  }
}

function setupAnswersUploadPanel() {
  $('#answers-upload').empty().append(examGradingUploadT())
  const $answersUploadPanel = $('#answers-upload-panel')
  const uploadE = setupUploadForm(ajaxReq, $answersUploadPanel, '/exam-api/grading/answers-meb')

  uploadE.onValue(examTitles => update().onValue(() => showAnswerUploadNotification(examTitles)))

  uploadE.onError(renderUploadErrorDialog)

  function renderUploadErrorDialog(error) {
    clearUploadNotifications()
    switch (error.status) {
      case 422:
        renderUploadError('sa.errors.no_answer_papers')
        break
      case 428:
        renderUploadError('sa.errors.grading_started')
        break
      case 415:
        renderUploadError('sa.errors.exam_meb')
        break
      case 409:
        renderUploadError('sa.errors.incorrect_exam')
        break
      case 400:
        renderUploadError('sa.errors.invalid_file')
        break
      default:
        renderUploadError('sa.errors.answer_upload_failed')
        break
    }

    function renderUploadError(errorMessageKey) {
      $answersUploadPanel.find('.upload-error').attr('data-i18n', errorMessageKey).localize().show()
    }
  }
}

function showAnswerUploadNotification(uploadedAndDeletedExams) {
  const toExisting = uploadedAndDeletedExams.exams
  const toDeleted = uploadedAndDeletedExams.deletedExams
  const uploadedExams = toExisting
  const deletedTitles = toDeleted.map(e => e.title)

  $('#answers-upload-panel').append(
    answersUploadedT({
      uploadedExams,
      deletedTitles
    })
  )
  const $answersUploadedNotification = $('#answers-upload-panel').find('.answers-uploaded-notification')
  $answersUploadedNotification.css({ opacity: '0' }).slideDown(100, () => {
    $answersUploadedNotification.animate({ opacity: '100' }, 1000)
  })
}

function clearUploadNotifications() {
  $('#answers-upload-panel').find('.answers-uploaded-notification').remove()
}

function getSchoolIdFromDom() {
  return $('#role-selection :selected').val() || $('.role-information span').data('school-id')
}

export function update() {
  clearUploadNotifications()
  const heldExamsE = ajaxReq.getJson('/kurko-api/exam/held-exams')
  heldExamsE
    .map(addGradingProgress)
    .map(addFormattedEventDate)
    .onValue(exams => {
      $('#held-exams tbody').html(heldExamsRowT({ exams: exams, schoolUuid: getSchoolIdFromDom() }))
      $('.js-held-exam-total').html(exams.filter(exam => !exam.heldExamDeletionDate).length)
    })

  heldExamsE.onError(onLoadErrorCallback)

  return heldExamsE

  function addGradingProgress(exams) {
    return _.map(exams, exam => {
      const textAnswerCount = exam.answers - (exam.scoredAnswers - exam.scoredTextAnswers)
      const gradingProgress = textAnswerCount !== 0 ? Math.round((exam.scoredTextAnswers / textAnswerCount) * 100) : 100
      return { ...exam, gradingProgress: gradingProgress, gradingCompleted: gradingProgress === 100 }
    })
  }

  function addFormattedEventDate(exams) {
    return _.map(exams, exam => ({ ...exam, uploadDateStr: sautils.finnishDateString(new Date(exam.uploaded)) }))
  }
}
