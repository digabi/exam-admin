import React, { useEffect } from 'react'
import { Pregrading } from '@digabi/grading-ui/lib/held-exams/pregrading'
import { gradingExamUrls } from './grading-exam-urls'
import { TabManager } from '../TabManager'
import { PageBanner, useLanguage } from '../page-banner/page-banner'
import { useFetchUser } from './hooks'
import * as i18n from '../i18n'
import '../../../less/grading-overrides.less'
import { Footer } from '../footer/footer'

function GradingList() {
  const lang = useLanguage()
  const userName = useFetchUser()

  useEffect(() => {
    i18n.init(() => {})
  }, [])

  return (
    <>
      <PageBanner userName={userName} />
      <div className="content">
        <TabManager />
        <Pregrading
          scopeId={''}
          roleType="GRADING_TEACHER"
          allowedExams={['']}
          pregradingExamUrls={gradingExamUrls}
          lang={lang}
          examReviewRequired={true}
          examsDeletable={true}
        />
        <div id="footer" className="footer">
          <Footer />
        </div>
      </div>
    </>
  )
}

export default GradingList
