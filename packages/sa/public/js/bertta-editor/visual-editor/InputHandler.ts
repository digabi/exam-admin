import { findClosestETag, setAttribute } from './VisualEditorUtil'
import { saveOnVisualEditorUpdateWithCallback } from './VisualEditorSaver'

export function inputHandler(
  container: HTMLElement,
  doSaveDebounced: (name: string, preSaveFn: () => XMLDocument) => Promise<void>,
  targetElement: HTMLElement
): void {
  if (targetElement.contentEditable === 'true') {
    return
  }
  const targetClass = targetElement.className
  if (targetElement instanceof HTMLSelectElement && targetClass == 'max-answers') {
    const maxAnswers = targetElement.value
    const section = findClosestETag(targetElement)!
    setAttribute(section, 'max-answers', maxAnswers === '0' ? null : maxAnswers)
  } else if (targetElement instanceof HTMLInputElement) {
    const parentElement = findClosestETag(targetElement) || targetElement
    switch (targetClass) {
      case 'cas-forbidden':
        setAttribute(findClosestETag(targetElement)!, 'cas-forbidden', targetElement.checked ? 'true' : null)
        break
      case 'max-score':
        if (targetElement.dataset.onlypositives == 'true' || targetElement.value !== '-')
          targetElement.value = (isNaN(Number(targetElement.value)) ? '' : Number(targetElement.value))
            .toString()
            .substring(0, targetElement.maxLength)

        parentElement.querySelectorAll<HTMLElement>('e\\:dnd-answer-option').forEach(option => {
          option.setAttribute('score', targetElement.value)
        })
        parentElement.setAttribute(
          ['e:text-answer', 'e:scored-text-answer', 'e:dnd-answer'].includes(parentElement.localName)
            ? 'max-score'
            : 'score',
          targetElement.value || '0'
        )
        break
      case 'audio-restricted':
        if (targetElement.checked) {
          parentElement.setAttribute('times', '1')
          parentElement.querySelector<HTMLInputElement>('.max-times-input')!.value = '1'
        } else {
          parentElement.removeAttribute('times')
        }
        break
      case 'max-times-input':
        parentElement.setAttribute('times', targetElement.value)
        break
      case 'text-answer-restricted':
        if (targetElement.checked) {
          const defaultValue = '2000'
          const maxLengthInput = parentElement.querySelector<HTMLInputElement>('.max-length-input')!
          parentElement.setAttribute('max-length', defaultValue)
          maxLengthInput.value = defaultValue
        } else {
          parentElement.removeAttribute('max-length')
        }
        break
      case 'max-length-input':
        parentElement.setAttribute('max-length', targetElement.value)
    }
  }
  const targetName = targetElement.localName
  saveOnVisualEditorUpdateWithCallback(container, doSaveDebounced, targetName)
}
