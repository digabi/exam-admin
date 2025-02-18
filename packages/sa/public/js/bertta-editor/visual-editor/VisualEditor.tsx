import React, { useEffect, useRef } from 'react'
import {
  Attachment,
  EditorTab,
  ErrorObject,
  Language,
  parserError,
  serialize,
  SetAttachments,
  SetPreviewTab,
  Translations
} from '../util'
import classNames from 'classnames'
import './VisualEditor.less'
import { modifyXmlDocumentForUi, updateRootQuestionClasses } from './VisualEditorRenderer'
import { initRichTextEditor } from './VisualEditorRichTextEditor'
import { initScrollIntoViewIfNeededPolyfill } from '../scrollIntoViewIfNeededPolyfill'
import { blurHandler } from './BlurHandler'
import { setFocus } from './VisualEditorUtil'
import { clickHandler } from './ClickHandler'
import { inputHandler } from './InputHandler'
import { keyDownHandler } from './KeyDownHandler'

initScrollIntoViewIfNeededPolyfill()

export const VisualEditor = (props: {
  language: Language
  xmlDocument: XMLDocument
  doSaveDebounced: (name: string, preSaveFn: () => XMLDocument) => Promise<void>
  setError: (errorObject: ErrorObject) => void
  attachmentsUrl: string
  t: Translations
  editorTab: EditorTab
  setPreviewTab: SetPreviewTab
  setAttachments: SetAttachments
  attachments: Attachment[]
  setVisualEditorRendered: (value: boolean) => void
}) => {
  const {
    xmlDocument,
    doSaveDebounced,
    setError,
    language,
    attachmentsUrl,
    t,
    editorTab,
    setPreviewTab,
    setAttachments,
    attachments,
    setVisualEditorRendered
  } = props
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const editorContainer = ref.current
    if (editorContainer) {
      editorContainer.innerHTML = asHtml(xmlDocument, t)
      initRichTextEditor(editorContainer, attachmentsUrl, t, doSaveDebounced, setAttachments)
      updateRootQuestionClasses(editorContainer)
      document.execCommand('defaultParagraphSeparator', false, 'br')
      setFocus(editorContainer.querySelector<HTMLElement>('e\\:exam-title')!, editorContainer, setPreviewTab)
      setVisualEditorRendered(true)
    }
  }, [editorTab])

  function asHtml(doc: XMLDocument, t: Translations): string {
    const error = parserError(doc)
    if (error) {
      setError({ title: t.error.parse_error, message: error })
      return ''
    }
    const modifiedDoc = modifyXmlDocumentForUi(doc, t, attachmentsUrl)
    return serialize(modifiedDoc)
      .replace(/<span class="e-underline">(.*?)<\/span>/gs, '<u>$1</u>')
      .replace(/<e:([a-z-^]+)([^>]*)\/>/g, '<e:$1$2></e:$1>')
      .replace(/<i ([a-z-^]+)([^>]*)\/>/g, '<i $1$2></i $1>')
  }

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className={classNames('e-exam visualEditorContainer basicContainer', language, t.class_name)}
      data-test-selector="exam-styled"
      onInput={onInput}
      onDragStart={onDragStart}
    />
  )

  function onMouseDown(e: React.MouseEvent<HTMLDivElement>): void {
    clickHandler(doSaveDebounced, e, attachmentsUrl, setError, t, ref.current!, setPreviewTab, attachments)
  }

  function onBlur(event: React.FocusEvent<HTMLDivElement>) {
    blurHandler(event, ref.current!)
  }
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    keyDownHandler(doSaveDebounced, event, ref.current!, setPreviewTab, t)
  }

  function onInput(event: React.FormEvent<HTMLDivElement>) {
    inputHandler(ref.current!, doSaveDebounced, event.target as HTMLDivElement)
  }

  function onDragStart(e: React.DragEvent<HTMLDivElement>) {
    return e.preventDefault()
  }
}
