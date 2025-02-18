import {
  changeFocusWithTab,
  dropdownAnswerOption,
  findClosestWithCondition,
  insertDropdownAtCursor,
  insertSingleLineAtCursor,
  setFocus
} from './VisualEditorUtil'
import React from 'react'
import { SetPreviewTab, Translations } from '../util'
import { choiceAnswerOption } from './VisualEditorRenderer'
import { saveOnVisualEditorUpdateWithCallback } from './VisualEditorSaver'

export function keyDownHandler(
  doSaveDebounced: (name: string, preSaveFn: () => XMLDocument) => Promise<void>,
  e: React.KeyboardEvent<HTMLElement>,
  container: HTMLElement,
  setPreviewTab: SetPreviewTab,
  t: Translations
): void {
  if (e.key === 'Enter') {
    const target = e.target as Element
    if (['option-wrapper', 'input'].includes(target.localName)) {
      const optionElement = target.localName === 'input' ? target.parentElement!.parentElement! : target.parentElement!
      optionElement.insertAdjacentHTML(
        'afterend',
        optionElement.localName === 'e:dropdown-answer-option' ? dropdownAnswerOption(t) : choiceAnswerOption(t)
      )
      setFocus(optionElement.nextElementSibling!.querySelector('option-wrapper')!, container, setPreviewTab, true)
      return
    } else {
      document.execCommand('insertLineBreak')
    }
    e.preventDefault()
    saveOnVisualEditorUpdateWithCallback(container, doSaveDebounced, 'br')
  } else if (e.key === 'Tab') {
    changeFocusWithTab(container, e.target, e.shiftKey, setPreviewTab, e)
  } else if (e.key === 't' && e.ctrlKey) {
    const question = e.target as HTMLElement
    if (question) {
      insertSingleLineAtCursor(container, question, toolbarOfQuestion(question))
      saveOnVisualEditorUpdateWithCallback(container, doSaveDebounced, 'e:text-answer')
    }
    e.preventDefault()
  } else if (e.key === 'p' && e.ctrlKey) {
    const question = getQuestionForCursor()
    if (question) {
      insertDropdownAtCursor(container, question, toolbarOfQuestion(question), t)
      saveOnVisualEditorUpdateWithCallback(container, doSaveDebounced, 'e:dropdown-answer')
    }
    e.preventDefault()
  }
}

function getQuestionForCursor() {
  const range = document.getSelection()?.getRangeAt(0)
  return findClosestWithCondition(range?.commonAncestorContainer as HTMLElement, el => el.localName === 'e:question')
}

function toolbarOfQuestion(question: HTMLElement) {
  return Array.from(question.children).find(el => el.localName == 'footer') as HTMLElement
}
