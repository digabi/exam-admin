import { last } from 'lodash'
import { listOf, parse, serialize, Translations } from '../util'
import {
  addChoiceOption,
  addDragAndDropAnswerGroup,
  addDragAndDropExtraOptions,
  addDropdownOption,
  resetContentEditables,
  scoreInput
} from './VisualEditorUtil'

export function modifyXmlDocumentForUi(sourceDoc: XMLDocument, t: Translations, attachmentsUrl: string) {
  const doc = parse(serialize(sourceDoc))
  resetContentEditables(doc)
  addToolbars(doc, t)
  addCas(doc, t)
  addScoreCells(doc)
  renderTextAnswers(doc, t)
  renderMedia(doc, attachmentsUrl, t)
  return doc
}

export function updateRootQuestionClasses(container: HTMLElement) {
  container.querySelectorAll('e\\:section > e\\:question').forEach(question => {
    const hasSubQuestion = !!question.querySelector('e\\:question')
    const hasTopLevelQuestions =
      !hasSubQuestion && !!question.querySelector('e\\:text-answer, e\\:dropdown-answer, e\\:choice-answer')
    question.classList.toggle('sub-question', hasSubQuestion)
    question.classList.toggle('top-level-questions', hasTopLevelQuestions)
  })
}

export function clearRootQuestionClasses(doc: XMLDocument) {
  doc.querySelectorAll('section > question').forEach(question => question.removeAttribute('class'))
}
function addToolbars(doc: XMLDocument, t: Translations) {
  const el = ['references', 'exam-footer', 'exam'].filter(el => doc.querySelector(el) != null)[0]
  const position = el == 'exam' ? 'beforeend' : 'beforebegin'
  doc.querySelector(el)?.insertAdjacentHTML(position, addSection(t))

  listOf('section', doc).forEach(el => {
    el.insertAdjacentHTML('beforeend', addQuestion(t))
  })
  const topLevelQuestions = listOf('section > question', doc)
  listOf('external-material', doc).forEach(el => el.insertAdjacentHTML('beforeend', addAttachment(t)))

  topLevelQuestions.forEach(el => {
    addExternalMaterialPlaceholders(el, true)
  })

  listOf('question question', doc).forEach(el => {
    addExternalMaterialPlaceholders(el, false)
  })
  listOf('external-material attachment', doc).forEach(el => {
    el.insertAdjacentHTML('beforeend', attachmentToolbar(t))
  })

  listOf('choice-answer', doc).forEach(el => el.insertAdjacentHTML('beforeend', addChoiceOption(t)))
  listOf('dropdown-answer', doc).forEach(el => el.insertAdjacentHTML('beforeend', addDropdownOption(t)))

  listOf('dnd-answer-container', doc).forEach(el => {
    last(listOf('dnd-answer', el))?.insertAdjacentHTML('afterend', addDragAndDropAnswerGroup(t))
    el.insertAdjacentHTML('beforeend', addDragAndDropExtraOptions(t))
  })

  function addExternalMaterialPlaceholders(el: HTMLElement, topLevel: boolean) {
    el.insertAdjacentHTML('beforeend', questionToolbar(topLevel, t))
    if (!el.querySelector(':scope > external-material')) {
      const elementsBefore = el.querySelectorAll(':scope > question-title, :scope > question-instruction')
      const lastElementBefore = elementsBefore.item(elementsBefore.length - 1)
      lastElementBefore.insertAdjacentHTML('afterend', externalMaterial(t))
    }
  }
}

function addCas(doc: XMLDocument, t: Translations) {
  listOf('section', doc).forEach((el, i) => {
    const questions = el.querySelectorAll('section > question').length
    const casForbidden = el.getAttribute('cas-forbidden')
    el.insertAdjacentHTML(
      'afterbegin',
      addSectionProps(
        i,
        casForbidden ? casForbidden == 'true' : null,
        Number(el.getAttribute('max-answers')) || 0,
        questions,
        t
      )
    )
  })
}

function addScoreCells(doc: XMLDocument) {
  listOf('[max-score], choice-answer-option, dropdown-answer-option', doc).forEach(el => {
    if (el.localName == 'scored-text-answer' && el.parentElement?.localName == 'hints') {
      return
    }
    const answerOption = ['choice-answer-option', 'dropdown-answer-option'].includes(el.localName)
    const html = el.innerHTML.trim()
    const score = Number(el.getAttribute('score') || el.getAttribute('max-score')) || 0
    const maxLength = answerOption ? 3 : 2
    const onlyPositives = maxLength == 2
    if (el.localName !== 'dnd-answer') {
      el.innerHTML = ''
    }
    if (answerOption) {
      el.insertAdjacentHTML('beforeend', `<option-wrapper>${html}</option-wrapper>`)
    }
    el.insertAdjacentHTML(
      'beforeend',
      `<max-score class="removed">${scoreInput(maxLength, score, onlyPositives)}</max-score>`
    )
  })
}

export function textAnswerContainer(maxLength: string, t: Translations) {
  const restrictedCheckbox = `<input type="checkbox" class="text-answer-restricted" ${
    maxLength ? ' checked="true"' : ''
  }/>`
  const maxLengthElements = `<span class="max-length"> <input type="number" min="1" class="max-length-input" value="${maxLength}"/> ${t.characters}</span>`
  return `<div class="max-length-container removed"><div class="text-answer"></div><label>${restrictedCheckbox}${t.restricted}</label> ${maxLengthElements}</div>`
}

function renderTextAnswers(doc: XMLDocument, t: Translations) {
  listOf('text-answer[type="rich-text"]', doc).forEach(element => {
    element.insertAdjacentHTML('afterbegin', textAnswerContainer(element.getAttribute('max-length') || '', t))
  })
}

const mediaTypes = ['image', 'video', 'audio'] as const
type MediaType = (typeof mediaTypes)[number]

function renderMedia(doc: XMLDocument, attachmentsUrl: string, t: Translations) {
  mediaTypes.forEach(media =>
    listOf(media, doc).forEach(element => {
      const times =
        element.localName != 'audio' || element.parentElement?.parentElement?.localName === 'external-material'
          ? null
          : element.getAttribute('times') || '0'
      element.insertAdjacentHTML(
        'afterbegin',
        mediaElement(media, element.getAttribute('src')!, attachmentsUrl, t, times, false)
      )
    })
  )
}

export function mediaElement(
  tag: MediaType,
  filename: string,
  attachmentsUrl: string,
  t: Translations,
  times: string | null = null,
  withETag: boolean = true
) {
  const filenameEscaped = filename.replace(/&/g, '&#038;').replace(/</g, '&#60;').replace(/>/g, '&#62;')
  const mediaTag = (innerHtml: string) =>
    withETag ? `&nbsp;<e:${tag} src="${filename}">${innerHtml}</e:${tag}>&nbsp;` : `${innerHtml}`
  switch (tag) {
    case 'image':
      return `${mediaTag(
        `<img class="removed" src="${attachmentsUrl}/${encodeURIComponent(
          filename
        )}" alt="${filenameEscaped}" title="${filenameEscaped}"/> `
      )}`
    case 'video':
      return `${mediaTag(
        `<video class="video removed" preload="none" controls="" controlslist="nodownload" disablepictureinpicture=""><source src="${attachmentsUrl}/${encodeURIComponent(
          filename
        )}"></source></video>`
      )}`
    case 'audio': {
      const timesEditor =
        times == null
          ? ''
          : `<span class="times-editor"><label><input type="checkbox" class="audio-restricted"${
              times == '0' ? '' : ' checked="true"'
            } />${
              t.restricted
            }</label> <span class="max-times"><input type="number" min="1" class="max-times-input" value="${times}"/> ${
              t.times
            }</span></span>`
      const fileElement = `<span title="${filenameEscaped}" class="filename">${filenameEscaped}</span>`
      const audioElement = `<audio class="audio removed" controls="controls" src="${attachmentsUrl}/${encodeURIComponent(
        filename
      )}" preload="none"> </audio>`
      return `${mediaTag(
        `<max-times class="audio-times removed">${fileElement}${timesEditor}</max-times>${audioElement}`
      )}`
    }
    default:
      return `${mediaTag(`&nbsp;`)}`
  }
}

const addAttachment = (t: Translations) =>
  `<button contenteditable="false" data-type="button-attachment" class="labeled-basic-action removed"><i class="fa fa-plus-circle" aria-hidden="true"></i> ${t.add_attachment}</button>`

const addQuestion = (t: Translations) =>
  `<footer class="toolbar toolbar-new-question removed" contenteditable="false"><button data-type="button-question" class="labeled-basic-action"><i class="fa fa-plus-circle" aria-hidden="true"></i> ${t.add_question}</button></footer>`

const addSubQuestion = (t: Translations) =>
  `<div class="toolbar toolbar-new-question removed" contenteditable="false"><button data-type="button-question" class="labeled-basic-action"><i class="fa fa-plus-circle" aria-hidden="true"></i> ${t.add_sub_question}</button></div>`

export const questionToolbar = (
  isTopLevel: boolean,
  t: Translations
) => `<footer class="removed" contentEditable="false">
${isTopLevel ? addSubQuestion(t) : ''}
  <button class="basic-action move move-up" data-type="button-move-up" title="${
    t.move_up
  }"><i class="fa fa-caret-up" aria-hidden="true"></i></button>
  <button class="basic-action move move-down" data-type="button-move-down" title="${
    t.move_down
  }"><i class="fa fa-caret-down" aria-hidden="true"></i></button>
</footer>
<footer class="sticky-items removed">
  ${isTopLevel ? '' : `<button class="answer-button" data-type="button-choice">${t.choice}</button>`}
  <button class="answer-button togglable" data-type="button-rich-text">${t.rich_text}</button>
  <button class="answer-button togglable" data-type="button-dragndrop">${t.dragndrop}</button>
  <button class="answer-button togglable" data-type="button-single-line" title="Ctrl-T">${t.single_line}</button>
  <button class="answer-button togglable margin-right" data-type="button-dropdown" title="Ctrl-P">${t.dropdown}</button>
  <button class="answer-button " data-type="button-open-attachments"><i class="fa fa-paperclip" aria-hidden="true"></i> ${
    t.attachment
  }</button>
  <button class="answer-button togglable" data-type="button-text"><i class="fa fa-file-text" aria-hidden="true"></i> ${
    t.add_text
  }</button>
</footer>`

const attachmentToolbar = (t: Translations) => `<footer class="sticky-items removed">
  <button class="answer-button" data-type="button-open-attachments"><i class="fa fa-paperclip" aria-hidden="true"></i> ${t.attachment}</button>
  <button class="answer-button" data-type="button-text"><i class="fa fa-file-text" aria-hidden="true"></i> teksti</button>
</footer>`

export const choiceAnswerOption = (t: Translations) =>
  `<e:choice-answer-option score="0"><option-wrapper>${
    t.option_placeholder
  }</option-wrapper><max-score class="removed">${scoreInput()}</max-score></e:choice-answer-option>`

export const section = (index: number, t: Translations) =>
  `<e:section>${addSectionProps(
    index,
    null,
    0,
    0,
    t
  )}<e:section-title></e:section-title><e:section-instruction></e:section-instruction>${addQuestion(t)}</e:section>`

export const attachment = (t: Translations) => `<e:attachment>
<e:attachment-title></e:attachment-title>
${attachmentToolbar(t)}
</e:attachment>`

export const dndAnswerOption = (addScore: boolean) =>
  `<e:dnd-answer-option ${addScore ? 'score="3"' : ''} contenteditable="false"></e:dnd-answer-option>`

export const dndAnswerGroup = (t: Translations) => {
  const maxScore = `<max-score class="removed">${scoreInput(2, 3)}</max-score>`
  return `<e:dnd-answer max-score="3" contenteditable="false"><e:dnd-answer-title contenteditable="false"></e:dnd-answer-title>${dndAnswerOption(true)}${maxScore}</e:dnd-answer>`
}

export const externalMaterial = (t: Translations) =>
  `<e:external-material contenteditable="false">${addAttachment(t)}</e:external-material>`

const addSection = (t: Translations) =>
  `<footer class="toolbar toolbar-new-section removed" contenteditable="false"><button data-type="button-section" class="labeled-basic-action"><i class="fa fa-plus-circle" aria-hidden="true"></i> ${t.add_section}</button></footer>`

const addSectionProps = (
  index: number,
  casForbidden: boolean | null,
  maxAnswers: number,
  questions: number,
  t: Translations
) => {
  const options = `<option value="0">-</option>${new Array(questions)
    .fill('')
    .map((_, i) => `<option value="${i + 1}" ${i + 1 == maxAnswers ? 'selected="true"' : ''}>${i + 1}</option>`)
    .join('')}`
  const casForbiddenCheckbox =
    index == 0
      ? `<label><input name="cas" class="cas-forbidden" type="checkbox" ${
          casForbidden == true ? 'checked="true"' : ''
        } /> ${t.cas_forbidden}</label>`
      : ''
  return `<div class="cas-properties removed">
<div class="cas-properties-opened">
  <label class="max-answers-selection">${t.max_answers} <select class="max-answers">${options}</select></label>
  ${casForbiddenCheckbox}
</div>
<button data-type="section-properties" title="${t.open_section_properties}"><i class="fa fa-cog"></i></button>
</div>`
}
