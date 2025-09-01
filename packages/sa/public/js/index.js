import './init-side-effects'
import $ from 'jquery'
import * as Bacon from 'baconjs'
import './hbs-helpers'

import * as tabManager from './tab-manager'
import * as sautils from './sa-utils'
import utils from './utils'
import registration from './registration'
import * as availableExams from './available-exams'
import * as login from './login'
import * as settings from './settings'
import * as notifications from './notifications'

import registrationT from '../templates/registration.hbs'

import '../../less/sa.less'
import { reactComponentAsContainer } from './react-container'
import { PageBanner } from './page-banner/page-banner'
import * as i18n from './i18n'
import { Footer } from './footer/footer'

const $examWizard = $('#exam-wizard')
const $examSettingsTab = $('#exam-settings-tab')

const ajaxReq = utils.net.ajaxRequests(error => {
  return error.status === 401 ? goToLoginAndStop() : new Bacon.Error(error)
  function goToLoginAndStop() {
    showLoginPage()
    return Bacon.never()
  }
})

if (!sautils.ui.showErrorIfBrowserUnsupported()) {
  sautils.setupAjax()
  i18n.init(() => {
    notifications.init()
    $('#footer').append(reactComponentAsContainer(Footer))

    // Bypass error handler for custom handling
    utils.bacon
      .getJson('/kurko-api/user')
      .doAction(userData => {
        $('#pagebanner').replaceWith(reactComponentAsContainer(PageBanner, { userName: userData.userName }))
        initWithAuthenticatedUser(userData)
      })
      .doError(error => {
        $('#pagebanner').replaceWith(reactComponentAsContainer(PageBanner))
        showLoginPage(error)
      })
      .subscribe()
  })
}

function showLoginPage() {
  login.show()
  $('#page-content').html(registrationT()).localize().show()
  registration()
}

function initWithAuthenticatedUser(userData) {
  sautils.setDefaultUserRole(userData.roles)
  availableExams.init(ajaxReq, $('#exam-export'), showLoadError)
  settings.init(ajaxReq, $examSettingsTab)

  const tabConfig = [
    /* eslint-disable no-multi-spaces */
    { name: 'exams', $root: $('#exam-export'), update: availableExams.update },
    { name: 'settings', $root: $('#exam-settings-tab'), update: settings.update }
    /* eslint-enable no-multi-spaces */
  ]
  tabManager.init(Bacon.never(), tabConfig)
}

function showLoadError() {
  $examWizard.hide()
  sautils.ui.showLocalizedError('sa.errors.load_error')
}
