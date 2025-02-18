import React from 'react'
import './footer.less'
import config from '../config'

export function Footer() {
  const contactInformation = config.contactInformation
  return contactInformation ? (
    <div className="content">
      <div className="footer-column">
        <div>
          <h5 data-i18n={contactInformation.titleKey} />
          <p>
            <a href={`mailto:${contactInformation.footerEmail}`}>{contactInformation.footerEmail}</a>
          </p>
          <p>
            <a href={`tel:${contactInformation.footerPhone.replace(/\s/g, '')}`}>
              {contactInformation.footerPhone} <span data-i18n="footer.office_hours" />
            </a>
          </p>
        </div>
      </div>
      <div className="footer-column wide-column">
        {contactInformation.footerLinks.map(link => (
          <p key={link.url}>
            <a className="with-logo" href={link.url}>
              <span data-i18n={link.titleKey} />
            </a>
          </p>
        ))}
      </div>
      <div className="footer-column">
        <p data-i18n="footer.copy" />
      </div>
    </div>
  ) : null
}
