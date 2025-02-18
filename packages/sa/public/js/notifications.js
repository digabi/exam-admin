import $ from 'jquery'
import i18n from 'i18next'
import _ from 'lodash'

const $root = $('#notifications')

export function init() {
  const cookie = document.cookie
    .split('; ')
    .find(cookie => _.startsWith(cookie, 'notification-info=') || _.startsWith(cookie, 'notification-error='))

  if (cookie) {
    const [level, key] = cookie.split('=')
    const show = level === 'notification-info' ? info : error
    const msg = i18n.t(key)

    clearNotificationCookies()

    show(msg)
  }

  $root.asEventStream('click', '.notification-close').onValue(hide)
}

export function info(msg) {
  $root.addClass('notification--info notification-bar--visible').find('.notification-text').text(msg)
}

export function error(msg) {
  $root.addClass('notification-bar--error notification-bar--visible').find('.notification-text').text(msg)
}

export function hide() {
  $root.removeClass('notification-bar--visible')
}

const deleteCookie = name => {
  document.cookie = `${name}=; max-age=0`
}

const clearNotificationCookies = () => {
  deleteCookie('notification-info')
  deleteCookie('notification-error')
}
