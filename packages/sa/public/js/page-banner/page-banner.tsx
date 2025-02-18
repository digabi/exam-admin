import React, { createElement, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { doReq } from '../bertta-editor/util'
import * as i18nHelpers from '../i18n-hbs-helpers'
import * as i18n from '../i18n'
import i18next from 'i18next'

import '../../../less/page-banner.less'

export function PageBanner(props: { userName?: string }) {
  const [loginError, setLoginError] = useState(false)
  const [credentials, setCredentials] = useState({ username: '', password: '' })

  const login = async () => {
    try {
      await doReq('POST', '/kurko-api/user/login', JSON.stringify(credentials))
      window.location.href = window.location.pathname + window.location.search
    } catch (err) {
      setLoginError(true)
    }
  }

  return (
    <BannerContainer>
      <div id="login" style={{ display: props.userName ? 'none' : 'block' }}>
        <label>
          <span className="field-description" data-i18n="sa.email"></span>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={credentials.username}
            onChange={e => {
              setCredentials({ ...credentials, username: e.target.value })
              setLoginError(false)
            }}
          />
        </label>
        <label>
          <span className="field-description" data-i18n="sa.password"></span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={credentials.password}
            onChange={e => setCredentials({ ...credentials, password: e.target.value })}
          />
        </label>
        <button className="login" data-i18n="sa.login" onClick={() => void login()}></button>
        <div
          className="wrong-username-or-password"
          data-i18n="sa.wrong_credentials"
          style={{ display: loginError ? 'block' : 'none' }}
        ></div>
      </div>

      <div className="logged-in-user" style={{ display: props.userName ? 'block' : 'none' }}>
        <div className="logged-in-user-flex">
          <div className="user-email">{props.userName}</div>
          <a className="logout" data-i18n="sa.logout" data-testid={'logout'} href="/kurko-api/user/logout"></a>
        </div>
      </div>

      <LanguageSelection />
    </BannerContainer>
  )
}

export function PageBannerWithoutUser() {
  return (
    <BannerContainer>
      <LanguageSelection />
    </BannerContainer>
  )
}

function BannerContainer(props: { children: React.ReactNode }) {
  return (
    <div id="pagebanner">
      <div className="banner-content" data-testid={'page-banner'}>
        <BannerLogo />
        <div className="user-area">{props.children}</div>
      </div>
    </div>
  )
}

function BannerLogo() {
  return (
    <div className="banner-left">
      <a href="/root-page">
        <div className="brand-image" />
      </a>
    </div>
  )
}

function LanguageSelection() {
  const lang = useLanguage()

  useEffect(() => {
    i18n.init(() => {})
  }, [])

  const changeLanguage = (lang: 'fi' | 'sv') => {
    i18nHelpers.changeLanguage(lang)
    localStorage.setItem('gradingLang', lang)
  }

  if (!lang) {
    return
  }

  const languages = ['fi', 'sv'] as const

  return (
    <div className="language-selection">
      {languages.map(language => (
        <React.Fragment key={`language-${language}`}>
          <input
            type="radio"
            name="language"
            id={`language-${language}`}
            value={language}
            defaultChecked={lang == language}
            onClick={() => changeLanguage(language)}
          />
          <label htmlFor={`language-${language}`}>{language.toUpperCase()}</label>
        </React.Fragment>
      ))}
    </div>
  )
}

export function createContainer(component: () => React.JSX.Element, props: Record<string, unknown>) {
  const container = document.createElement('div')
  const reactElement = createElement(component, props)
  const root = createRoot(container)
  root.render(reactElement)
  return container
}

export const useLanguage = () => {
  const [language, setLanguage] = useState(i18next.language)
  useEffect(() => {
    i18next.on('languageChanged', setLanguage)

    return () => {
      i18next.off('languageChanged', setLanguage)
    }
  }, [])

  return language as 'fi' | 'sv'
}
