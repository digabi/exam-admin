// Type override for rich-text-editor library
// The library incorrectly uses Node.js Buffer type, but in browser context
// it actually passes File or Uint8Array

declare module 'rich-text-editor' {
  export interface RichTextEditorOptions {
    ignoreSaveObject?: boolean
    locale?: 'FI' | 'SV'
    screenshotSaver?: (params: { data: File | Uint8Array<ArrayBuffer>; type: string }) => Promise<string>
    baseUrl?: string
    screenshotImageSelector?: string
    invalidImageSelector?: string
    fileTypes?: string[]
    sanitize?: (markup: string) => string
    updateMathImg?: (jQuery: unknown, latex: string) => void
    forceInit?: boolean
  }

  export function makeRichText(
    element: Element,
    options: RichTextEditorOptions,
    onChange: (data: { answerHTML: string; answerText: string }) => void
  ): void
}
