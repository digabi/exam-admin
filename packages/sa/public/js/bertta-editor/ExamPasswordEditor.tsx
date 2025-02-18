import React, { useEffect } from 'react'
import './ExamPassword.less'
import { debounced, ErrorObject, ErrorResponse, Translations } from './util'

export const ExamPasswordEditor = (props: {
  saveExamPassword: (password: string) => Promise<void>
  examPassword: string
  setExamPassword: (name: string) => void
  setSaved: (name: string) => void
  setError: (errorObject: ErrorObject) => void
  t: Translations
}) => {
  const { saveExamPassword, examPassword, setExamPassword, setSaved, setError, t } = props

  useEffect(() => {
    const passwordInput = document.querySelector<HTMLInputElement>('[name=password]')!
    passwordInput.focus()
  }, [])

  function debouncedChange(target: HTMLInputElement) {
    setSaved('')
    setError(null)
    const password = target.value.trim().toLowerCase()
    if (!password) return

    debounced(
      () =>
        void saveExamPassword(password)
          .then(() => {
            setExamPassword(target.value)
            return setSaved(target.name)
          })
          .catch(({ message }: ErrorResponse) => setError({ title: t.error.connection_error, message })),
      'changeExamPassword'
    )
  }

  return (
    <div className="examPasswordContainer basicContainer">
      <input
        type="text"
        name="password"
        className="password"
        maxLength={100}
        required
        defaultValue={examPassword}
        onInput={e => debouncedChange(e.target as HTMLInputElement)}
      />
    </div>
  )
}
