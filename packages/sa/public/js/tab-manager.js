import $ from 'jquery'
import _ from 'lodash'
import * as Bacon from 'baconjs'
import * as sautils from './sa-utils'
import utils from './utils'

const DEFAULT_TAB = 'exams'

const examsPath = 'exams'
const gradingPath = 'grading'
const teachersPath = 'teachers'
const settingsPath = 'settings'

let myTabs

export function init(updatesE, config) {
  myTabs = config.map(tab => ({
    path: tab.name,
    $link: $(`#${tab.name}-link`),
    $root: tab.$root,
    update: tab.update
  }))

  setupTabChangeHandlers()
  showSelectedOrDefaultTab()

  function setupTabChangeHandlers() {
    const examsClicked = $('#exams-link').asEventStream('click').doAction(goToTab(examsPath))
    const gradingClicked = $('#grading-link').asEventStream('click').doAction(goToTab(gradingPath))
    const teachersClicked = $('#teachers-link').asEventStream('click').doAction(goToTab(teachersPath))
    const settingsClicked = $('#settings-link').asEventStream('click').doAction(goToTab(settingsPath))

    Bacon.mergeAll(examsClicked, gradingClicked, teachersClicked, settingsClicked)
      .doAction(preventDefault)
      .merge($(window).asEventStream('popstate'))
      .merge(updatesE)
      .onValue(showSelectedOrDefaultTab)

    function preventDefault(event) {
      event.preventDefault()
    }

    function goToTab(tabName) {
      return () => {
        $('.clear-when-switching-tab').remove()
        history.pushState(undefined, undefined, `/school/${tabName}`)
      }
    }
  }

  function showSelectedOrDefaultTab() {
    hidePageContentAndStartSpinner()
    const tabPath = getTabFromUrl()
    showTab(getTabOrDefault(tabPath))

    function getTabOrDefault(tabPath) {
      const tab = _.find(myTabs, tab => tabPath === tab.path)
      return tab ? tab : _.find(myTabs, tab => DEFAULT_TAB === tab.path)
    }

    function getTabFromUrl() {
      const path = window.location.pathname
      const lastIndex = path.lastIndexOf('/')
      return lastIndex !== -1 ? path.slice(lastIndex + 1) : ''
    }

    function showTab(tab) {
      tab.update()
      $('#tab-bar a').removeClass('selected')
      tab.$link.addClass('selected')
      $('.tab').hide()
      tab.$root.show()
      showPageContentAndStopSpinner()
    }

    function hidePageContentAndStartSpinner() {
      $('#page-content').hide()
      sautils.ui.startSpinner($('#page-loading-spinner'), utils.ui.spinnerYtlSmall)
    }

    function showPageContentAndStopSpinner() {
      sautils.ui.stopSpinner($('#page-loading-spinner'))
      $('#page-content').show()
    }
  }
}
