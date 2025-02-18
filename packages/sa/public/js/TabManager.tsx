import React from 'react'
import '../../less/tab-bar.less'

export function TabManager() {
  return (
    <div id="tab-bar">
      <a id="exams-link" href="/school/exams" data-i18n="sa.exams_tab" />
      <a id="grading-link" href="/school/grading" data-i18n="sa.grading_tab" />
      <a id="pregrading-link" href="/school/pregrading" className="selected" data-i18n="sa.grading_tab_beta" />
      <a id="settings-link" href="/school/settings" data-i18n="sa.settings_tab" />
    </div>
  )
}
