import { listOf, PreviewTab, SetPreviewTab, Translations } from '../util'
import { editableElementNames, forbiddenElementsForAnswers, nonEditableElementNames } from './VisualEditorConfig'
import React from 'react'
import { dndAnswerGroup } from './VisualEditorRenderer'

export function removeAttachmentLists(doc: Element | XMLDocument) {
  listOf('.attachment-list', doc).forEach(el => el.remove())
}

export function resetContentEditables(doc: Element | XMLDocument, removeAttribute: boolean = false) {
  editableElementNames.concat(nonEditableElementNames).forEach(elementName => {
    Array.from(doc.getElementsByTagName(elementName)).forEach(element =>
      setAttribute(element, 'contenteditable', removeAttribute ? null : 'false')
    )
  })
}

export function setAttribute(element: Element, name: string, value: string | null) {
  if (value === null) {
    element.removeAttribute(name)
  } else {
    element.setAttribute(name, value)
  }
}

export function attrStr(source: Element, attributeName: string): string {
  const attributeValue = source.getAttribute(attributeName)
  return attributeValue !== null ? ` ${attributeName}="${attributeValue}"` : ''
}

export function findClosestWithCondition(
  element: HTMLElement | null,
  condition: (el: HTMLElement) => boolean
): HTMLElement | null {
  if (!element) return null
  if (condition(element)) return element
  return findClosestWithCondition(element.parentElement, condition)
}

export function nextOrPrevElement<T>(list: T[], currentIndex: number, isForward: boolean): T {
  const size = list.length
  return isForward
    ? currentIndex + 1 === size
      ? list[0]
      : list[currentIndex + 1]
    : currentIndex === 0
      ? list[size - 1]
      : list[currentIndex - 1]
}

export function scrollToBottom(container: HTMLElement) {
  container.scrollTop = container.scrollHeight
}

export function insertBefore(element: Element, newElement: string | Element, scrollAfterInsert: boolean) {
  if (typeof newElement === 'string') {
    element.insertAdjacentHTML('beforebegin', newElement)
  } else {
    element.insertAdjacentElement('beforebegin', newElement)
  }
  if (scrollAfterInsert) {
    element.previousElementSibling?.scrollIntoViewIfNeeded(true)
  }
}

export function insertAfter(element: Element, newElement: string | Element, scrollAfterInsert: boolean) {
  if (typeof newElement === 'string') {
    element.insertAdjacentHTML('afterend', newElement)
  } else {
    element.insertAdjacentElement('afterend', newElement)
  }
  if (scrollAfterInsert) {
    element.previousElementSibling?.scrollIntoViewIfNeeded(true)
  }
}

export function anyParentSatisfies(condition: (parent: Element) => boolean, child: Element) {
  let node = child.parentNode
  while (node != null) {
    if (condition(node as Element)) {
      return true
    }
    node = node.parentNode
  }
  return false
}

export function createNode(name: string, attributes: { [key: string]: string }, child?: Node) {
  const el = document.createElement(name)
  setAttributes(el, attributes)
  if (child) {
    el.appendChild(child)
  }
  return el
}

export function setAttributes(el: Element, attributes: { [key: string]: string }) {
  for (const [qualifiedName, value] of Object.entries(attributes)) {
    setAttribute(el, qualifiedName, value)
  }
  return el
}

export function setFocus(
  element: HTMLElement,
  container: HTMLElement,
  setPreviewTab: (previewTab: PreviewTab) => void,
  selectContent = false
) {
  if (element.localName === 'input') {
    element.focus()
  } else {
    const editableElement = setContentEditable(container, element, setPreviewTab)
    editableElement?.focus()
    const selection = window.getSelection()
    if (!selection) return
    const range = document.createRange()
    range.selectNodeContents(element)
    if (!selectContent) {
      range.collapse(false)
    }
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

export function changeFocusWithTab(
  container: HTMLElement,
  elem: EventTarget,
  hasShiftPressed: boolean,
  setPreviewTab: (previewTab: PreviewTab) => void,
  e: React.KeyboardEvent<HTMLElement>
) {
  const editableElements = Array.from(
    container.querySelectorAll<HTMLElement>(
      editableElementNames
        .concat(['input[type="text"]'])
        .filter(name => !['e:question', 'e:attachment'].includes(name))
        .map(x => x.replace(':', '\\:'))
        .join(', ')
    )
  ).filter(elem => elem.localName !== 'option-wrapper' || elem.parentElement?.localName !== 'e:text-answer')
  const index = editableElements.findIndex(el => el === elem)
  const nextElement = nextOrPrevElement(editableElements, index, !hasShiftPressed)
  setFocus(nextElement, container, setPreviewTab)
  e.preventDefault()
}

export function insertAndSelectText(
  container: HTMLElement,
  elementBelow: HTMLElement,
  t: Translations,
  setPreviewTab: SetPreviewTab
) {
  const div = document.createElement('div')
  div.innerText = t.text_placeholder
  insertBefore(elementBelow, div, true)
  setFocus(div, container, setPreviewTab, true)
}

export function findClosestETag(element: HTMLElement | null | undefined): HTMLElement | null {
  if (!element || element.localName == 'e:exam') return null
  return findClosestWithCondition(element, element => element.localName.startsWith('e:'))
}

function getEditableQuestionIdAndTab(
  container: HTMLElement,
  eventTarget: HTMLElement,
  targetQuestion: HTMLElement
): { questionId: string | null; previewTab: PreviewTab } {
  const questions = Array.from(container.querySelectorAll('e\\:section > e\\:question'))
  const externalMaterial = findClosestWithCondition(eventTarget, el => el.localName === 'e:external-material')
  const previewTab = externalMaterial ? 'MATERIAL' : 'EXAM'
  const questionIndex = questions.findIndex(question => question === targetQuestion) + 1
  if (questionIndex > 0) {
    return { questionId: String(questionIndex), previewTab }
  } else {
    const parentQuestion = findClosestWithCondition(targetQuestion?.parentElement, el => el.localName === 'e:question')
    const parentIndex = questions.findIndex(question => question === parentQuestion) + 1
    if (parentIndex > 0) {
      const subQuestions = Array.from(parentQuestion!.querySelectorAll('e\\:question'))
      const subQuestionIndex = subQuestions.findIndex(question => question === targetQuestion) + 1
      if (subQuestionIndex > 0) {
        return { questionId: `${parentIndex}.${subQuestionIndex}`, previewTab }
      } else {
        return { questionId: String(parentIndex), previewTab }
      }
    } else {
      return { questionId: null, previewTab }
    }
  }
}

export function scrollToQuestionInPreview(
  container: HTMLElement,
  eventTarget: HTMLElement,
  question: HTMLElement,
  setPreviewTab: SetPreviewTab
) {
  const { questionId, previewTab } = getEditableQuestionIdAndTab(container, eventTarget, question)
  setPreviewTab(previewTab)
  if (questionId) {
    setTimeout(() => {
      document.getElementById((previewTab === 'EXAM' ? 'question-nr-' : '') + questionId)?.scrollIntoViewIfNeeded(true)
    }, 100)
  }
}

function setContentEditable(
  container: HTMLElement,
  eventTarget: HTMLElement,
  setPreviewTab: (previewTab: PreviewTab) => void
) {
  resetContentEditables(container)
  const optionWrapper = findClosestWithCondition(eventTarget, el => el.localName == 'option-wrapper')
  const closestElement = optionWrapper || findClosestETag(eventTarget)
  if (closestElement && isEditableElement(closestElement)) {
    closestElement.setAttribute('contenteditable', 'true')
    scrollToQuestionInPreview(
      container,
      eventTarget,
      findClosestWithCondition(eventTarget, el => el.localName === 'e:question')!,
      setPreviewTab
    )
  }
  return closestElement
}

function isEditableElement(element: HTMLElement) {
  return editableElementNames.includes(element.localName)
}

const answerForbiddenInElement = (node: Element) => forbiddenElementsForAnswers.includes(node.localName)
const attachmentForbiddenInElement = (node: Element) =>
  ['e:section-title', 'e:question-title', 'e:exam-title', 'e:attachment-title', 'footer'].includes(node.localName)

function isInsideWrongQuestion(question: HTMLElement, insertedPlaceholder: Element) {
  return !anyParentSatisfies(parent => parent === question, insertedPlaceholder)
}

export function insertAtCursor(
  container: HTMLElement,
  question: HTMLElement,
  elementBelow: HTMLElement,
  newElement: string,
  isAnswerElement = false
) {
  const placeholder = document.createElement('placeholder')
  placeholder.textContent = 'x'
  const range = document.getSelection()?.getRangeAt(0)
  if (!range) return
  range.deleteContents()
  range.insertNode(placeholder)
  if (question.firstElementChild!.localName === 'placeholder') {
    insertBefore(elementBelow, question.firstElementChild!, true)
  } else if (!container.querySelector('placeholder')) {
    insertBefore(elementBelow, '<placeholder>x</placeholder>', true)
  }
  const insertedPlaceholder = container.querySelector('placeholder')!
  const isInvalidCursorPosition =
    (isAnswerElement && anyParentSatisfies(answerForbiddenInElement, insertedPlaceholder)) ||
    (isAnswerElement && isInsideWrongQuestion(question, insertedPlaceholder)) ||
    anyParentSatisfies(attachmentForbiddenInElement, insertedPlaceholder)
  insertBefore(isInvalidCursorPosition ? elementBelow : insertedPlaceholder, newElement, true)
  range.collapse(false)
  insertedPlaceholder.remove()
}

export const scoreInput = (maxLength: number = 3, score: number = 0, onlyPositives: boolean = false) =>
  `<input type="text" data-onlypositives="${onlyPositives.toString()}" maxlength="${maxLength}" class="max-score" value="${score}" />`
export const dropdownAnswerOption = (t: Translations) =>
  `<e:dropdown-answer-option score="0"><option-wrapper>${
    t.option_placeholder
  }</option-wrapper><max-score class="removed">${scoreInput()}</max-score></e:dropdown-answer-option>`
export const addDropdownOption = (t: Translations) =>
  `<button contenteditable="false" data-type="button-dropdown-option" class="labeled-basic-action removed" title="↵"><i class="fa fa-plus-circle" aria-hidden="true"></i> ${t.add_option}</button>`
export const addDragAndDropAnswerGroup = (t: Translations) =>
  `
    <button contenteditable="false" data-type="button-dnd-group" class="labeled-basic-action removed" title="↵">
      <i class="fa fa-plus-circle" aria-hidden="true"></i> 
      ${t.add_dnd_answer_group}
    </button>
    <b class="removed">${t.dnd_extra_answers}</b>
   `
export const addDragAndDropExtraOptions = (t: Translations) =>
  `
    <button contenteditable="false" data-type="button-dnd-extra-answer" class="labeled-basic-action removed" title="↵">
      <i class="fa fa-plus-circle" aria-hidden="true"></i>
      ${t.add_dnd_extra_answer}
    </button>
   `
export const addChoiceOption = (t: Translations) =>
  `<button contenteditable="false" data-type="button-choice-option" class="labeled-basic-action removed" title="↵"><i class="fa fa-plus-circle" aria-hidden="true"></i> ${t.add_option}</button>`

function insertAnswerElementAtCursor(
  container: HTMLElement,
  question: HTMLElement,
  elementBelow: HTMLElement,
  answerTag: string
) {
  insertAtCursor(
    container,
    question,
    elementBelow,
    `&nbsp;<${answerTag} max-score="2" contenteditable="false"><max-score class="removed">${scoreInput(
      2,
      2
    )}</max-score></${answerTag}>&nbsp;`,
    true
  )
}

export function insertSingleLineAtCursor(container: HTMLElement, question: HTMLElement, elementBelow: HTMLElement) {
  insertAnswerElementAtCursor(container, question, elementBelow, 'e:text-answer')
}

export function insertAudioAtCursor(container: HTMLElement, question: HTMLElement, elementBelow: HTMLElement) {
  insertAnswerElementAtCursor(container, question, elementBelow, 'e:audio-answer')
}

export function insertDropdownAtCursor(
  container: HTMLElement,
  question: HTMLElement,
  elementBelow: HTMLElement,
  t: Translations
) {
  insertAtCursor(
    container,
    question,
    elementBelow,
    `&nbsp;<e:dropdown-answer>${dropdownAnswerOption(t)}${dropdownAnswerOption(t)}${addDropdownOption(
      t
    )}</e:dropdown-answer>&nbsp;`,
    true
  )
}

export function insertDragAndDropAtCursor(
  container: HTMLElement,
  question: HTMLElement,
  elementBelow: HTMLElement,
  t: Translations
) {
  insertAtCursor(
    container,
    question,
    elementBelow,
    `&nbsp;
      <e:dnd-answer-container dnd-type='connect'>
        ${dndAnswerGroup(t)}
        ${addDragAndDropAnswerGroup(t)}
        ${addDragAndDropExtraOptions(t)}
      </e:dnd-answer-container>&nbsp;`,
    true
  )
}
