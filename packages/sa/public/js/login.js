import $ from 'jquery'
import utils from './utils'

const $login = $('form#login')
const loginPostsE = $login
  .asEventStream('submit')
  .doAction(event => event.preventDefault())
  .map(readCredentialsFromDom)
  .flatMapLatest(postLoginCredentials)

loginPostsE.onValue(performTraditionalSubmit)
loginPostsE.onError(showWrongUsernameOrPassword)

$login.asEventStream('input', 'input').onValue(hideWrongUsernameOrPassword)

export function show() {
  $('#login').css('display', 'inline-block')
}

function readCredentialsFromDom() {
  return {
    username: $login.find('input[name="username"]').val(),
    password: $login.find('input[name="password"]').val()
  }
}

function postLoginCredentials(credentials) {
  return utils.bacon.postJson('/kurko-api/user/login', credentials)
}

function showWrongUsernameOrPassword() {
  $login.find('.wrong-username-or-password').hide().fadeIn()
}

function hideWrongUsernameOrPassword() {
  $login.find('.wrong-username-or-password').fadeOut()
}

function performTraditionalSubmit() {
  $login
    .off('submit')
    .find('input[name="redirectUri"]')
    .val(window.location.pathname + window.location.search)
    .end()
    .submit()
}
