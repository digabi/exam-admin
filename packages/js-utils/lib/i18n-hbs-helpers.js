import * as i18n from 'i18next'
import $ from 'jquery'
import _ from 'lodash'
import * as Handlebars from 'handlebars/runtime'

export default function (i18nConfig) {
  var defaultI18nConfig = {
    cookieName: 'i18nLang',
    cookieExpirationTime: 5 * 365 * 24 * 60,
    fallbackLng: 'fin',
    fallbackOnNull: false,
    getAsync: false,
    resGetPath: '/locales/__lng__.json',
    useDataAttrOptions: true
  }
  var overriddenI18nConfig = _.merge(defaultI18nConfig, i18nConfig)

  var cookieRegex = new RegExp(`${overriddenI18nConfig.cookieName}=\\w+`)
  if (!document.cookie.match(cookieRegex)) {
    defaultI18nConfig.lng = 'fin'
  }

  i18n.init(overriddenI18nConfig, () => {
    $('[data-i18n]').i18n()
  })

  // http://i18next.com/pages/doc_templates.html
  // To pass literals from a handlebars template to this function, use the following format:
  // {{t "sa.remove_exam_title" "" this}} <- hbs template (this is a object that has a title property)
  // "remove_exam_title": "Haluatko poistaa kokeen __title__?", <- fin.json
  Handlebars.registerHelper('t', (i18nKeyOrPrefix, i18nKey, options) => {
    var prefixGiven = i18nKey && typeof i18nKey === 'string'

    var prefix = prefixGiven ? `${i18nKeyOrPrefix}.` : ''
    var key = prefixGiven ? i18nKey : i18nKeyOrPrefix

    var result = i18n.t(prefix + key, options)
    return new Handlebars.SafeString(result)
  })

  Handlebars.registerHelper('tr', (context, options) => {
    var opts = i18n.functions.extend(options.hash, context)
    if (options.fn) opts.defaultValue = options.fn(context)
    var result = i18n.t(opts.key, opts)
    return new Handlebars.SafeString(result)
  })

  return {
    changeLanguage: function (languageCode) {
      i18n.setLng(languageCode, () => {
        $('[data-i18n]').i18n()
      })
    }
  }
}
