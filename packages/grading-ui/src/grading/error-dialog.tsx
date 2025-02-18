import React, { useContext } from 'react'
import { ErrorProps } from './types'
import { useTranslation } from 'react-i18next'
import { GradingUrlsContext } from './grading-view'

export default ErrorDialog

function ErrorDialog(props: ErrorProps) {
  const {
    err: { localizeKey, options }
  } = props
  const { t } = useTranslation()
  const gradingUrls = useContext(GradingUrlsContext)

  const reload = () => window.location.reload()

  return (
    <div className="overlay-wrapper">
      <div id="disabled-background" tabIndex={-1} />
      <div id="floating-error" className="floating-panel">
        <div className="error-symbol">⚠</div>
        <div className="message localized-error">
          <span dangerouslySetInnerHTML={{ __html: t(localizeKey) }} />
          <br />
          {t(options?.showReload ? 'arpa.errors.reload_page_to_continue' : 'arpa.errors.try_again')}
        </div>
        {options?.logoutButton && (
          <button id="logout-on-error" className="button" onClick={() => window.location.assign(gradingUrls.logout())}>
            {t('sa.logout')}
          </button>
        )}
        {options?.showReload && (
          <button className="button" id="reload-page" onClick={() => reload()}>
            {t('arpa.errors.reload_page')}
          </button>
        )}
        &nbsp;
        {options?.close && (
          <button className="button" id="close-page" onClick={() => options.close?.()}>
            {t('arpa.errors.close')}
          </button>
        )}
      </div>
    </div>
  )
}
