import translationFI from '../../locales/fi'

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof translationFI }
  }
}
