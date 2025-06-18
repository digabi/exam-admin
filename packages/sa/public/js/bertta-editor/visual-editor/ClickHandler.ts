import React from 'react'
import { Attachment, ErrorObject, listOf, PreviewTab, SetPreviewTab, Translations } from '../util'
import { removableElements } from './VisualEditorConfig'
import {
  attachment,
  choiceAnswerOption,
  dndAnswerGroup,
  dndAnswerOption,
  externalMaterial,
  mediaElement,
  questionToolbar,
  section,
  textAnswerContainer,
  updateRootQuestionClasses
} from './VisualEditorRenderer'
import { saveOnVisualEditorUpdateWithCallback } from './VisualEditorSaver'
import {
  addChoiceOption,
  dropdownAnswerOption,
  findClosestWithCondition,
  insertAfter,
  insertAndSelectText,
  insertAtCursor,
  insertAudioAtCursor,
  insertBefore,
  insertDragAndDropAtCursor,
  insertDropdownAtCursor,
  insertSingleLineAtCursor,
  removeAttachmentLists,
  scoreInput,
  scrollToBottom,
  scrollToQuestionInPreview,
  setFocus
} from './VisualEditorUtil'

export function clickHandler(
  doSaveDebounced: (name: string, preSaveFn: () => XMLDocument) => Promise<void>,
  e: React.MouseEvent<HTMLElement>,
  attachmentsUrl: string,
  setError: (errorObject: ErrorObject) => void,
  t: Translations,
  container: HTMLElement,
  setPreviewTab: (previewTab: PreviewTab) => void,
  attachments: Attachment[]
): void {
  const { targetName, question } = domModifyAction(
    e,
    attachmentsUrl,
    setError,
    t,
    container,
    setPreviewTab,
    attachments
  )
  if (targetName === null) {
    if (e.target instanceof HTMLElement) {
      const mathEditor = findClosestWithCondition(e.target, element => element.classList.contains('math-editor'))
      if (mathEditor) return

      setFocus(e.target, container, setPreviewTab)
      container.dispatchEvent(new Event('focus', { bubbles: false, cancelable: true }))
    }
  } else if (targetName.length > 0) {
    if (question !== null && e.target instanceof HTMLElement) {
      scrollToQuestionInPreview(container, e.target, question, setPreviewTab)
    }
    updateRootQuestionClasses(container)
    saveOnVisualEditorUpdateWithCallback(container, doSaveDebounced, targetName)
    e.preventDefault()
  }
}

function getButton(target: HTMLElement) {
  return target.localName === 'button' ? target : target.parentElement!
}

function getToolbar(button: HTMLElement) {
  const elemName = button.parentElement!.localName
  return elemName == 'header' || elemName == 'footer' ? button.parentElement! : button.parentElement!.parentElement!
}

function topLevelItemsAndIndex(container: HTMLElement, question: HTMLElement) {
  const items = Array.from(
    container.querySelectorAll<HTMLElement>('e\\:section > e\\:question, e\\:exam e\\:section > footer')
  )
  const index = items.findIndex(questionInList => questionInList === question)
  return { items, index }
}

function moveDown(container: HTMLElement, question: HTMLElement) {
  return move(container, question, false)
}

function moveUp(container: HTMLElement, question: HTMLElement) {
  return move(container, question, true)
}

function move(container: HTMLElement, question: HTMLElement, isUp: boolean) {
  if (!container) return null
  const positionFromTop = question.getBoundingClientRect().top
  const maintainPosition = () => (container.scrollTop -= positionFromTop - question.getBoundingClientRect().top)

  const sibling = isUp ? question.previousElementSibling : question.nextElementSibling
  if (sibling?.localName === 'e:question') {
    sibling?.insertAdjacentElement(isUp ? 'beforebegin' : 'afterend', question)
    maintainPosition()
    return 'e:question'
  } else if (question.parentElement?.localName === 'e:section') {
    const { items, index } = topLevelItemsAndIndex(container, question)
    if (isUp ? index > 0 : index + 2 < items.length) {
      insertBefore(items[index + (isUp ? -1 : 2)], question, false)
      maintainPosition()
      return 'e:question'
    }
  }
  return null
}

function domModify(
  target: HTMLElement,
  button: HTMLElement,
  toolbar: HTMLElement,
  question: HTMLElement,
  t: Translations,
  container: HTMLElement,
  e: React.MouseEvent<HTMLElement>,
  attachmentsUrl: string,
  setError: (errorObject: ErrorObject) => void,
  setPreviewTab: SetPreviewTab,
  attachments: Attachment[]
) {
  const targetLocalName = target.localName

  function setFocusForInsertedChoice() {
    setFocus(button.previousElementSibling!.querySelector('option-wrapper')!, container, setPreviewTab, true)
  }
  const footerParent = findClosestWithCondition(button, el => ['e:question', 'e:attachment'].includes(el.localName))
  // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
  const footer = footerParent?.querySelector<HTMLElement>(':scope > footer')!

  switch (button.dataset.type) {
    case 'button-rich-text': {
      const textAnswer = textAnswerContainer('', t)
      const maxScore = `<max-score class="removed">${scoreInput(2, 6)}</max-score>`
      insertBefore(
        footer,
        `<e:text-answer type="rich-text" max-score="6" contenteditable="false">${textAnswer}${maxScore}</e:text-answer>`,
        true
      )
      return 'e:text-answer'
    }
    case 'button-single-line':
      insertSingleLineAtCursor(container, question, footer)
      return 'e:text-answer'
    case 'button-choice':
      insertBefore(
        footer,
        `<e:choice-answer>${choiceAnswerOption(t)}${choiceAnswerOption(t)}${addChoiceOption(t)}</e:choice-answer>`,
        false
      )
      return 'e:choice-answer'
    case 'button-text':
      insertAndSelectText(container, footer, t, setPreviewTab)
      return 'div'
    case 'button-dropdown':
      insertDropdownAtCursor(container, question, footer, t)
      return 'e:dropdown-answer'
    case 'button-dragndrop': {
      insertDragAndDropAtCursor(container, question, footer, t)
      return 'e:dnd-answer-container'
    }
    case 'button-audio': {
      insertAudioAtCursor(container, question, footer)
      return 'e:audio-answer'
    }
    case 'button-question': {
      insertBefore(
        toolbar,
        `<e:question contenteditable="false">
      <e:question-title contenteditable="false"></e:question-title>
      <e:question-instruction contenteditable="false"></e:question-instruction>
      ${externalMaterial(t)}
${questionToolbar(button.parentElement!.localName === 'footer', t)}</e:question>`,
        false
      )
      setFocus(toolbar.previousElementSibling!.querySelector('e\\:question-title')!, container, setPreviewTab, true)
      const lastQuestionNumber = question.querySelectorAll(':scope > e\\:question').length
      question
        .querySelector('.cas-properties-opened select')
        ?.insertAdjacentHTML('beforeend', `<option value="${lastQuestionNumber}">${lastQuestionNumber}</option>`)
      return 'e:question'
    }
    case 'button-choice-option':
      insertBefore(button, choiceAnswerOption(t), false)
      setFocusForInsertedChoice()
      return 'e:choice-answer-option'
    case 'button-dropdown-option':
      insertBefore(button, dropdownAnswerOption(t), false)
      setFocusForInsertedChoice()
      return 'e:dropdown-answer-option'
    case 'button-section':
      insertBefore(toolbar, section(listOf('e\\:section', container).length, t), false)
      setFocus(toolbar.previousElementSibling!.querySelector('e\\:section-title')!, container, setPreviewTab, true)
      scrollToBottom(container)
      return 'e:section'
    case 'button-dnd-group': {
      const answers = button.parentElement!.querySelectorAll('e\\:dnd-answer')
      const lastQuestion = answers[answers.length - 1]
      insertAfter(lastQuestion, dndAnswerGroup(t), false)
      return 'e:dnd-answer'
    }
    case 'button-dnd-extra-answer': {
      insertBefore(button, dndAnswerOption(false), false)
      return 'e:dnd-answer-option'
    }
    case 'button-attachment':
      insertBefore(button, attachment(t), false)
      setFocus(button.previousElementSibling!.querySelector('e\\:attachment-title')!, container, setPreviewTab, true)
      return 'e:attachment'
    case 'button-move-up':
      return moveUp(container, question)
    case 'button-move-down':
      return moveDown(container, question)
    case 'button-open-attachments': {
      e.preventDefault()
      const wasCurrentAttachmentListOpen = button.parentElement!.querySelector('.attachment-list')
      removeAttachmentLists(container)
      if (wasCurrentAttachmentListOpen) {
        return ''
      }

      const attachmentButtons = attachments.map(attachment => {
        const media = `${attachment.mimeType.split('/')[0] || 'file'}`
        const tag = ['image', 'video', 'audio'].includes(media) ? media : 'file'
        const displayName = attachment.displayName
        return `<button data-tag="${tag}" data-filename="${displayName}" data-type="button-insert-attachment">${displayName}</button>`
      })
      button.parentElement!.insertAdjacentHTML(
        'beforeend',
        `<div class="attachment-list removed">${
          attachmentButtons.length > 0 ? attachmentButtons.join(' ') : t.no_attachments
        }</div>`
      )

      return ''
    }
    case 'button-insert-attachment': {
      if (!target.dataset.tag || !target.dataset.filename) return null
      const tag = target.dataset.tag as 'audio' | 'video' | 'image'
      const filename = target.dataset.filename
      const times = tag != 'audio' || question.parentElement?.localName == 'e:external-material' ? null : '0'
      insertAtCursor(container, question, footer, mediaElement(tag, filename, attachmentsUrl, t, times))
      return target.dataset.tag || 'e:file'
    }
    case 'section-properties': {
      const cas = toolbar.querySelector('.cas-properties')
      cas?.classList.toggle('opened')
      return null
    }
  }

  if (['e:choice-answer', 'e:dropdown-answer'].includes(targetLocalName) && isTopLeftCornerClick(e)) {
    const ordering = target.getAttribute('ordering') || 'random'
    const newOrdering = ordering == 'random' ? 'fixed' : 'random'
    target.setAttribute('ordering', newOrdering)
    return targetLocalName
  }

  if (removableElements.includes(targetLocalName) && isTopRightCornerClick(e) && !hasDndAnswerParent(target)) {
    if (target.localName === 'e:section' && target.querySelectorAll('e\\:question').length > 0) {
      setError({ title: t.error.section_remove_error, message: t.section_contains_questions })
      return ''
    } else if (target.localName === 'e:question') {
      const select = button.querySelector('.cas-properties-opened select')
      const options = select?.querySelectorAll('option')
      const lastOption = options?.item(options.length - 1)
      if (lastOption) {
        lastOption.remove()
      }
      target.remove()
      return targetLocalName
    } else {
      target.remove()
      return targetLocalName
    }
  }
  return null
}

function hasDndAnswerParent(answerOption: Element) {
  if (answerOption.localName === 'e:dnd-answer-option') {
    return answerOption.parentElement!.localName === 'e:dnd-answer'
  } else {
    return false
  }
}

function domModifyAction<T>(
  e: React.MouseEvent<HTMLElement>,
  attachmentsUrl: string,
  setError: (errorObject: ErrorObject) => void,
  t: Translations,
  container: HTMLElement,
  setPreviewTab: SetPreviewTab,
  attachments: Attachment[]
): { targetName: string | null; question: HTMLElement | null } {
  const target = e.target
  if (!(target instanceof HTMLElement)) {
    return { targetName: null, question: null }
  }
  const button = getButton(target)
  const toolbar = getToolbar(button)
  const question = toolbar.parentElement!
  const targetName = domModify(
    target,
    button,
    toolbar,
    question,
    t,
    container,
    e,
    attachmentsUrl,
    setError,
    setPreviewTab,
    attachments
  )
  return { targetName, question }
}

const buttonSize = 17

function getBoundingPropertiesAndPositionY(e: React.MouseEvent<HTMLElement>) {
  if (e.target instanceof HTMLElement) {
    const { left, top, width } = e.target.getBoundingClientRect()
    const borderTopWidth = parseInt(getComputedStyle(e.target).getPropertyValue('border-top-width'), 10)
    return { left, width, positionY: e.clientY - top - borderTopWidth }
  }
  return { left: 0, width: 0, positionY: -1 }
}

function isTopLeftCornerClick(e: React.MouseEvent<HTMLElement>) {
  const { left, positionY } = getBoundingPropertiesAndPositionY(e)
  return positionY < buttonSize && positionY > 0 && e.clientX - left < buttonSize
}

function isTopRightCornerClick(e: React.MouseEvent<HTMLElement>) {
  if (e.target instanceof HTMLElement) {
    const { left, width, positionY } = getBoundingPropertiesAndPositionY(e)
    return positionY < buttonSize && positionY > 0 && width - (e.clientX - left) < buttonSize
  }
  return false
}
