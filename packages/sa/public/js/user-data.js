import './init-side-effects'
import $ from 'jquery'
import _ from 'lodash'
import * as Bacon from 'baconjs'
import * as sautils from './sa-utils'
import utils from './utils'

import '../../less/sa.less'
import { reactComponentAsContainer } from './react-container'
import { PageBannerWithoutUser } from './page-banner/page-banner'
import * as i18n from './i18n'
import { Footer } from './footer/footer'

const validators = [
  { selector: '#password', validator: validatePasswords },
  { selector: '#password2', validator: validatePasswords },
  { selector: '#firstname', validator: validateFirstName },
  { selector: '#lastname', validator: validateLastName },
  { selector: '#terms-acceptance', validator: validateTermsAcceptance }
]

if (!sautils.ui.showErrorIfBrowserUnsupported()) {
  sautils.setupAjax()

  i18n.init(() => {
    $('#pagebanner').replaceWith(reactComponentAsContainer(PageBannerWithoutUser))
    startSpinner()
    $('#footer').append(reactComponentAsContainer(Footer))
    _(validators).map('selector').map(selectorToField).forEach(hideValidationError)
    // go get stuff from the server
    const serverRequests = utils.bacon.postJson('/kurko-api/user/token', { access_token: sautils.getTokenFromURL() })

    serverRequests.onValue(userData => {
      setupPage(userData)
    })
    serverRequests.onError(() => {
      stopSpinner()
      sautils.ui.showLocalizedError('reg_confirmation.token_error')
    })
  })
}

function selectorToField(selector) {
  return selector.replace(/^#/, '')
}

function setupPage(userData) {
  stopSpinner()
  $('#email').localize({ email: userData.userName })
  populateFormFromUserDetails(userData.userDetails)
  setupEventHandlers()
  $('#user-data').show()
  $('#password').focus()
}

function setupEventHandlers() {
  setupSubmitHandler()
  setupValidators()

  function setupSubmitHandler() {
    const $submit = $('form#user-data')
    const submitE = $submit
      .asEventStream('submit')
      .doAction(event => event.preventDefault())
      .filter(isNotSubmitting)
      .flatMap(validateForm)
      .map(readUserDataFromDom)
      .doAction(addSubmittingClass)
      .flatMapLatest(postUserData)

    submitE.onValue(() => {
      $submit.off('submit')
      removeSubmittingClass()
      performTraditionalSubmit()
    })
    submitE.onError(error => {
      removeSubmittingClass()
      if (error.status === 400 || typeof error === 'string') {
        $('#confirmation-error').localize().show()
      } else {
        sautils.ui.showLocalizedError('reg_confirmation.system_error')
      }
    })

    function performTraditionalSubmit() {
      $submit.submit()
    }
    function isNotSubmitting() {
      return !$submit.hasClass('submitting')
    }
    function addSubmittingClass() {
      $submit.addClass('submitting')
    }
    function removeSubmittingClass() {
      $submit.removeClass('submitting')
    }
  }

  function setupValidators() {
    _.forEach(validators, setupValidator)
  }

  function setupValidator(validator) {
    const invalidFields = $(validator.selector)
      .asEventStream('change blur')
      .map(targetValue)
      .skipDuplicates()
      .map(validator.validator)
      .flatMapLatest(Bacon.fromArray)
      .filter(validationResult => !validationResult.valid)
      .map(({ field }) => field)
    invalidFields.onValue(showValidationError)

    const validFields = $(validator.selector)
      .asEventStream('change blur keyup')
      .map(targetValue)
      .skipDuplicates()
      .map(validator.validator)
      .flatMapLatest(Bacon.fromArray)
      .filter(validationResult => validationResult.valid)
      .map(({ field }) => field)
    validFields.onValue(hideValidationError)

    function targetValue(event) {
      return event.target.type === 'checkbox' ? $(event.target).is(':checked') : event.target.value
    }
  }
}

function populateFormFromUserDetails(userDetails) {
  const $form = $('#user-data')
  $form.find('#firstname').val(userDetails.firstName)
  $form.find('#lastname').val(userDetails.lastName)
  $form.find('input[name="newsletter-confirmation"]').prop('checked', userDetails.noMailing)
  $form.find('input[name="contact-confirmation"]').prop('checked', userDetails.noContacting)
  $form.find('#terms-acceptance').prop('checked', userDetails.acceptTerms)
}

function readUserDataFromDom() {
  const $form = $('#user-data')
  return {
    password: $form.find('input[name="password"]').val() || null,
    details: {
      firstName: $form.find('input[name="firstname"]').val() || null,
      lastName: $form.find('input[name="lastname"]').val() || null,
      noMailing: $form.find('input[name="newsletter-confirmation"]').is(':checked'),
      noContacting: $form.find('input[name="contact-confirmation"]').is(':checked'),
      acceptTerms: $form.find('#terms-acceptance').is(':checked')
    }
  }
}

function postUserData(userData) {
  return utils.bacon.postJson(
    '/kurko-api/user/details',
    _.merge({}, userData, { access_token: sautils.getTokenFromURL() })
  )
}

function startSpinner() {
  sautils.ui.startSpinner($('#load-indicator').show().find('#load-spinner'))
}
function stopSpinner() {
  sautils.ui.stopSpinner($('#load-indicator').hide().find('#load-spinner'))
}

function validateForm() {
  const validationResults = _.flatten(_.map(validators, validator => validator.validator($(validator.selector).val())))
  const validationFailures = _.filter(validationResults, result => result.valid === false)

  const invalidFields = _.map(validationFailures, 'field')
  _.forEach(invalidFields, showValidationError)

  const hasValidationFailures = !_.isEmpty(invalidFields)
  if (hasValidationFailures) {
    return new Bacon.Error('Validation error')
  } else {
    return true
  }
}

function validatePasswords() {
  return [validatePassword1(), validatePassword2()]
}
function validatePassword1() {
  const re = /^.{8,60}$/
  const isValid = re.test($('#password').val())
  return { field: 'password', valid: isValid }
}
function validatePassword2() {
  const isValid = $('#password').val() === $('#password2').val()
  return { field: 'password2', valid: isValid }
}
function validateFirstName(name) {
  return validateEmptyOrNaturalName(name, 'firstname')
}
function validateLastName(name) {
  return validateEmptyOrNaturalName(name, 'lastname')
}
function validateEmptyOrNaturalName(value, field) {
  const isValid = isEmptyOrNaturalName(value)
  return [{ field: field, valid: isValid }]
}
function isEmptyOrNaturalName(name) {
  return typeof name === 'string' && name.search(/^[\u00C0-\u00FFa-zA-Z -]*$/) !== -1
}

function validateTermsAcceptance() {
  const isValid = $('#terms-acceptance').prop('checked')
  return [{ field: 'terms-acceptance', valid: isValid }]
}

function showValidationError(field) {
  const errorKey = errorMessageKey(field)
  const $errorField = $(`#${field}-error`)
  $errorField.empty().show().attr('data-i18n', `[html]${errorKey}`).localize()
}

function hideValidationError(field) {
  const $errorField = $(`#${field}-error`)
  $errorField.empty().hide()
}

function errorMessageKey(field) {
  return `reg_confirmation.validation_errors.${field}`
}
