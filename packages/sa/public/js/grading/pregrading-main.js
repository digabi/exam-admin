import React from 'react'
import { createRoot } from 'react-dom/client'
import GradingRouter from './grading-router'
import * as i18n from '../i18n'

i18n.init(() => {
  const container = document.getElementById('grading-view')
  const root = createRoot(container)
  root.render(<GradingRouter />)
})
