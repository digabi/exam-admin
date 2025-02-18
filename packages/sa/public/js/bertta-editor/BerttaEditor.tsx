import React, { MouseEventHandler, ReactElement, useEffect, useState } from 'react'
import '@fortawesome/fontawesome-free/css/all.css'
import './BerttaEditor.less'
import '@digabi/exam-engine-core/dist/main.css'
import classNames from 'classnames'
import { parseExam } from '@digabi/exam-engine-core'
import { Preview } from './Preview'

import {
  Attachment,
  BerttaExam,
  debounced,
  doReq,
  EditorTab,
  ErrorObject,
  ErrorResponse,
  FilterOptionsResponse,
  Language,
  parse,
  parserError,
  PreviewTab,
  QuestionResponse,
  SaveExamRequest,
  SaveExamResponse,
  serialize,
  Translations,
  UsedAttachment
} from './util'
import { Attachments } from './Attachments'
import { MonacoEditor } from './MonacoEditor'
import { VisualEditor } from './visual-editor/VisualEditor'
import { QuestionPicker } from './exam-import-tab/QuestionPicker'
import prettifyXml from 'xml-formatter'
import { ExamPasswordEditor } from './ExamPasswordEditor'
import { fi } from './locales/fi'
import { sv } from './locales/sv'
import { ErrorBanner } from './ErrorBanner'
import { ExamFilterQuery } from './exam-import-tab/PublicExamFilters'

type TabGroup = 'EDITOR' | 'PREVIEW'
function getTranslations(locale: Language): Translations {
  return locale === 'fi-FI' ? fi : sv
}

type BerttaTabParams = {
  selected: boolean
  onClick: MouseEventHandler
  fa: string
  dataTestSelector?: string
  text: string
}

type PreviewTabParams = {
  newPreviewTab: PreviewTab
  fa: string
  columnLayout?: boolean
}

type EditorTabParams = {
  newEditorTab: EditorTab
  fa: string
  columnLayout?: boolean
}

export const BerttaEditor = (props: {
  defaultExamLanguage: Language
  examUuid: string
  endpoints: {
    getExam: (examUuid?: string) => Promise<BerttaExam>
    saveExam: (saveExamRequest: SaveExamRequest) => Promise<SaveExamResponse>
    attachmentsUrl: string
    loadQuestions: () => Promise<QuestionResponse>
    loadPublicQuestions: (filterQuery: ExamFilterQuery) => Promise<QuestionResponse>
    saveExamPassword: (password: string) => Promise<void>
    backUrl?: string
    loadFilterOptions: () => Promise<FilterOptionsResponse>
  }
}): ReactElement => {
  const {
    defaultExamLanguage,
    examUuid,
    endpoints: {
      getExam,
      saveExam,
      attachmentsUrl,
      loadQuestions,
      loadPublicQuestions,
      loadFilterOptions,
      saveExamPassword,
      backUrl
    }
  } = props
  const [xml, setXml] = useState<string>()
  const [xmlDocument, setXmlDocument] = useState<XMLDocument>()
  const [masteredXml, setMasteredXml] = useState<XMLDocument | null>(null)
  const [masteredXmlForCopy, setMasteredXmlForCopy] = useState<{
    xml: XMLDocument | string | null
    importUrl: string
  }>()
  const [language, setLanguage] = useState<Language>('fi-FI')
  const [examPassword, setExamPassword] = useState<string>('')
  const [examLocked, setExamLocked] = useState<boolean>(false)
  const [saved, setSaved] = useState<string>('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [error, setError] = useState<ErrorObject>(null)
  const [editorTab, setEditorTab] = useState<EditorTab>('STYLED')
  const [tabGroup, setTabGroup] = useState<TabGroup>('EDITOR')
  const [previewTab, setPreviewTab] = useState<PreviewTab>('EXAM')
  const [usedAttachments, setUsedAttachments] = useState<UsedAttachment[]>([])
  const [visualEditorRendered, setVisualEditorRendered] = useState<boolean>(false)
  const t = getTranslations(defaultExamLanguage)

  useEffect(() => {
    let isCancelled = false
    setError(null)
    getExam()
      .then(({ contentXml, examLanguage, password, locked, masteredXml, usedAttachments, title }) => {
        if (isCancelled) return
        const xmlWithTitle = addTitleIfMissing(contentXml, title)
        setExamPassword(password)
        setExamLocked(locked)
        setXml(xmlWithTitle)
        setXmlDocument(parse(xmlWithTitle))
        setMasteredXml(parseExam(masteredXml, true))
        setUsedAttachments(usedAttachments)
        setLanguage(examLanguage)
        return loadAttachments().then(att => setAttachments(att))
      })
      .catch((err: ErrorResponse) => {
        if (isCancelled) return
        setError({ title: t.error.connection_error, message: `Error: ${err.message}` })
      })
    return () => {
      isCancelled = true
    }
  }, [])

  function addTitleIfMissing(xml: string, title: string) {
    const parsedXml = parse(xml)
    if (!parsedXml.querySelector('exam-title')) {
      parsedXml.querySelector('exam-versions')!.insertAdjacentHTML('afterend', `<e:exam-title>${title}</e:exam-title>`)
      return serialize(parsedXml)
    }
    return xml
  }

  function titleAndLanguage(xmlDocument: XMLDocument) {
    const title = xmlDocument.querySelector('exam-title')?.textContent || 'Uusi koe'
    const languages = Array.from(xmlDocument.querySelectorAll('exam-version')).map(
      x => x.getAttribute('lang') as Language
    )
    const examLanguage: Language = languages.length > 1 ? defaultExamLanguage : languages[0]
    return { title, examLanguage }
  }

  async function loadAttachments(): Promise<Attachment[]> {
    return doReq<Attachment[]>('GET', attachmentsUrl)
  }

  async function trySaveExam(xmlDocument: XMLDocument, name: string) {
    const error = parserError(xmlDocument)
    if (error) {
      setError({ title: t.error.parse_error, message: error })
      return
    }
    setError(null)
    const newXml = prettifyXml(serialize(xmlDocument), { lineSeparator: '\n', collapseContent: true })
    if (xml === newXml) {
      return
    }
    setXml(newXml)
    setXmlDocument(xmlDocument)
    const { title, examLanguage } = titleAndLanguage(xmlDocument)
    try {
      const { xml, usedAttachments } = await saveExam({
        examLanguage,
        content: {
          title,
          xml: newXml
        }
      })
      setMasteredXml(parseExam(xml, true))
      setLanguage(examLanguage)
      setUsedAttachments(usedAttachments)
      setSaved(name)
    } catch (err) {
      const errorResponse = err as ErrorResponse
      setError({
        title: t.error.parse_error,
        message: errorResponse.status === 413 ? t.error.too_large : errorResponse.message
      })
    }
  }

  async function doSaveDebounced(name: string, preSaveFn: () => XMLDocument) {
    setSaved('')
    await new Promise(resolve =>
      debounced(() => void trySaveExam(preSaveFn(), name).finally(() => resolve('')), 'saveExam', 1000)
    )
  }

  function EditorTab({ newEditorTab, fa, columnLayout = false }: EditorTabParams) {
    return (
      <BerttaTab
        onClick={() => {
          setEditorTab(newEditorTab)
          setTabGroup('EDITOR')
        }}
        dataTestSelector={`${newEditorTab.toLocaleLowerCase()}-tab${columnLayout ? '' : '-narrow'}`}
        selected={editorTab === newEditorTab && (columnLayout || tabGroup === 'EDITOR')}
        fa={fa}
        text={t.tab[newEditorTab]}
      />
    )
  }

  function PreviewTab({ newPreviewTab, fa, columnLayout = false }: PreviewTabParams) {
    return (
      <BerttaTab
        onClick={() => {
          setPreviewTab(newPreviewTab)
          setTabGroup('PREVIEW')
        }}
        dataTestSelector={`${newPreviewTab.toLocaleLowerCase()}-tab${columnLayout ? '' : '-narrow'}`}
        selected={previewTab === newPreviewTab && (columnLayout || tabGroup === 'PREVIEW')}
        fa={fa}
        text={t.tab[newPreviewTab]}
      />
    )
  }

  function BerttaTab({ selected, onClick, fa, dataTestSelector, text }: BerttaTabParams) {
    return (
      <button
        {...{ className: classNames('editorTab', { selected }), onClick, 'data-test-selector': dataTestSelector }}
      >
        <i className={classNames('fa', fa)} aria-hidden="true" /> {text}
      </button>
    )
  }

  function clickInPreview(e: React.MouseEvent<HTMLElement>) {
    const target = e.target
    if (target instanceof HTMLAnchorElement && target.target === 'attachments') {
      e.preventDefault()
      setPreviewTab('MATERIAL')
      document.location.hash = target.hash
    }
  }

  return (
    <>
      <div className="header">
        {backUrl && (
          <a className="returnToEvents" href={backUrl}>
            <i className="fas fa-arrow-left"></i>
          </a>
        )}
      </div>
      <div className="content">
        {error && <ErrorBanner {...{ error, setError, t }} />}

        <div className="berttaEditor">
          <div data-last-saved={saved}>
            <i className="fas fa-check"></i> {t.saved}
          </div>
          <div className="combinedTabBar">
            <EditorTab newEditorTab={'STYLED'} fa="fa-pencil-ruler" />
            <EditorTab newEditorTab={'RAW'} fa="fa-code" />
            <EditorTab newEditorTab={'ATTACHMENTS'} fa="fa-paperclip" />
            <EditorTab newEditorTab={'QUESTIONPICKER'} fa="fa-file-import" />
            <EditorTab newEditorTab={'EXAMPASSWORD'} fa="fa-key" />
            <PreviewTab newPreviewTab={'EXAM'} fa="fa-eye" />
            <PreviewTab newPreviewTab={'MATERIAL'} fa="fa-book-open" />
          </div>
          <div className={classNames('editorContainer', { inactive: tabGroup === 'PREVIEW' })}>
            <div className="editorTabBar">
              <EditorTab newEditorTab={'STYLED'} fa="fa-pencil-ruler" columnLayout={true} />
              <EditorTab newEditorTab={'RAW'} fa="fa-code" columnLayout={true} />
              <EditorTab newEditorTab={'ATTACHMENTS'} fa="fa-paperclip" columnLayout={true} />
              <EditorTab newEditorTab={'QUESTIONPICKER'} fa="fa-file-import" columnLayout={true} />
              <EditorTab newEditorTab={'EXAMPASSWORD'} fa="fa-key" columnLayout={true} />
            </div>
            <div className="editor column">
              <Attachments
                {...{
                  className: classNames('attachmentsContainer basicContainer', { hidden: editorTab !== 'ATTACHMENTS' }),
                  examLocked,
                  visualEditorRendered,
                  attachmentsUrl,
                  attachments,
                  setAttachments,
                  setError,
                  t,
                  usedAttachments
                }}
              />
              {xmlDocument && editorTab == 'STYLED' && (
                <VisualEditor
                  {...{
                    language,
                    xmlDocument,
                    doSaveDebounced,
                    setError,
                    attachmentsUrl,
                    t,
                    editorTab,
                    setPreviewTab,
                    setAttachments,
                    attachments,
                    setVisualEditorRendered
                  }}
                />
              )}
              {editorTab == 'RAW' && (
                <div className="monacoEditorContainer">{xml && <MonacoEditor {...{ xml, doSaveDebounced }} />}</div>
              )}
              {xml && editorTab == 'QUESTIONPICKER' && (
                <QuestionPicker
                  {...{
                    examUuid,
                    loadQuestions,
                    loadPublicQuestions,
                    getExam,
                    attachmentsUrl,
                    xmlDocument,
                    setMasteredXmlForCopy,
                    doSaveDebounced,
                    setError,
                    setAttachments,
                    t,
                    defaultExamLanguage,
                    loadFilterOptions
                  }}
                />
              )}
              {editorTab == 'EXAMPASSWORD' && (
                <ExamPasswordEditor {...{ saveExamPassword, examPassword, setExamPassword, setSaved, setError, t }} />
              )}
            </div>
          </div>
          <div className={classNames('previewContainer', { inactive: tabGroup === 'EDITOR' })}>
            <div className="previewTabBar">
              <PreviewTab newPreviewTab={'EXAM'} fa="fa-eye" columnLayout={true} />
              <PreviewTab newPreviewTab={'MATERIAL'} fa="fa-book-open" columnLayout={true} />
            </div>
            <div className="preview column" onClick={e => clickInPreview(e)}>
              {editorTab == 'QUESTIONPICKER' && (
                <Preview
                  {...{
                    masteredXml: masteredXmlForCopy?.xml || null,
                    attachmentsUrl: masteredXmlForCopy?.importUrl || '#',
                    previewTab,
                    visualEditorRendered,
                    language,
                    t
                  }}
                />
              )}
              {editorTab != 'QUESTIONPICKER' && (
                <Preview
                  {...{
                    masteredXml,
                    attachmentsUrl,
                    previewTab,
                    visualEditorRendered,
                    language,
                    t
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
