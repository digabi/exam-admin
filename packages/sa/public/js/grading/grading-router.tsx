import React, { useEffect } from 'react'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import GradingView from './grading-view'
import { PageBanner, useLanguage } from '../page-banner/page-banner'
import * as i18n from '../i18n'
import { useFetchUser } from './hooks'

function GradingRouter() {
  const lang = useLanguage()
  const userName = useFetchUser()
  const pageBanner = <PageBanner userName={userName} />

  useEffect(() => {
    i18n.init(() => {})
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/school/grading/:schoolExamAnonCode/:studentCode?/:displayNumber?"
          element={<GradingView pageBanner={pageBanner} lang={lang} />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default GradingRouter
