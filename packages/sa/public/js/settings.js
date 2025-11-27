import * as Bacon from 'baconjs'
import _ from 'lodash'
import examSettingsTabT from '../templates/exam-settings-tab.hbs'
import emailT from '../templates/exam-settings-email.hbs'
import { validateEmail } from './sa-utils'
import i18n from 'i18next'
import $ from 'jquery'

export function init(ajaxReq, $root) {
  $root.html(examSettingsTabT())
  const $email = $root.find('#update-username-form')
  $email.html(emailT({ done: false }))

  initExamLanguageSettings()

  const mkInputChanges = selector =>
    Bacon.mergeAll($email.asEventStream('input', selector), $email.asEventStream('change', selector)).map(e => ({
      type: e.type === 'input' ? 'FIELD_INPUT' : 'FIELD_CHANGE',
      payload: _.pick(e.currentTarget, ['name', 'value'])
    }))
  const passwordE = mkInputChanges('#password')
  const newUsernameE = mkInputChanges('#new-username')
  const submitClickedE = $email
    .asEventStream('click', '#submit-button')
    .doAction(event => event.preventDefault())
    .map({ type: 'SUBMIT' })
  const actionsE = Bacon.mergeAll(passwordE, newUsernameE, submitClickedE)

  const fields = { username: '', password: '' }
  const initialState = {
    fields,
    untouchedFields: _.mapValues(fields, _.constant(true)),
    validationErrors: validate(fields),
    status: 'ready'
  }

  const formStateP = actionsE.flatScan(initialState, (state, { type, payload }) => {
    switch (type) {
      case 'FIELD_INPUT':
      case 'FIELD_CHANGE': {
        const { name, value } = payload
        const fields = { ...state.fields, [name]: value }
        const untouchedFields = type === 'FIELD_CHANGE' ? _.omit(state.untouchedFields, name) : state.untouchedFields
        const validationErrors = validate(fields)
        return { ...state, fields, untouchedFields, validationErrors }
      }
      case 'SUBMIT': {
        if (state.status !== 'ready' || !_.isEmpty(state.validationErrors)) {
          // Mark all fields as touched to display all validation errors.
          return { ...state, untouchedFields: {} }
        }

        return ajaxReq
          .postJson('/kurko-api/settings/update-email', {
            password: state.fields.password,
            newUsername: state.fields.username
          })
          .map({ ...state, status: 'done' })
          .mapError(response => {
            const serverValidationErrors = _.get(response, 'responseJSON.validationErrors', {})
            const translatedServerValidationErrors = _.mapValues(serverValidationErrors, translateValidationError)
            const validationErrors = { ...state.validationErrors, ...translatedServerValidationErrors }
            return { ...state, status: 'ready', validationErrors }
          })
          .take(1)
          .startWith({ ...state, status: 'waiting' })
      }
    }
  })

  formStateP.changes().onValue(({ untouchedFields, validationErrors, status }) => {
    switch (status) {
      case 'ready': {
        for (let field in fields) {
          const showValidationError = field in validationErrors && !(field in untouchedFields)
          const text = showValidationError ? validationErrors[field] : ''
          $email.find(`[data-validation-error-for=${field}]`).text(text)
        }
        break
      }
      case 'done': {
        $email.html(emailT({ done: true }))
      }
    }
  })

  async function initExamLanguageSettings() {
    const result = await fetch('/kurko-api/settings/exam-language')
    const { defaultExamLanguage } = await result.json()
    const $languageRadio = $('input[name="default_language"]')
    $languageRadio.filter(`[value="${defaultExamLanguage}"]`).prop('checked', true)
    $languageRadio.change(async () => {
      const { status } = await fetch(`/kurko-api/settings/exam-language/${$languageRadio.filter(':checked').val()}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      })
      if (status !== 200) {
        throw new Error('Post failed')
      }
    })
  }
}

const translateValidationError = key => i18n.t(`sa.settings.update_username.validation_errors.${key}`)

const validate = ({ username, password }) => {
  const errors = {}

  if (!validateEmail(username)) {
    errors.username = translateValidationError('invalid_username')
  }

  if (_.isEmpty(password)) {
    errors.password = translateValidationError('empty_password')
  }

  return errors
}

export const update = _.noop
