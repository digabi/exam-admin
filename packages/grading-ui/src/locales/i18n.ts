import i18next from 'i18next'
import fi from './fi'
import sv from './sv'

const i18n = (lang: 'fi' | 'sv') =>
  i18next.createInstance(
    {
      lng: (lang || localStorage.getItem('gradingLang')) ?? 'fi',
      fallbackLng: 'fi',
      ns: ['translation'],
      defaultNS: 'translation',
      react: { useSuspense: false },
      interpolation: { escapeValue: false },
      resources: getTranslationResources()
    },
    (err, t) => {
      if (err) return console.log(err)
    }
  )

function getTranslationResources() {
  return { fi: { translation: fi }, sv: { translation: sv } }
}

export default i18n
