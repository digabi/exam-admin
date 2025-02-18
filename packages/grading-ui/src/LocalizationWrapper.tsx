import React from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { Language } from './common/types'
import i18next from './locales/i18n'

/**
 * Used to wrap components from the library when used individually from the top-level components
 * Assumes the main application also uses i18next and gets the current laguage from there
 */

export function LocalizationWrapper({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const lang = i18n.language as Language
  return <I18nextProvider i18n={i18next(lang)}>{children}</I18nextProvider>
}
