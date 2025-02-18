import $ from 'jquery'
import utils from './utils'
import * as Bacon from 'baconjs'
import * as sautils from './sa-utils'

export default function () {
  const $registration = $('form#start-registration')
  const $email = $registration.find('input[name="email"]')
  const startRegistrationPostsE = $registration
    .asEventStream('submit')
    .doAction(event => event.preventDefault())
    .map(readEmailFromDom)
    .endOnError()
    .flatMap(validateEmail)
    .flatMapLatest(postRegistrationEmail)

  startRegistrationPostsE.onValue(showThankYouMessage)
  startRegistrationPostsE.onError(showErrorMessage)
  $email.keydown(() => {
    $('#sending-feedback').empty()
  })

  function readEmailFromDom() {
    return {
      email: $registration.find('input[name="email"]').val().trim()
    }
  }

  function validateEmail(details) {
    return sautils.validateEmail(details.email) ? details : new Bacon.Error({ status: 400 })
  }

  function postRegistrationEmail(details) {
    toggleSubmitDisabled(true)
    return utils.bacon.postJson('/kurko-api/registration', details).map(() => details.email)
  }

  function showThankYouMessage(email) {
    $registration.find('input[name="email"]').val('')
    $('#sending-feedback')
      .empty()
      .removeClass('error-notice')
      .attr('data-i18n', 'registration.message_sent')
      .localize({ email: email })
    toggleSubmitDisabled(false)
  }

  function showErrorMessage(error) {
    if (error && error.status === 400) {
      $('#sending-feedback')
        .empty()
        .addClass('error-notice')
        .attr('data-i18n', 'registration.invalid_email_error')
        .localize()
    } else {
      sautils.ui.showLocalizedError('registration.system_error')
      $('#login').css('display', 'none')
    }
    toggleSubmitDisabled(false)
  }

  function toggleSubmitDisabled(disabled) {
    $registration.find('input[type="submit"]').prop('disabled', disabled)
  }
}
