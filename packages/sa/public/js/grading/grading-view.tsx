import React, { JSX } from 'react'
import { PregradingView } from '@digabi/grading-ui/lib/grading/grading-view'
import { pregradingUrls } from './pregrading-urls'
import { Language } from '@digabi/grading-ui/lib/common/types'
import '../../../less/grading-overrides.less'
import { Footer } from '../footer/footer'

function GradingView({ pageBanner, lang }: { pageBanner: JSX.Element; lang: Language }) {
  if (!lang) {
    return
  }
  return (
    <>
      <PregradingView pregradingUrls={pregradingUrls} waitingForCensorHours={0} PageBanner={pageBanner} lang={lang} />
      <div id="footer" className="footer">
        <Footer />
      </div>
    </>
  )
}

export default GradingView
