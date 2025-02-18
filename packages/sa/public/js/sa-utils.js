import $ from 'jquery'
import _ from 'lodash'
import utils from './utils'
import * as _sanitizeHtml from 'sanitize-html'
import * as L from 'partial.lenses'
const { Spinner } = require('spin.js')

export function openPopup(url, windowName, field) {
  window[field || 'popup'] = window.open(
    url,
    windowName ? windowName : 'popupWindow',
    'width=1000,height=700,scrollbars=yes,toolbar=no,location=no,status=no,menubar=no,resizable=yes'
  )
}

export function popupHandlerByDelegateTarget(selector, windowName) {
  $(selector).click(event => {
    event.preventDefault()
    openPopup($(event.delegateTarget).attr('href'), windowName)
  })
}

function getSelection() {
  if (typeof window.getSelection !== 'undefined') {
    return window.getSelection()
  } else if (typeof document.selection !== 'undefined' && document.selection.type === 'Text') {
    return document.selection
  }

  return undefined
}

// We allow exams to contain arbitrary HTML on the koe side. As an attempt to
// keep the sa side secure but at the same time to avoid showing encoded
// HTML to the user, try to thwart most obvious XSS attack vectors this way.
const sanitizeOptions = {
  allowedTags: _sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'dd', 'dt', 'dl'])
}
export const sanitizeHtml = dirty => _sanitizeHtml(dirty, sanitizeOptions)
export const sanitizeHtmlDeep = L.modify([L.leafs, L.when(x => typeof x === 'string')], sanitizeHtml)

export function setSchoolId(schoolId) {
  $.ajaxSetup({ headers: { 'x-school-id': schoolId } })
}

export function openPrintDialog(event) {
  event.preventDefault()
  window.print()
}

export function setupAjax() {
  $.ajaxSetup({ dataType: 'json', contentType: 'application/json; charset=utf-8' })
  $.ajaxPrefilter('json', (opts, originalOpts) => {
    const instanceOfFormData = originalOpts.data instanceof FormData
    if (opts.type.toLowerCase() !== 'get' && !_.isString(originalOpts.data) && !instanceOfFormData) {
      opts.data = JSON.stringify(originalOpts.data)
    }
  })
}
export function parseRouteAndEventUuidFromLocation() {
  const locationPath = window.location.pathname
  const uuidMatcher = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  const routeAndEventIdMatcher = RegExp(`\\/school\\/(\\w+)\\/(${uuidMatcher})\\/?(\\w+)?`, 'i')
  const parts = locationPath.match(routeAndEventIdMatcher)
  return parts
    ? parts[3] === 'attachments'
      ? { routeId: parts[3], eventId: parts[2] }
      : { routeId: parts[1], eventId: parts[2] }
    : {}
}
export function parseIdsFromLocation() {
  const uuidMatcher = RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  const pathSegments = window.location.pathname.split('/')
  return pathSegments.length > 3
    ? {
        routeId: pathSegments[2],
        eventId: uuidIfValid(pathSegments[3]),
        apId: pathSegments[5],
        schoolId: uuidIfValid(pathSegments[5])
      }
    : {}
  function uuidIfValid(str) {
    return uuidMatcher.test(str) ? str : undefined
  }
}
export function getTokenFromURL() {
  const locationPath = window.location.pathname
  const userToken = RegExp('\\/([^/]+)$', 'i')
  const parts = locationPath.match(userToken)
  return parts ? parts[1] : undefined
}
export function setDefaultUserRole(roles, schoolId) {
  const rolesWithDefault = setDefaultCurrentRole(roles, schoolId)
  const role = _.find(rolesWithDefault, role => role.currentRole)
  if (role) {
    setSchoolId(role.schoolId)
  }

  function setDefaultCurrentRole(roles, schoolId) {
    const roleFromSchool = _.find(roles, role => role.schoolId === schoolId)
    const roleFromPrincipal = _.find(roles, role => role.isPrincipal)
    const role = roleFromSchool ? roleFromSchool : roleFromPrincipal ? roleFromPrincipal : _.first(roles)
    if (role) {
      role.currentRole = true
    }
    return roles
  }
}
export function validateEmail(email) {
  const regex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return regex.test(email)
}
export function finnishDateString(date) {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
}
export function afterPrint(handler) {
  if (window.matchMedia) {
    const mediaQueryList = window.matchMedia('print')
    mediaQueryList.addListener(mql => {
      if (!mql.matches) {
        handler()
      }
    })
  }
  window.onafterprint = handler
}

export const ui = {
  spinner: null,
  startSpinner(el, spinnerStyle) {
    el.show()
    ui.spinner = new Spinner(spinnerStyle || utils.ui.spinnerYtlLarge).spin()
    el.append(ui.spinner.el)
  },
  stopSpinner: function (el) {
    if (ui.spinner) {
      el.hide()
      ui.spinner.stop()
      ui.spinner = null
    }
  },
  showErrorIfBrowserUnsupported() {
    if (!this.isBrowserCompatible()) {
      $('body').empty()
      this.ensureErrorElementsExist()
      $('#floating-error .message').empty().html(this.unsupportedBrowserMessage)
      $('#floating-error').fadeIn()
      return true
    } else {
      return false
    }
  },
  showLocalizedError(localizationKey, i18nOptions) {
    this.ensureErrorElementsExist()
    $('#floating-error .message')
      .empty()
      .addClass('localized-error')
      .attr('data-i18n', `[html]${localizationKey}`)
      .localize(i18nOptions)
    $('#floating-error').fadeIn(200)
  },
  hideError() {
    $('#floating-error').fadeOut(100)
    $('#floating-error .message').empty().removeAttr('data-i18n')
  },
  ensureErrorElementsExist() {
    if ($('#floating-error').length === 0) {
      $('body').append('<div id="floating-error">' + '<div class="message"></div> ' + '</div>')
    }
  },
  makePreviewButton(selector, eventId) {
    $(selector).attr('href', `/school/preview/${eventId}`)
    popupHandlerByDelegateTarget(selector)
  },
  makePrintButton(selector) {
    $(selector).asEventStream('click').onValue(openPrintDialog)
  },
  isBrowserCompatible() {
    const version = utils.browser.getInternetExplorerVersion()
    return version === -1 || version >= 11.0
  },
  isBrowserIE() {
    const version = utils.browser.getInternetExplorerVersion()
    return version !== -1
  },
  unsupportedBrowserMessage:
    'Valitettavasti käyttämäsi selain ei ole tällä hetkellä tuettu. Sähköistä asiointia voi käyttää vain 11.0 tai sitä uudemmilla Internet Explorerin versiolla.' +
    '<p>Tyvärr stöder tjänsten för tillfället inte din webbläsare. Studentexamensnämndens e-tjänster kan användas endast med 11.0 eller nyare versioner av Internet Explorer.</p>' +
    '<p>Muita tuettuja selaimia / övriga webbläsare med stöd: <a href="https://www.mozilla.org/fi/firefox/new/">Firefox</a>, <a href="http://www.google.com/chrome/">Chrome</a></p>',
  renderMathInMultiChoiceAnswers() {
    const elements = $('.answerMultiChoiceGap, .answerMultiChoice').toArray()
    if (elements.length > 0) {
      window.MathJax.Hub.Configured()
      window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, elements, () => {}])
    }
  },
  getSelection
}
