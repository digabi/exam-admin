import { fi } from './locales/fi'
import { ExamType } from '@digabi/grading-ui/lib/grading/types'

export type EditorTab = 'STYLED' | 'RAW' | 'ATTACHMENTS' | 'QUESTIONPICKER' | 'EXAMPASSWORD'
export type Language = 'fi-FI' | 'sv-FI'
export type ErrorResponse = { status: number; message: string }
export type ErrorObject = { title: string; message: string } | null
export type Translations = typeof fi
export type PreviewTab = 'MATERIAL' | 'EXAM'
export type SetPreviewTab = (previewTab: PreviewTab) => void
export type BerttaExam = {
  examLanguage: Language
  password: string
  contentXml: string
  masteredXml: string
  locked: boolean
  usedAttachments: UsedAttachment[]
  title: string
}
export type SaveExamResponse = { xml: string; usedAttachments: UsedAttachment[] }
export type SaveExamRequest = {
  examLanguage: Language
  content: { title: string; xml: string }
}
export type Attachment = {
  displayName: string
  mimeType: string
  metadata?: {
    duration?: number
    width?: number
    height?: number
  }
  size: number
  originalName?: string
  missing?: boolean
}
export type QuestionRow = {
  id: string
  creation_date: string
  exam_uuid: string
  examinationCode?: string
  exam_code: string
  exam_type: string
  exam_date: string
  exam_language: string
  title: string
  question_title: string
  xml_element: string
  expanded?: boolean
  inserted?: boolean
  matches?: boolean
}

export type QuestionResponse = {
  questions: { [key: string]: QuestionRow[] }
}

export type FilterOptionsResponse = {
  examCodes: string[]
  examTypes: (ExamType | '')[]
  examinationCodes: string[]
  examLanguages: string[]
  examTitles: { [key: string]: string }
}

export type SetAttachments = (fn: (atts: Attachment[]) => Attachment[]) => void
export type UsedAttachment = {
  filename: string
  restricted: boolean
}
export class ResponseError extends Error {
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.message = message
  }
  status: number
  message: string
}
export const sum = (arr: number[]): number => arr.reduce((total, current) => total + current, 0)
export function doReq<T>(
  method: string,
  url: string,
  body?: string | FormData,
  contentType: string | null = 'application/json; charset=UTF-8'
): Promise<T> {
  const headers = contentType ? { 'Content-Type': contentType } : undefined
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return fetch(url, { method, body, headers }).then(async response => {
    if (response.ok) {
      if (response.status == 204) return null
      if (contentType?.includes('application/json') || body instanceof FormData) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return response.json()
      }
      if (contentType == null) {
        return response.blob()
      }
      return response.text()
    }
    const text = (await response.text()) || response.statusText
    const error = parseError(text)
    throw new ResponseError(error ? error.message : text, response.status)
  })
}

function parseError(text: string): ErrorResponse | undefined {
  try {
    return JSON.parse(text) as ErrorResponse
  } catch (err) {
    return undefined
  }
}

export function parserError(doc: XMLDocument): string {
  const parserError = doc.getElementsByTagName('parsererror')
  if (parserError.length > 0) {
    return (
      Array.from(parserError.item(0)!.childNodes)
        .map(node => node.textContent)
        .join('\n') || 'Unknown parser error'
    )
  }
  return ''
}

export function humanFileSize(size: number): string {
  const i = Math.floor(Math.log(size) / Math.log(1024))
  const s = (size / Math.pow(1024, i)).toFixed(0)
  return `${s} ${['B', 'kB', 'MB', 'GB', 'TB'][i]}`
}

export const sampleXml = (lang: Language = 'fi-FI') => `<?xml version="1.0" encoding="UTF-8"?>
<e:exam xmlns:e="http://ylioppilastutkinto.fi/exam.xsd" xmlns="http://www.w3.org/1999/xhtml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ylioppilastutkinto.fi/exam.xsd https://abitti.net/schema/exam.xsd" exam-schema-version="0.5">
  <e:exam-versions>
    <e:exam-version lang="${lang as string}"/>
  </e:exam-versions>
  <e:exam-title>${lang === 'fi-FI' ? 'Uusi koe' : 'Nytt prov'}</e:exam-title>
  <e:exam-instruction/>
  <e:table-of-contents/>
  <e:section>
    <e:section-title/>
    <e:section-instruction/>
    <e:question>
      <e:question-title/>
      <e:question-instruction/>
    </e:question>
  </e:section>
</e:exam>`

export const parse = (xmlString: string): XMLDocument => new DOMParser().parseFromString(xmlString, 'text/xml')
export const serialize = (doc: XMLDocument) => new XMLSerializer().serializeToString(doc)

export function listOf(selector: string, doc: Element | XMLDocument): NodeListOf<HTMLElement> {
  return doc.querySelectorAll<HTMLElement>(selector)
}

export function replaceUuid(url: string, uuid: string) {
  return url.replace(/[0-9,a-f]{8}-[0-9,a-f]{4}-[0-9,a-f]{4}-[0-9,a-f]{4}-[0-9,a-f]{12}/g, uuid)
}

const timer: { [key: string]: number } = {}

export function debounced(fn: () => void, identifier?: string, timeout: number = 500): void {
  const name = identifier || fn.toString()
  clearTimeout(timer[name])
  timer[name] = window.setTimeout(fn, timeout)
}

export function removeNamespaces(str: string): string {
  return str.replace(/xmlns:e="[^"]*"/g, '').replace(/xmlns="[^"]*"/g, '')
}
