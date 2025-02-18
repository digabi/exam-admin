import { Attachments, Exam, InitialCasStatus } from '@digabi/exam-engine-core'
import React from 'react'
import { PreviewTab, Translations } from './util'
import { noopExamServerAPI } from '../noopExamServerAPI'

export const Preview = (props: {
  masteredXml: XMLDocument | string | null
  language: string
  attachmentsUrl: string
  previewTab: PreviewTab
  visualEditorRendered: boolean
  t: Translations
}) => {
  const { masteredXml, attachmentsUrl, previewTab, visualEditorRendered, language, t } = props

  if (masteredXml == null) {
    return (
      <main className="e-exam" lang="fi-FI" aria-labelledby="title">
        <section className="e-section e-bg-color-off-white e-pad-6">
          <h1>{t.no_exam_selected}</h1>
        </section>
      </main>
    )
  }

  if (typeof masteredXml == 'string') {
    return (
      <main className="e-exam" lang="fi-FI" aria-labelledby="title">
        <section className="e-section e-bg-color-off-white e-pad-6">
          <h1>{t.conversion_failed}</h1>
        </section>
      </main>
    )
  }

  const resolveAttachment = (name: string) => `${attachmentsUrl}/${encodeURIComponent(name)}`
  const previewProps = {
    doc: masteredXml,
    language,
    attachmentsURL: 'attachments',
    resolveAttachment,
    answers: [],
    restrictedAudioPlaybackStats: [],
    casStatus: 'forbidden' as InitialCasStatus,
    examServerApi: noopExamServerAPI(resolveAttachment)
  }

  const key = Array.from(masteredXml.querySelectorAll('audio'))
    .map(a => a.getAttribute('times') || '-')
    .join(',')

  switch (previewTab) {
    case 'EXAM':
      return visualEditorRendered && <Exam key={key} {...previewProps} />
    case 'MATERIAL':
      return <Attachments key={key} {...previewProps} />
    default:
      return <></>
  }
}
