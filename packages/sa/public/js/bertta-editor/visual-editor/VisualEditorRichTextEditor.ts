import { Attachment, doReq, ErrorResponse, SetAttachments, Translations } from '../util'
import { makeRichText } from 'rich-text-editor'
import { saveOnVisualEditorUpdateWithCallback } from './VisualEditorSaver'
import { attrStr } from './VisualEditorUtil'
import sanitizeHtml from 'sanitize-html'
import { sanitizeOptions } from '../sanitizeOptions'

export function initRichTextEditor(
  editorContainer: HTMLElement,
  attachmentsUrl: string,
  t: Translations,
  doSaveDebounced: (name: string, preSaveFn: () => XMLDocument) => Promise<void>,
  setAttachments: SetAttachments
) {
  // For unknown reason when returning after editing in code editor this won't do anything unless inside setTimeout
  setTimeout(() => {
    renderMathSvg(editorContainer)
  }, 0)
  makeRichText(
    editorContainer,
    {
      ignoreSaveObject: true,
      locale: t.rich_text_editor_locale as 'FI' | 'SV',
      screenshotSaver: async ({ data, type }: { data: Buffer; type: string }) => {
        const blob = data instanceof Blob ? data : new Blob([data], { type })
        const file = new File([blob], `Screenshot ${new Date().toLocaleString('fi')}.${type.split('/')[1]}`)
        try {
          return await saveScreenshot(file, attachmentsUrl, t, setAttachments)
        } catch (err) {
          handleSaveError(err)
          throw err
        }
      },
      screenshotImageSelector:
        'img[src*="/exam-api/"], img[src^="data:image/png"], img[src^="data:image/gif"], img[src^="data:image/jpeg"]',
      invalidImageSelector: 'img:not(img[src^="data"], img[src*="/math.svg?latex="], img[src*="/exam-api/"])',
      fileTypes: ['image/png', 'image/jpeg'],
      sanitize: markup => sanitizeHtml(markup, sanitizeOptions)
    },
    () => saveOnVisualEditorUpdateWithCallback(editorContainer, doSaveDebounced, 'e:formula')
  )
  editorContainer.setAttribute('contenteditable', 'false')
}

async function saveScreenshot(file: File, attachmentsUrl: string, t: Translations, setAttachments: SetAttachments) {
  const form = new FormData()
  form.append('attachmentUpload', file)
  try {
    const [attachment] = await doReq<Attachment[]>('POST', `${attachmentsUrl}/add`, form, null)
    setAttachments((attachments: Attachment[]) => attachments.concat(attachment))
    return `${attachmentsUrl}/${attachment.displayName}`
  } catch (err) {
    return (err as ErrorResponse).status == 413
      ? t.attachment_limit_exceeded(file.name)
      : t.attachment_retryable(file.name)
  }
}

function handleSaveError(err: unknown) {
  console.error('Error when saving screenshot', err)
}

function renderMathSvg(doc: Element) {
  const baseUrl = ''
  doc.querySelectorAll('e\\:formula').forEach(el => {
    const latex = trimLatex(el.textContent!)
    el.insertAdjacentHTML(
      'beforebegin',
      `<img alt="${latex}" src="${`${baseUrl}/math.svg?latex=${encodeURIComponent(latex)}`}" ${attrStr(
        el,
        'mode'
      )}${attrStr(el, 'assistive-title')} />`
    )
    el.remove()
  })
}

function trimLatex(latex: string): string {
  return latex.replace(/(\\|\s)*/g, '') === '' ? '' : latex
}
