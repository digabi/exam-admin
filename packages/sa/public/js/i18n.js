import i18n from 'i18next'
import jqI18next from 'jquery-i18next'
import i18nXhr from 'i18next-xhr-backend'
import i18nLangDetector from 'i18next-browser-languagedetector'
import $ from 'jquery'
import _ from 'lodash'
import { fi } from '../locales/fi'
import { sv } from '../locales/sv'
import { fiOverrides } from '../locales/fi_overrides'
import { svOverrides } from '../locales/sv_overrides'

const migrateLanguageCookie = () => {
  const cookieParts = document.cookie.split(';').map(c => c.trim())
  const saLangCookie = _.find(cookieParts, c => _.includes(c, 'saLang'))
  if (!saLangCookie) {
    return false
  }

  const languageMapping = { fin: 'fi', swe: 'sv' }
  const lang = saLangCookie.split('=')[1]

  if (!languageMapping[lang]) {
    return false
  }

  const newLang = `saLang=${languageMapping[lang]}`
  document.cookie = newLang
  return true
}

migrateLanguageCookie()

const fallbackLng = 'fi'
const detectionOptions = {
  order: ['cookie'],
  lookupCookie: 'saLang',
  cookieMinutes: 5 * 365 * 24,
  caches: ['cookie']
}

const i18nConfig = {
  useCookie: true,
  detection: detectionOptions,
  fallbackLng: fallbackLng,
  returnNull: false,
  resources: getTranslationResources()
}

function getTranslationResources() {
  return { fi: { translation: _.merge(fi, fiOverrides) }, sv: { translation: _.merge(sv, svOverrides) } }
}

export function init(callback) {
  i18n
    .use(i18nXhr)
    .use(i18nLangDetector)
    .init(i18nConfig, () => {
      jqI18next.init(i18n, $, {
        useOptionsAttr: true
      })
      $('[data-i18n]').localize()
      callback(i18n.language || fallbackLng)
    })
}
