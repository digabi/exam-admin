import Handlebars from 'handlebars/runtime'
import i18next from 'i18next'
import $ from 'jquery'

// http://i18next.com/pages/doc_templates.html
// To pass literals from a handlebars template to this function, use the following format:
// {{t "sa.remove_exam_title" "" this}} <- hbs template (this is a object that has a title property)
// "remove_exam_title": "Haluatko poistaa kokeen {{title}}?", <- fin.json
Handlebars.registerHelper('t', (i18nKeyOrPrefix, i18nKey, options) => {
  const prefixGiven = i18nKey && typeof i18nKey === 'string'

  const prefix = prefixGiven ? `${i18nKeyOrPrefix}.` : ''
  const key = prefixGiven ? i18nKey : i18nKeyOrPrefix

  const result = i18next.t(prefix + key, options)
  return new Handlebars.SafeString(result)
})

const nextFrame = callback => {
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(callback)
  } else {
    setTimeout(callback, 0)
  }
}

export function changeLanguage(languageCode, callback) {
  i18next.changeLanguage(languageCode, () => {
    nextFrame(() => {
      $('[data-i18n]').localize()

      if (callback) {
        nextFrame(() => callback(languageCode))
      }
    })
  })
}
