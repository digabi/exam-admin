import React from 'react'
import { Translations } from '../util'
import './PublicExamPicker.less'

type PublicExamPickerProps = {
  publicExams: boolean
  setPublicExams: (publicExams: boolean) => void
  t: Translations
}

export const PublicExamPicker = ({ publicExams, setPublicExams, t }: PublicExamPickerProps) => (
  <div className="publicExamPicker">
    <input
      id="ownExams"
      name="ownOrPublicExams"
      type="radio"
      checked={!publicExams}
      onChange={() => setPublicExams(false)}
    />{' '}
    <label htmlFor="ownExams">{t.search.own}</label>
    <input
      id="publicExams"
      name="ownOrPublicExams"
      type="radio"
      checked={publicExams}
      onChange={() => setPublicExams(true)}
    />{' '}
    <label htmlFor="publicExams">{t.search.public}</label>
  </div>
)
