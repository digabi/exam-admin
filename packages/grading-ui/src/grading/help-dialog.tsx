import React from 'react'
import { useTranslation } from 'react-i18next'

export function HelpDialog({ setHelpVisible }: { setHelpVisible: (visible: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <div className="overlay-wrapper">
      <div id="disabled-background" tabIndex={-1} onClick={() => setHelpVisible(false)} />
      <div className="floating-panel" style={{ display: 'block' }}>
        <h4>{t('arpa.help.title')}</h4>
        <p>
          {t('arpa.help.left_right')}: <span className="help-key">←</span> / <span className="help-key">→</span>
          <br />
          {t('arpa.help.left_right_alt')}: <span className="help-key">alt</span> + <span className="help-key">←</span> /{' '}
          <span className="help-key">→</span>
          <br />
          {t('arpa.help.up_down')}: <span className="help-key">↑</span> / <span className="help-key">↓</span>
          <br />
          {t('arpa.help.up_down_alt')}: <span className="help-key">alt</span> + <span className="help-key">↑</span> /{' '}
          <span className="help-key">↓</span>
          <br />
          {t('arpa.help.esc')}: <span className="help-key">esc</span>
          <br />
          {t('arpa.help.edit_comment')}: <span className="help-key">ctrl</span>
          <span className="help-key">i</span>
          <br />
          {t('arpa.help.click_question')}
        </p>
        <p>
          <a href={t('arpa.help.link_href')} target="_blank" rel="noreferrer">
            {t('arpa.help.link_title')}
          </a>
        </p>
      </div>
    </div>
  )
}
