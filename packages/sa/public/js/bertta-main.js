import { createRoot } from 'react-dom/client'
import React from 'react'
import { BerttaEditor } from './bertta-editor/BerttaEditor.tsx'
import { doReq } from './bertta-editor/util'

const examUuid = document.location.pathname
  .split('/')
  .filter(x => x)
  .pop()

const berttaContainer = document.getElementById('bertta')
window.onerror = function (message, source, lineno, colno, error) {
  fetch(`/exam-api/composing/${examUuid}/error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ message, source, lineno, colno, error: error.stack, userAgent: navigator.userAgent })
  })
  return false
}
init()

async function init() {
  try {
    const defaultLanguageRequest = await fetch(`/kurko-api/settings/exam-language`)
    const { defaultExamLanguage } = await defaultLanguageRequest.json()
    const root = createRoot(berttaContainer)
    root.render(
      React.createElement(BerttaEditor, {
        defaultExamLanguage,
        examUuid,
        endpoints: {
          getExam: (uuid = examUuid) => doReq('get', `/exam-api/exams/${uuid}/exam`),
          saveExam: saveExamRequest =>
            doReq('POST', `/exam-api/composing/${examUuid}/exam-content`, JSON.stringify(saveExamRequest)),
          attachmentsUrl: `/exam-api/exams/${examUuid}/attachments`,
          loadQuestions: () => doReq('GET', `/kurko-api/exam/questions`),
          loadPublicQuestions: filterQuery =>
            doReq('GET', `/kurko-api/exam/public-questions?${new URLSearchParams(filterQuery).toString()}`),
          loadFilterOptions: () => doReq('GET', `/kurko-api/exam/public-questions/filters`),
          saveExamPassword: password =>
            doReq('POST', `/kurko-api/exam/password/${examUuid}`, JSON.stringify({ password })),
          backUrl: '/school/exams'
        }
      })
    )
  } catch (error) {
    berttaContainer.innerHTML = error.message
  }
}
