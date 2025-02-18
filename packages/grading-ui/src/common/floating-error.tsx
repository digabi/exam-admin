import React, { useEffect, createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'

import '../../less/floating-error.less'
import { GradingUrlsContext } from '../grading/grading-view'

export type ErrorKey = 'sa.errors.load_error' | 'sa.errors.answers_fetch_error' | 'sa.errors.answers_missing_xml_error'
export const FloatingErrorContext = createContext<(error: ErrorKey) => void>(() => {})

export const FloatingError = ({
  currentError,
  showButtons = true
}: {
  currentError: ErrorKey | null
  showButtons?: boolean
}) => {
  useEffect(() => {
    document.body.style.overflow = currentError ? 'hidden' : 'auto'
  }, [currentError])
  const { t } = useTranslation()
  const gradingUrls = useContext(GradingUrlsContext)

  if (!currentError) return null

  return (
    <>
      <div id="disabled-background" tabIndex={-1}></div>
      <div id="floating-error">
        <div className="error-symbol">&#x26A0;</div>
        <div className="message localized-error" dangerouslySetInnerHTML={{ __html: t(currentError) }} />
        {showButtons && (
          <>
            <button id="logout-on-error" onClick={() => window.location.assign(gradingUrls.logout())}>
              {t('sa.logout')}
            </button>
            <button id="reload-page" onClick={() => location.reload()}>
              {t('arpa.errors.reload_page')}
            </button>
          </>
        )}
      </div>
    </>
  )
}
