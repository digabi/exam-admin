import React, { JSX } from 'react'
import { HeldExamMinutesView as CommonHeldExamMinutesView } from '@digabi/grading-ui/lib/held-exams/held-exam-minutes-view'
import { gradingExamUrls } from './grading-exam-urls'
import { Language } from '@digabi/grading-ui/lib/common/types'
import '../../../less/grading-overrides.less'
import { Footer } from '../footer/footer'

function HeldExamMinutesView({ pageBanner, lang }: { pageBanner: JSX.Element; lang: Language }) {
  if (!lang) {
    return
  }

  return (
    <>
      <CommonHeldExamMinutesView pregradingExamUrls={gradingExamUrls} PageBanner={pageBanner} lang={lang} />
      <div id="footer" className="footer">
        <Footer />
      </div>
    </>
  )
}

export default HeldExamMinutesView
