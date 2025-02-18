import $ from 'jquery'
import _ from 'lodash'
import * as sautils from './sa-utils'
import i18n from 'i18next'
import setupUploadForm from './setup-upload-form'

import examsRowsT from '../templates/exams-row-template.hbs'
import examDownloadNotificationT from '../templates/exam-download-notification-template.hbs'
import examRemoveNotificationT from '../templates/exam-remove-notification-template.hbs'
import examImportUploadT from '../templates/exam-import-upload.hbs'
import availableExamsTableRowT from '../templates/available-exams-table-row.hbs'
import * as Bacon from 'baconjs'
import { sampleXml } from './bertta-editor/util'

let ajaxReq
let onLoadErrorCallback
let $rootView

const TOO_MANY_EXAMS_LIMIT = 400

export function init(ajaxRequest, $availableExamsView, onErrorCallback) {
  ajaxReq = ajaxRequest
  onLoadErrorCallback = onErrorCallback
  $rootView = $availableExamsView
  setupExamHandlers()
}

function getAvailableExamsE() {
  return ajaxReq.getJson('/kurko-api/exam/exam-events').map(decorateAvailableExams)

  function decorateAvailableExams(exams) {
    return {
      exams: _.sortBy(exams.exams, 'creationDate').reverse().map(decorateExam)
    }
  }
}

function decorateExam(exam) {
  return {
    ...exam,
    creationDateStr: sautils.finnishDateString(new Date(exam.creationDate)),
    editable: !exam.locked,
    isXml: exam.isXml,
    editableXml: !exam.locked && exam.isXml
  }
}

function renderNewExam(exam) {
  const tableBody = $('#available-exams tbody')
  tableBody.prepend(availableExamsTableRowT(decorateExam(exam)))
  sautils.popupHandlerByDelegateTarget('.preview')
  tableBody.children('tr:nth-child(1), tr:nth-child(2)').effect('highlight', { color: '#B8D8F7' }, 3000)
}

export function update() {
  const examsE = getAvailableExamsE()
  examsE.onValue(renderAvailableExams)
  examsE.onError(onLoadErrorCallback)
}

function renderAvailableExams(exams) {
  const total = exams.exams.filter(exam => !exam.deletionDate).length
  const editableExams = exams.exams.map(exam => ({ ...exam, editableXml: exam.editable && exam.isXml }))
  $rootView.empty().append(examsRowsT({ ...exams, exams: editableExams, tooManyExams: total > TOO_MANY_EXAMS_LIMIT }))
  $rootView.find('.js-exam-total').html(total)
  addImportExamHandler()
  sautils.popupHandlerByDelegateTarget('.preview')
}

function setupExamHandlers() {
  addCreateExamHandler()
  addDownloadExamHandler()
  addRevealCodeHandler()
  addRemoveExamHandler()
  addUndeleteExamHandler()

  function addCreateExamHandler() {
    createExamFor('#js-add-xml-exam-event', true)
    createExamFor('.js-add-xml-exam-event-copy', true)

    function copyExam(examUuid) {
      return ajaxReq.getJson(`/kurko-api/exam/copy-exam/${examUuid}`)
    }

    function createExamFor(id, isXml = false) {
      const createExam = $rootView
        .asEventStream('click', id)
        .flatMap(evt =>
          Bacon.combineTemplate({
            userLanguage: getUserLanguage(),
            copyFromExamUuid: $(evt.target).data('exam-uuid'),
            evt
          })
        )
        .flatMap(combined => {
          const { userLanguage, copyFromExamUuid, evt } = combined
          const { defaultExamLanguage } = userLanguage

          if (copyFromExamUuid) $(evt.target).addClass('copy-wait')
          return copyFromExamUuid
            ? copyExam(copyFromExamUuid)
            : createExamE(isXml ? sampleXml(defaultExamLanguage) : null, defaultExamLanguage)
        })

      createExam.onValue(created => {
        window.location = isXml ? `/school/bertta/${created.examUuid}` : `/school/exam/${created.examUuid}`
      })
      createExam.onError(() => $('.copy-wait').removeClass('copy-wait'))
    }

    function getUserLanguage() {
      return ajaxReq.getJson('/kurko-api/settings/exam-language')
    }
    function createExamE(contentXml, defaultExamLanguage) {
      if (window.ga) {
        window.ga('send', 'event', 'main', 'save event')
      }
      return ajaxReq.postJson('/kurko-api/exam/exam-event', {
        title: i18n.t('sa.default_exam_title'),
        examLanguage: defaultExamLanguage,
        xml: contentXml == null ? undefined : contentXml
      })
    }
  }

  function addRevealCodeHandler() {
    $rootView.asEventStream('click', '.reveal-code-button').onValue(event => {
      $(event.target).hide()
      $(event.target).siblings('.exam-code').show()
    })
  }

  function addDownloadExamHandler() {
    const downloadExamClickE = $rootView
      .asEventStream('click', '.download-exam-button')
      .map(event => $(event.target).parent())

    $rootView.asEventStream('click', '#js-cancel-download').onValue(hideNotificationPopups)

    downloadExamClickE
      .filter($form => !$form.closest('tr').hasClass('locked'))
      .doAction($form => {
        hideNotificationPopups()
        showDownloadWarning($form)
      })
      .flatMapLatest($form =>
        $rootView
          .asEventStream('click', '#js-proceed-download')
          .doAction(e => e.preventDefault())
          .map(() => $form)
      )
      .flatMapLatest($form => {
        if (window.ga) {
          window.ga('send', 'event', 'main', 'download exam confirmed', `format=xml`)
        }
        hideNotificationPopups()
        const examUuid = $form.closest('tr').attr('data-exam-uuid')

        return ajaxReq
          .postJson(`/exam-api/exams/${examUuid}/lock`, {})
          .flatMapLatest(getAvailableExamsE)
          .map(exams => ({ examUuid: examUuid, exams: exams }))
      })
      .doAction(uuidAndExams => {
        renderAvailableExams(uuidAndExams.exams)
      })
      .onValue(uuidAndExams => {
        const $form = $('#available-exams').find(`tr[data-exam-uuid=${uuidAndExams.examUuid}] form.exam-download-form`)
        $form.submit()
      })

    downloadExamClickE
      .filter($form => $form.closest('tr').hasClass('locked'))
      .onValue($form => {
        $form.submit()
      })

    function showDownloadWarning($clickedForm) {
      $clickedForm.append(examDownloadNotificationT())
      const $clickedLink = $clickedForm.find('button')
      const code = $clickedForm.closest('tr').next('tr').find('.exam-code').text()
      positionPopup($clickedLink)
      $('.notification-popup').find('.code').text(code)
    }
  }

  function positionPopup($clickedLink) {
    const triangleSize = 11
    $('.notification-popup').css({
      position: 'absolute',
      top: $clickedLink.position().top + $clickedLink.outerHeight() + triangleSize,
      left: $clickedLink.position().left + $clickedLink.outerWidth() / 2
    })
  }

  function addRemoveExamHandler() {
    const removeExamClickE = $rootView.asEventStream('click', '.js-remove-exam-button')
    removeExamClickE
      .map(e => e.currentTarget)
      .doAction(hideNotificationPopups)
      .onValue(showRemoveExamWarning)

    $rootView
      .asEventStream('click', '.js-cancel-remove')
      .doAction(e => e.preventDefault())
      .onValue(hideNotificationPopups)

    $rootView
      .asEventStream('click', '.js-proceed-remove')
      .doAction(e => e.preventDefault())
      .map(e => e.currentTarget)
      .doAction(removeButton => removeButton.setAttribute('disabled', 'true'))
      .map(removeButton => removeButton.dataset.examUuid)
      .flatMap(examUuid =>
        ajaxReq
          .deleteJson(`/kurko-api/exam/exam-event/${examUuid}`, {})
          .flatMap(getAvailableExamsE)
          .doAction(exams => {
            renderAvailableExams(exams)
          })
          .doAction(sautils.ui.hideError)
          .doError(() => sautils.ui.showLocalizedError('sa.errors.removing_exam_failed'))
      )
      .mapError()
      .onValue(hideNotificationPopups)

    function showRemoveExamWarning(removeLink) {
      const uuid = removeLink.dataset.examUuid
      const title = removeLink.dataset.examTitle
      const $removeLink = $(removeLink)
      $removeLink.parent().append(examRemoveNotificationT({ uuid, title }))
      positionPopup($removeLink)
    }
  }

  function addUndeleteExamHandler() {
    $rootView
      .asEventStream('click', '.js-undelete-exam-button')
      .doAction(e => e.preventDefault())
      .map(e => e.currentTarget)
      .map(undeleteButton => undeleteButton.dataset)
      .flatMap(({ examUuid }) => ajaxReq.postJson(`/kurko-api/exam/undelete/${examUuid}`, {}))
      .flatMap(getAvailableExamsE)
      .onValue(renderAvailableExams)
  }

  function hideNotificationPopups() {
    $('.notification-popup').remove()
  }
}

function addImportExamHandler() {
  $('#exam-import-container').empty().append(examImportUploadT())
  const $examUploadPanel = $('#exam-import-upload-panel')
  const upload = setupUploadForm(ajaxReq, $examUploadPanel, '/kurko-api/exam/import-exam')
  upload.onValue(renderNewExam)
  upload.onError(displayError)

  function displayError(error) {
    const errorLabel = getErrorLabel(error.status)
    const $text = $('<span class="error-text">').text(i18n.t(errorLabel)).attr('data-i18n', errorLabel)
    const $errorContainer = $('#exam-import-error')
    $errorContainer.empty().append($text)
    if (error.status === 413) {
      const maxFilesSize = parseInt(error.responseText, 10) / 1024 / 1024
      $text.after(
        $(
          `<span class="additional-error-text">(${
            isNaN(maxFilesSize) ? 'exam-content.json' : `(> ${maxFilesSize} MB)`
          })</span>`
        )
      )
    }
    $errorContainer.css('display', 'inline-flex').show() // explicit show fixes chai visible expectations

    function getErrorLabel(status) {
      switch (status) {
        case 400:
          return 'sa.errors.exam_import.invalid_json'
        case 422:
          return 'sa.errors.exam_import.invalid_format'
        case 413:
          return 'sa.errors.exam_import.zip_too_big'
        default:
          return 'sa.errors.load_error'
      }
    }
  }
}
