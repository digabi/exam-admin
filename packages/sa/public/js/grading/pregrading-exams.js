import React from 'react'
import { createRoot } from 'react-dom/client'
import GradingList from './grading-list'

const container = document.getElementById('grading-view-exams')
const root = createRoot(container)
root.render(<GradingList pageBanner={<></>} lang={'fi'} />)
