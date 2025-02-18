import React, { useEffect, useRef } from 'react'
import { editor } from 'monaco-editor'
import IStandaloneCodeEditor = editor.IStandaloneCodeEditor
import './MonacoEditor.less'
import { parse } from './util'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
self.MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: any, label: string) {
    switch (label) {
      case 'json':
        return '/dist/json.worker-bundle.js'
      case 'css':
      case 'scss':
      case 'less':
        return '/dist/css.worker-bundle.js'
      case 'html':
      case 'handlebars':
      case 'razor':
        return '/dist/html.worker-bundle.js'
      case 'typescript':
      case 'javascript':
        return '/dist/ts.worker-bundle.js'
      default:
        return '/dist/editor.worker-bundle.js'
    }
  }
}

let rawEditor: IStandaloneCodeEditor

function showKeyboardHelp() {
  rawEditor.focus()
  rawEditor.trigger('anyString', 'editor.action.quickCommand', undefined)
}

export const MonacoEditor = (props: {
  xml: string
  doSaveDebounced: (name: string, preSaveFn: () => XMLDocument) => Promise<void>
}) => {
  const { xml, doSaveDebounced } = props
  const monacoEditorContainer = useRef(null)

  useEffect(() => {
    const { current } = monacoEditorContainer
    if (current) {
      rawEditor = editor.create(current, {
        value: xml,
        language: 'xml',
        automaticLayout: true,
        wordWrap: 'on',
        minimap: {
          enabled: false
        }
      })
      rawEditor.onDidChangeModelContent(() => doSaveDebounced('exam-raw', () => parse(rawEditor.getValue())))
      rawEditor.focus()
    }
    return () => rawEditor.dispose()
  }, [])

  return (
    <>
      <div className="monacoEditor" ref={monacoEditorContainer} />
      <div className="editorFooter">
        <a target="_blank" href="https://digabi.github.io/exam-engine/MexDocumentation/" rel="noreferrer">
          https://digabi.github.io/exam-engine/MexDocumentation
        </a>
        <button className="keyboardHelp" onClick={() => showKeyboardHelp()} title="F1">
          <i className="fa fa-question-circle" />
        </button>
      </div>
    </>
  )
}
