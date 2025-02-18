import { init } from './oauth-dialog.js'

import $ from 'jquery'
import '../../less/oauth.less'
import consentT from '../templates/oauth-consent.hbs'
import consentScopesT from '../templates/partials/oauth_scopes_list.hbs'
import consentErrorT from '../templates/oauth-consent-error.hbs'
import { scopesToI18n } from './oauth-scopes'
import * as R from 'ramda'
import * as sautils from './sa-utils'
import utils from './utils'

sautils.setupAjax()

init(() => {
  const params = document.location.search
    .slice(1)
    .split('&')
    .filter(p => p)
    .reduce((acc, parameter) => {
      const [key, value] = parameter.split('=')
      const decoded = decodeURIComponent(value)
      return {
        ...acc,
        [key]: acc[key] !== undefined ? R.flatten([acc[key], decoded]) : decoded
      }
    }, {})

  const $consent = $('#consent')
  const $consentScopes = $('#consent-scopes')
  const $consentForm = $('#consent-form')
  const $content = $('#content')

  const transactionDetails = utils.bacon.getJson(`/oauth/consent/${params.transaction_id}`)

  transactionDetails.onValue(details => {
    $consentForm.find('input[name="transaction_id"]').val(params.transaction_id)
    $consent.append(consentT(details)).localize()
    $consentScopes.append(consentScopesT(scopesToI18n(R.flatten([details.scopes])))).localize()
    $content.show()
  })

  transactionDetails.onError(error => {
    $content.empty().append(consentErrorT(error)).localize().show()
  })
})
