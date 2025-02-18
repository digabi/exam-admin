import { listOf, parse, removeNamespaces } from '../util'
import { attrStr, createNode, resetContentEditables, setAttributes } from './VisualEditorUtil'
import { clearRootQuestionClasses } from './VisualEditorRenderer'

export function saveOnVisualEditorUpdateWithCallback(
  container: HTMLElement,
  doSaveDebounced: (name: string, preSaveFn: () => XMLDocument) => Promise<void>,
  targetName: string
) {
  void doSaveDebounced(targetName, () => {
    const examRoot = container.getElementsByTagName('e:exam')[0]
    wrapImagWithImageTag(examRoot)
    examRoot.querySelectorAll('span:not([class], [mathquill-command-id])').forEach(span => {
      if (span.querySelectorAll('*').length == 0) {
        span.parentNode?.replaceChild(document.createTextNode(span.textContent!), span)
      }
    })
    examRoot.querySelectorAll('i[style]').forEach(styled => styled.removeAttribute('style'))
    const htmlDocument = new DOMParser().parseFromString(sanitize(examRoot.outerHTML), 'text/html').body
    transformMathSvgToFormulas(htmlDocument)
    listOf('.removed', htmlDocument).forEach(el => el.remove())
    clearEmptyImageAndAttachment(htmlDocument)
    const doc: XMLDocument = parse(sanitize(htmlDocument.innerHTML))
    clearRootQuestionClasses(doc)
    resetContentEditables(doc, true)
    unwrapOptionWrappers(doc)
    return doc
  })
}

function wrapImagWithImageTag(examRoot: Element) {
  examRoot.querySelectorAll<HTMLImageElement>('img[src*="/exam-api"]').forEach(img => {
    if (img.parentElement!.localName !== 'e:image') {
      const src = decodeURIComponent(img.src.split('/').pop()!)
      const image = createNode('e:image', {
        src
      })
      setAttributes(img, {
        title: src,
        contenteditable: 'false'
      })
      img.classList.add('removed')
      img.insertAdjacentElement('beforebegin', image)
      image.appendChild(img)
    }
  })
}

function transformMathSvgToFormulas(doc: HTMLElement) {
  doc.querySelectorAll<HTMLElement>('img[src*="/math.svg"]').forEach(el => {
    const formula = el.getAttribute('alt')!
    if (formula.trim().length > 0) {
      el.insertAdjacentHTML(
        'beforebegin',
        `<e:formula ${attrStr(el, 'mode')}${attrStr(el, 'assistive-title')}>${formula}</e:formula>`
      )
    }
    el.remove()
  })
  doc.querySelectorAll<HTMLElement>('[class="math-editor"]').forEach(el => el.remove())
}

function clearEmptyImageAndAttachment(doc: HTMLElement) {
  listOf('e\\:image', doc).forEach(el => {
    if (el.childElementCount === 0) {
      el.innerHTML = ''
    }
  })
  listOf('e\\:external-material', doc).forEach(el => {
    if (el.querySelectorAll('e\\:attachment').length === 0) {
      el.remove()
    }
  })
}

function unwrapOptionWrappers(doc: XMLDocument) {
  listOf('option-wrapper', doc).forEach(el => {
    el.insertAdjacentHTML('afterend', removeNamespaces(el.innerHTML.trim()))
    el.remove()
  })
}

function sanitize(xml: string): string {
  return xml
    .replace(/schemalocation/g, 'schemaLocation')
    .replace(/<input\s+([^>]+)>/g, '<input $1/>')
    .replace(/<br>/g, '<br/>')
    .replace(/<br ([^>]+[^/])>(<\/br>)?/g, '<br/>')
    .replace(/<hr>/g, '<hr/>')
    .replace(/<hr ([^>]+[^/])>(<\/hr>)?/g, '<hr $1 />')
    .replace(/<source [^>]+>/g, '')
    .replace(/&nbsp;/g, '&#160;')
    .replace(/<u>(.*?)<\/u>/gs, '<span class="e-underline">$1</span>')
}
