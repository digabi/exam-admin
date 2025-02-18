import React from 'react'
import { ErrorObject, Translations } from './util'
import './ErrorBanner.less'

export const ErrorBanner = (props: {
  error: ErrorObject
  setError: (errorObject: ErrorObject) => void
  t: Translations
}) => {
  const { error, setError, t } = props
  return (
    error && (
      <details className="error-banner" open>
        <summary>
          <span className="title">{error.title}</span>
        </summary>
        <div className="error-banner-details">
          <div className="message">{error.message}</div>
          <button
            className="close-error"
            onMouseDown={e => {
              e.preventDefault()
              setError(null)
            }}
          >
            <i className="fa fa-times"></i>
          </button>
          <a className="reload-page" onClick={() => document.location.reload()}>
            {t.reload} <i className="fa fa-undo" />
          </a>
        </div>
      </details>
    )
  )
}
