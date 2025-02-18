import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { GradingExam } from './types'
import { useTranslation } from 'react-i18next'

interface BaseProps {
  exam: GradingExam
  gradingRole: 'pregrading' | 'censoring' | 'inspection'
  setShowPregradingAnnotations?: (show: boolean) => void
  setHelpVisible?: (show: boolean) => void
  setShowAllInspections?: Dispatch<SetStateAction<boolean>>
  schoolExamAnonCode?: string
  studentCode?: string
  displayNumber?: string
  navigate: (url: string) => void
  setShowAllPregradingScores?: Dispatch<SetStateAction<boolean>>
  setShowAnswerSearchUI: Dispatch<SetStateAction<boolean>>
  showAnswerSearchUI: boolean
  examContentUrl: string
  attachmentContentUrl: string
  gradingInstructionsUrl: string
  returnToGridUrl: string
  returnToEventsUrl: string
}
interface CensoringProps extends BaseProps {
  gradingRole: 'censoring'
  setShowAllPregradingScores: Dispatch<SetStateAction<boolean>>
  setShowAnswerSearchUI: Dispatch<SetStateAction<boolean>>
}
interface PregradingProps extends BaseProps {
  gradingRole: 'pregrading' | 'inspection'
}

type ActionBarProps = CensoringProps | PregradingProps

export function ActionBar(props: ActionBarProps) {
  const {
    exam: {
      examCode,
      content: { title }
    },
    gradingRole,
    setShowPregradingAnnotations = () => false,
    setHelpVisible = () => false,
    setShowAllInspections = () => false,
    schoolExamAnonCode,
    studentCode,
    displayNumber,
    navigate,
    setShowAllPregradingScores,
    setShowAnswerSearchUI,
    showAnswerSearchUI,
    examContentUrl,
    attachmentContentUrl,
    gradingInstructionsUrl,
    returnToGridUrl,
    returnToEventsUrl
  } = props
  const { t } = useTranslation()
  const examsWithNoHvp = ['A_E', 'DC', 'IC', 'QC']
  const hvpContentUrl = examsWithNoHvp.includes(examCode) ? null : gradingInstructionsUrl

  useEffect(() => {
    togglePregradingClass()
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const [toggleAllPregradingScores, setToggleAllPregradingScores] = useState(false)

  const isInGrading = studentCode !== undefined && displayNumber !== undefined

  const censoringInProgress = props.exam.censorDistributionState === 'distribution'

  return (
    <div id="actionBar">
      <span className="back-and-title">
        <div className="goBack">
          {isInGrading ? (
            <ReturnToGridLink navigate={navigate} returnToGridUrl={returnToGridUrl} />
          ) : (
            <a className="returnToEvents" href={returnToEventsUrl}>
              {t('arpa.return_to_exams')}
            </a>
          )}
        </div>

        {(isInGrading || gradingRole === undefined) && (
          <span className="grading-mode-title">
            <span className="schoolExamAnonCode">{schoolExamAnonCode}</span> {title}
          </span>
        )}
      </span>

      <div id="action-buttons">
        {gradingRole !== 'pregrading' && (
          <>
            {gradingRole === 'censoring' && censoringInProgress && (
              <div
                className={`toggle-show-all-pregrading-scores-container  ${toggleAllPregradingScores ? 'on' : ''}`}
                onClick={toggleShowAllPregradingScores}>
                <div className="switch-container">
                  <div className="switch-handle" />
                </div>
                <input type="checkbox" id="toggle-show-all-pregrading-scores" />
                <label htmlFor="toggle-show-all-pregrading-scores">{t('arpa.toggle_pregrading_scores')}</label>
              </div>
            )}

            <div id="toggles">
              {isInGrading && (
                <div id="annotations">
                  <input
                    type="checkbox"
                    id="toggle-annotations"
                    defaultChecked={localStorage.getItem('hide-annotations') === null}
                    onClick={e => toggleAnnotations(e)}
                  />
                  <label htmlFor="toggle-annotations">{t('arpa.show_annotations')}</label>
                </div>
              )}
              {gradingRole !== 'inspection' && (
                <div id="pregrading-scores">
                  <input
                    type="checkbox"
                    id="toggle-pregrading-scores"
                    defaultChecked={localStorage.getItem('show-pregraging-scores') !== null}
                    onClick={e => togglePregrading(e)}
                  />
                  <label htmlFor="toggle-pregrading-scores">{t('arpa.show_pregrading_all')}</label>
                </div>
              )}
              {gradingRole === 'inspection' && (
                <div id="show-all-inspections">
                  <input
                    type="checkbox"
                    id="toggle-all-inspections"
                    defaultChecked={localStorage.getItem('show-completed-inspections') !== null}
                    onClick={e => toggleAllInspections(e)}
                  />
                  <label htmlFor="toggle-all-inspections">{t('arpa.show_all_inspections')}</label>
                </div>
              )}
            </div>
          </>
        )}

        <DocumentLinks examContentUrl={examContentUrl} attachmentContentUrl={attachmentContentUrl}>
          {hvpContentUrl && (
            <a className="view-hvp-link " href={hvpContentUrl} target="_blank" rel="noreferrer">
              <span>{t(gradingRole === undefined ? 'arpa.view_final_hvp' : 'arpa.view_hvp')}</span>
            </a>
          )}
        </DocumentLinks>

        {isInGrading && (
          <>
            <button id="full-screen" className="button icon-button" onMouseDown={e => toggleFullScreen(e)}>
              <i className="fa fa-arrows-alt toggle-fullscreen" title={t('arpa.full_screen')} />
              <i className="fa fa-compress exit-fullscreen" title={t('arpa.exit_full_screen')} />
            </button>
            <button id="help" className="button icon-button" onMouseDown={() => setHelpVisible(true)}>
              <i className="fa-solid fa-circle-info"></i>
            </button>
          </>
        )}

        {gradingRole === 'censoring' && setShowAnswerSearchUI && (
          <div id="toggle-show-answer-search-ui">
            <button
              onClick={() => (showAnswerSearchUI ? setShowAnswerSearchUI(false) : setShowAnswerSearchUI(true))}
              className="button">
              {showAnswerSearchUI ? (
                <>
                  <i className="fa fa-close" />
                  <span>{t('sa.answer_search.close_answer_search')}</span>
                </>
              ) : (
                <>
                  <i className="fa fa-magnifying-glass" />
                  <span>{t('sa.answer_search.search_answers')}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  function toggleFullScreen(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    document.body.classList.toggle('full_screen')
    document.querySelector('.scorePoints.highlight')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  function togglePregradingClass() {
    const checked = gradingRole == 'pregrading' || localStorage.getItem('show-pregraging-scores') !== null
    const classes = Array.from(document.querySelector('body')?.classList || '')
    const newClasses = checked
      ? classes.concat('is_pregrading_visible')
      : classes.filter(c => c != 'is_pregrading_visible')
    document.querySelector('body')?.setAttribute('class', newClasses.join(' '))
  }

  function toggleShowAllPregradingScores(e: React.MouseEvent<HTMLDivElement>) {
    if (setShowAllPregradingScores) {
      e.preventDefault()
      setToggleAllPregradingScores(!toggleAllPregradingScores)
      setShowAllPregradingScores(!toggleAllPregradingScores)
    }
  }
  function togglePregrading(e: React.MouseEvent<HTMLInputElement>) {
    toggleLocalStorageItem('show-pregraging-scores', e.currentTarget.checked)
    togglePregradingClass()
  }
  function toggleAnnotations(e: React.MouseEvent<HTMLInputElement>) {
    toggleLocalStorageItem('hide-annotations', !e.currentTarget.checked)
    setShowPregradingAnnotations(e.currentTarget.checked)
  }

  function toggleAllInspections(e: React.MouseEvent<HTMLInputElement>) {
    toggleLocalStorageItem('show-completed-inspections', e.currentTarget.checked)
    setShowAllInspections(e.currentTarget.checked)
  }
}
function toggleLocalStorageItem(key: string, exists: boolean) {
  if (exists) {
    localStorage.setItem(key, 'true')
  } else {
    localStorage.removeItem(key)
  }
}
function handleKeyDown(e: KeyboardEvent) {
  const isEscape = e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey
  if (
    isEscape &&
    document.querySelector<HTMLFormElement>('.e-grading-answer-add-annotation')?.style.display === 'none'
  ) {
    const highlightedCell = document.querySelector<HTMLInputElement>('.scorePoints.highlight')
    if (highlightedCell) {
      if (highlightedCell === document.activeElement) {
        const element =
          document.querySelector<HTMLDivElement>('.is_inspection #answer-wrap') ||
          document.querySelector<HTMLDivElement>('.answer-and-scores')
        element?.focus()
      } else {
        highlightedCell.focus()
        highlightedCell?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
  }
}

export function ExamCopyActionBar(props: {
  navigate: (url: string) => void
  returnToGridUrl: string
  examContentUrl: string
  attachmentContentUrl: string
}) {
  return (
    <div id="actionBar">
      <span className="back-and-title">
        <div className="goBack">
          <ReturnToGridLink {...props} />
        </div>
      </span>
      <div id="action-buttons">
        <DocumentLinks {...props} />
      </div>
    </div>
  )
}

function ReturnToGridLink(props: { navigate: (url: string) => void; returnToGridUrl: string }) {
  const { t } = useTranslation()
  return (
    <a
      className="returnToGrid"
      onClick={e => {
        e.preventDefault()
        props.navigate(props.returnToGridUrl)
      }}>
      <span>{t('arpa.score_table')}</span>
    </a>
  )
}

function DocumentLinks(props: { examContentUrl: string; attachmentContentUrl: string; children?: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="document-links-container">
      <div className="label">{t('arpa.exam_and_hvp')}</div>
      <div className="document-links">
        <a className="view-exam-link " href={props.examContentUrl} target="_blank" rel="noreferrer">
          <span>{t('arpa.view_exam')}</span>
        </a>
        <a className="view-attachments-link " href={props.attachmentContentUrl} target="_blank" rel="noreferrer">
          <span>{t('arpa.view_attachments')}</span>
        </a>
        {props.children}
      </div>
    </div>
  )
}
