import { IOptions } from 'sanitize-html'

export const sanitizeOptions: IOptions = {
  allowedAttributes: {
    img: ['src', 'alt', 'title'],
    '*': ['class']
  },
  allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel', 'data'],
  allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
  transformTags: {
    img: (tagName, attribs) => ({
      tagName: 'img',
      attribs: { ...attribs, src: attribs.src.replace(/(.*)(\/exam-api\/|\/math.svg)(.*)/, '$2$3') }
    }),
    table: (tagName, attribs) => ({ tagName: 'table', attribs: { ...attribs, class: 'e-table' } })
  },
  allowedTags: [
    'img',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'dd',
    'div',
    'dl',
    'dt',
    'hr',
    'li',
    'ol',
    'p',
    'pre',
    'ul',
    'abbr',
    'b',
    'br',
    'code',
    'data',
    'em',
    'i',
    'small',
    'span',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'u'
  ]
}
