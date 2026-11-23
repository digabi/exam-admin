import classNames from 'classnames'
import React from 'react'
import { useTranslation } from 'react-i18next'

export const HeldExamMinutesLink = ({
  hasMinutes,
  minutesViewUrl
}: {
  hasMinutes?: boolean
  minutesViewUrl?: string
}) => {
  const { t } = useTranslation()

  if (hasMinutes === undefined) {
    return null
  }

  return (
    <>
      <i
        className={classNames('fa-regular fa-clipboard', {
          'has-minutes': hasMinutes
        })}
      />
      {hasMinutes && minutesViewUrl ? <a href={minutesViewUrl}>{t('sa.show_minutes')}</a> : t('sa.no_minutes')}
    </>
  )
}
