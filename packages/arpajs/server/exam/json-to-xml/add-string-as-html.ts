import * as libxml from 'libxmljs2'
import { Element } from 'libxmljs2'
import sanitizeHtml, { AllowedAttribute } from 'sanitize-html'
import crypto from 'crypto'
import { Attachment } from '@digabi/json-exam-utils'

const defaultAttributes = {
  a: ['href'],
  img: ['src', 'alt', 'title'],
  '*': ['class']
}
const eAttributes: Record<string, AllowedAttribute[]> = {
  'e:image': ['src'],
  'e:file': ['src'],
  'e:video': ['src'],
  'e:audio': ['src'],
  'e:formula': ['mode'],
  'e:attachment-link': ['ref']
}
const eTags = Object.keys(eAttributes)
const inlineFormulaRegexp = /\\\(([\s\S]*?)\\\)/g
const displayedFormulaRegexp = /\\\[([\s\S]*?)\\\]/g
const defaultTags = sanitizeHtml.defaults.allowedTags.filter(tag => !['colgroup', 'col'].includes(tag))

export enum SanitizeLevel {
  NONE = 'none',
  NORMAL = 'normal',
  ALL = 'all',
  NO_TAGS = 'no_tags'
}
const blockLevelElements = [
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'dialog',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul'
]
const strictHtmlElements = {
  ul: ['li'],
  ol: ['li'],
  table: ['tr', 'thead', 'tbody', 'tfoot', 'col', 'colgroup', 'caption', 'title'],
  thead: ['tr', 'title'],
  tbody: ['tr', 'title'],
  tfoot: ['tr', 'title'],
  tr: ['td', 'th'],
  dl: ['dt', 'dd'],
  colgroup: ['col']
}

export function addStringAsHtml(
  el: libxml.Element,
  html: string,
  sanitizeLevel: SanitizeLevel,
  attachments: Attachment[]
): { usedInlineFilenames: string[]; usedAttachmentFileNames: string[] } {
  const usedInlineFilenames: string[] = []
  const usedAttachmentFileNames: string[] = []
  if (!html || html.includes(';base64,')) return { usedInlineFilenames, usedAttachmentFileNames }
  // Replacing img and a tags for backward support of existing exam definitions
  const htmlWithBackwardSupport = getHtmlWithBackwardSupport(html)
  const htmlSanitized = decodeHtmlEntities(`<div>${htmlWithBackwardSupport.replace(/\n/g, '<br/>')}</div>`).trim()

  const htmlWithImgAndAttachmentLinkTags = htmlSanitized
    .replace(/<\/image/gi, '</e:image')
    .replace(/<image/gi, '<e:image')
    .replace(/<\/video/gi, '</e:video')
    .replace(/<video/gi, '<e:video')
    .replace(/<\/audio/gi, '</e:audio')
    .replace(/<audio/gi, '<e:audio')
    .replace(/<\/file/gi, '</e:file')
    .replace(/<file/gi, '<e:file')
    .replace(/<\/attachment-link/gi, '</e:attachment-link')
    .replace(/<attachment-link/gi, '<e:attachment-link')
    .replace(/(<e:attachment-link\s+ref=")([^"]+)(")/g, (a: string, b: string, filename: string, d: string) => {
      usedAttachmentFileNames.push(filename)
      return b + getSHA1Hash(filename) + d
    })
    // quickfix: libxml.parseHtmlFragment(str).toString() URI encodes attachment filenames
    // leading to double encoding -- attachment files with öä or spaces do not work
    .replace(
      /(\s*src=")([^"]+)(")/g,
      (a: string, startTag: string, filename: string, d: string) => startTag + decodeURI(filename) + d
    )

  const htmlWithXmlFormulae = htmlWithImgAndAttachmentLinkTags
    .replace(inlineFormulaRegexp, (match: string, formula: string) => `<e:formula>${removeBrs(formula)}</e:formula>`)
    .replace(
      displayedFormulaRegexp,
      (match: string, formula: string) => `<e:formula mode="display">${removeBrs(formula)}</e:formula>`
    )

  const sanitizedHtml = _sanitizeHtml(htmlWithXmlFormulae, sanitizeLevel)
    .replace(/<br>/g, '<br/>')
    .replace(/<hr>/g, '<hr/>')
    .replace(/<hr ([^>]+[^/])>(<\/hr>)?/g, '<hr $1 />')
    .replace(/<u>(.*?)<\/u>/g, '<span class="e-underline">$1</span>')
  const xmlDoc = libxml.parseXml(sanitizedHtml)
  const root = xmlDoc.root()!

  root.childNodes().forEach(child => {
    el.addChild(child)
  })
  return { usedInlineFilenames, usedAttachmentFileNames }

  function getHtmlWithBackwardSupport(html: string) {
    return html
      .replace(/(<img.*?src=")([^"]+)("[^>]*>)(.*?)(<\/img>)/g, (a, b, path: string, d, caption: string) =>
        exists(path) ? `<e:image src="${nameAndStoreKey(path)}">${caption}</e:image>` : ''
      )
      .replace(/(<img.*?src=")([^"]+)("[^>]*>)/g, (a, b, path: string) =>
        exists(path) ? `<e:image src="${nameAndStoreKey(path)}"/>` : ''
      )
      .replace(/(<video.*?src=")([^"]+)("[^>]*>)/g, (a, b, path: string) =>
        exists(path) ? `<e:video src="${nameAndStoreKey(path)}"/>` : ''
      )
      .replace(/<video([^>]*>)\s*<source.*?src="([^"]+)("[^>]*>)>\s*<\/video>/g, (a, b, path: string) =>
        exists(path) ? `<e:video src="${nameAndStoreKey(path)}"/>` : ''
      )
      .replace(/(<audio.*?src=")([^"]+)("[^>]*>)([\s\S]*?)(<\/audio>)/g, (a, b, path: string) =>
        exists(path) ? `<e:audio src="${nameAndStoreKey(path)}"/>` : ''
      )
      .replace(/<audio([^>]*>)\s*<source.*?src="([^"]+)("[^>]*>)>\s*<\/audio>/g, (a, b, path: string) =>
        exists(path) ? `<e:audio src="${nameAndStoreKey(path)}"/>` : ''
      )
      .replace(/(<a.*?href=")([^"]+)("[^>]*>)([\s\S]*?)(<\/a>)/g, (a, b, path: string, d, caption: string) => {
        const containsInlineMedia = ['e:image', 'e:audio', 'e:video'].some(tagName => caption.includes(tagName))
        if (containsInlineMedia) {
          return caption
        } else {
          return exists(path) ? `<e:file src="${nameAndStoreKey(path)}">${caption}</e:file>` : ''
        }
      })
  }

  function exists(fileWithPath: string) {
    return attachments.some(attachment => attachment.filename === name(fileWithPath))
  }

  function nameAndStoreKey(fileWithPath: string) {
    const filename = name(fileWithPath)
    usedInlineFilenames.push(filename)
    return filename
  }

  function name(fileWithPath: string) {
    return fileWithPath.trim().replace(/.*attachments\//gi, '')
  }
}

function getChildNodes(parent: Element) {
  return parent.childNodes() as Element[]
}

function decodeHtmlEntities(str: string) {
  const fragment = libxml.parseHtmlFragment(str)
  Object.entries(strictHtmlElements).forEach(([parentName, childNames]) => {
    fragment.find<Element>(`//${parentName}`).forEach(parent => {
      getChildNodes(parent)
        .filter(child => !childNames.includes(child.name && child.name()))
        .forEach(child => child.remove())
    })
  })

  fragment.find<Element>(`//blockquote`).forEach(blockquote => {
    getChildNodes(blockquote).forEach(child => {
      if (child.name && child.name() === 'text') {
        const div = new Element(fragment, 'div')
        div.text(child.text())
        child.replace(div)
      } else if (!blockLevelElements.includes(child.name && child.name())) {
        child.remove()
      }
    })
  })

  return fragment.toString()
}

export function getSHA1Hash(stringInput: string) {
  return crypto.createHash('sha1').update(JSON.stringify(stringInput)).digest('hex')
}

function removeBrs(str: string) {
  return str.replace(/<br\/?>/g, '')
}

function _sanitizeHtml(str: string, sanitizeLevel: SanitizeLevel): string {
  switch (sanitizeLevel) {
    case SanitizeLevel.NONE:
      return str
    case SanitizeLevel.NORMAL:
      return sanitizeHtml(str, {
        allowedTags: [...defaultTags, ...eTags],
        allowedAttributes: { ...defaultAttributes, ...eAttributes },
        transformTags: {
          table: (tagName, attribs) => ({ tagName: 'table', attribs: { ...attribs, class: 'e-table' } })
        }
      })
    case SanitizeLevel.ALL:
      return sanitizeHtml(str, { allowedTags: eTags, allowedAttributes: eAttributes })
    case SanitizeLevel.NO_TAGS:
      return sanitizeHtml(str, { allowedTags: ['div', 'br'], allowedAttributes: {} })
  }
}
