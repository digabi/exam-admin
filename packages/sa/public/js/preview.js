import './init-side-effects'
import _ from 'lodash'
import * as Bacon from 'baconjs'
import { Attachments, Exam, parseExam } from '@digabi/exam-engine-core'
import '@digabi/exam-engine-core/dist/main.css'
import i18next from 'i18next'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import * as i18n from './i18n'
import * as sautils from './sa-utils'
import utils from './utils'
import { noopExamServerAPI } from './noopExamServerAPI'

class ExamRoot extends React.Component {
  constructor() {
    super()
    this.state = {
      initialAnswers: null,
      examServerApi: null
    }
  }

  render() {
    const language = i18next.language === 'sv' ? 'sv-FI' : 'fi-FI'
    const { routeId, eventId } = sautils.parseRouteAndEventUuidFromLocation()
    const examUuid = eventId || this.props.examUuid
    const Root = routeId === 'attachments' ? Attachments : Exam

    const resolveAttachment = name => `/exam-api/exams/${examUuid}/attachments/${encodeURIComponent(name)}`
    return React.createElement(Root, {
      doc: this.props.examDocument,
      language,
      attachmentsURL: `/school/preview/${examUuid}/attachments`,
      resolveAttachment,
      answers: [],
      restrictedAudioPlaybackStats: [],
      casStatus: 'forbidden',
      examServerApi: noopExamServerAPI(resolveAttachment)
    })
  }
}

const path = window.location.pathname

i18n.init(() => {
  if (path.indexOf('/exams/') === 0) {
    renderStudentExam()
  } else {
    renderTeacherExam()
  }
})

function renderStudentExam() {
  addLocalizedErrorMessages()
  const loadExamE = filteredExamE()
  loadExamE.filter(e => e.masteredXml).onValue(renderXmlExam)
  loadExamE.onError(showExamError)
}

function renderTeacherExam() {
  addLocalizedErrorMessages()
  const loadExamE = refreshingExamE().skipDuplicates(_.isEqual)
  loadExamE.filter(e => e.masteredXml).onValue(renderXmlExam)
  loadExamE.onError(showExamError)
}

function renderXmlExam(exam) {
  const root = createRoot(document.getElementById('exam-view'))
  root.render(
    React.createElement(ExamRoot, { examDocument: parseExam(exam.masteredXml, true), examUuid: exam.examUuid })
  )
}

function filteredExamE() {
  return Bacon.once().flatMap(() => utils.bacon.get(`/exam-api/grading/student/exam/${sautils.getTokenFromURL()}`))
}

function isTabHidden() {
  if (typeof document.hidden !== 'undefined') {
    // Opera 12.10 and Firefox 18 and later support
    return document.hidden
  } else if (typeof document.msHidden !== 'undefined') {
    return document.msHidden
  } else if (typeof document.webkitHidden !== 'undefined') {
    return document.webkitHidden
  } else return false
}
function refreshingExamE() {
  const eventId = sautils.parseRouteAndEventUuidFromLocation().eventId
  return Bacon.fromBinder(sink => {
    let id
    document.addEventListener('refresh', refresh)
    refresh()
    return () => window.clearTimeout(id)

    function refresh() {
      if (isTabHidden()) {
        id = window.setTimeout(refresh, 10000)
      } else {
        const internalE = Bacon.once().flatMap(() => utils.bacon.get(`/exam-api/exams/${eventId}/exam`))
        internalE.onValue(exam => {
          sink(exam)
          if (!window.opener) {
            id = window.setTimeout(refresh, 10000)
          }
        })
        internalE.onError(err => {
          sink(new Bacon.Error(err))
        })
      }
    }
  }).endOnError()
}

function showExamError(error) {
  const errorMsgKey = error.status === 404 ? 'exam_not_found' : 'exam_loading_failed'
  sautils.ui.showLocalizedError(errorMsgKey)
}

function addLocalizedErrorMessages() {
  const langResFin = {
    exam_not_found: 'Koetta ei löytynyt, tarkista osoite.',
    exam_loading_failed: 'Kokeen lataus epäonnistui. Yritä hetken kuluttua uudelleen.',
    see_attachments_at_ktp:
      'Haluatko esikatsella liitteitä? Lataa koetehtävät koetilan palvelimelle ja käynnistä tietokone opiskelijan tikulta.'
  }
  const langResSwe = {
    exam_not_found: 'Provet hittades inte, kontrollera adressen.',
    exam_loading_failed: 'Provet kunde inte laddas. Försök på nytt om ett ögonblick.',
    see_attachments_at_ktp:
      'Vill du förhandsgranska bilagor? Ladda provuppgifterna till provlokalens server och starta en dator från studerandens sticka.'
  }
  i18next.addResources('fi', 'translation', langResFin)
  i18next.addResources('sv', 'translation', langResSwe)
}
