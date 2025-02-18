import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  CensoringUrls,
  GradingAnswerType,
  GradingContextData,
  GradingExam,
  GradingExamAndScores,
  GradingRole,
  GradingUrlsContextData,
  isEmptyAnswer,
  LocalizeKeyWithOptions,
  PostCensoringScoreResponse,
  PostPreGradingScoreResponse,
  Pregrading,
  PregradingUrls,
  UnfinishedGradedAnswer
} from './types'
import { ActionBar } from './action-bar'
import { useNavigate, useParams } from 'react-router-dom'
import Answer from './answer'
import ErrorDialog from './error-dialog'
import '../../less/grading.less'
import AnswerControls from './answer-controls'
import ScoreHistory from './score-history'
import { GradingScoreTable, PregradingScoreTable } from './score-table'
import { AnswerComment } from './answer-comment'
import classNames from 'classnames'
import ScoreTableInstructions from './score-table-instructions'
import { HelpDialog } from './help-dialog'
import { getJson, postJson } from '../common/utils'
import { Language, UserData } from '../common/types'
import { StudentRowActions } from './student-row-actions'
import { MarkPregradingsReadyUI } from './MarkPregradingsFinishedUI'
import { add, isBefore } from 'date-fns'
import { PregradingControls } from './PregradingControls'
import { AnswerSearch } from './answer-search'
import Split from 'react-split'
import { initScoreTableNavigation } from './grid-navigation'
import { postScoreUpdateState } from './post-score-utils'
import { I18nextProvider, useTranslation } from 'react-i18next'
import i18next from '../locales/i18n'

export const GradingContext = React.createContext<GradingContextData>({} as GradingContextData)
export const GradingUrlsContext = React.createContext<GradingUrlsContextData>({} as GradingUrlsContextData)

export const hasCensorWaitingPeriodPassedForAnswer = (answer: GradingAnswerType | undefined, waitingHours?: number) =>
  answer?.pregrading?.pregradingFinishedAt && waitingHours
    ? isBefore(add(new Date(answer?.pregrading?.pregradingFinishedAt), { hours: waitingHours }), new Date())
    : false

function CommonGradingView(props: {
  gradingUrls: GradingUrlsContextData
  gradingRole: GradingRole
  ScoreTable: typeof PregradingScoreTable | typeof GradingScoreTable
  waitingForCensorHours?: number
  PageBanner: JSX.Element
}) {
  const { gradingRole, ScoreTable, waitingForCensorHours } = props
  const { schoolExamAnonCode, studentCode, displayNumber } = useParams()
  const navigate = useNavigate()
  const gradingUrls = useContext(GradingUrlsContext)
  const { t } = useTranslation()
  const allExams = JSON.parse(window.localStorage.getItem('allExams') || '[]') as GradingExam[]
  const [examAndScores, setExamAndScores] = useState<GradingExamAndScores>()
  const [userData, setUserData] = useState<UserData>()
  const [showPregradingAnnotations, setShowPregradingAnnotations] = useState<boolean>(
    gradingRole === 'pregrading' || localStorage.getItem('hide-annotations') === null
  )
  const [showAllPregradingScores, setShowAllPregradingScores] = useState<boolean>(false)
  const [localizedError, setLocalizedError] = useState<LocalizeKeyWithOptions | undefined>()
  const [helpVisible, setHelpVisible] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [studentEdited, setStudentEdited] = React.useState<string | undefined>()
  const [showMarkGradingFinishedUI, setShowMarkGradingFinishedUI] = useState<boolean>(false)
  const [showAnswerSearchUI, setShowAnswerSearchUI] = useState<boolean>(false)
  const [markOnlyMyGradesFinished, setMarkOnlyMyGradesFinished] = useState<boolean>(true)
  const [markOnlySelectedGradesFinished, setMarkOnlySelectedGradesFinished] = useState<boolean>(false)
  const [columnsToMarkFinished, setColumnsToMarkFinished] = useState<string[]>([])
  const [rowsToMarkFinished, setRowsToMarkFinished] = useState<string[]>([])
  const exam = examAndScores?.exam

  const DEFAULT_SPLIT_SIZES: [number, number] = [75, 25]
  const [latestSplitSizes, setLatestSplitSizes] = useState<[number, number]>(DEFAULT_SPLIT_SIZES)

  const setUpdating = (updating: boolean) => {
    setExamAndScores((previousState: GradingExamAndScores | undefined) => {
      if (!previousState) return previousState
      return { ...previousState, updating }
    })
  }

  useEffect(() => {
    const savedSizes = localStorage.getItem('split-sizes')
    if (savedSizes) {
      const parsed = JSON.parse(savedSizes) as [number, number]
      if (parsed.length === 2 && parsed.every(size => typeof size === 'number')) {
        setLatestSplitSizes(parsed)
      } else {
        setLatestSplitSizes(DEFAULT_SPLIT_SIZES)
      }
    }
  }, [showAnswerSearchUI])

  useEffect(() => {
    setMarkOnlySelectedGradesFinished(columnsToMarkFinished.length + rowsToMarkFinished.length > 0)
  }, [columnsToMarkFinished, rowsToMarkFinished])

  useEffect(() => {
    if (helpVisible) {
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.removeEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [helpVisible])

  function navigateToNextSchool(delta: number) {
    const newIndex = allExams.findIndex(exam => exam.schoolAnonCode == schoolExamAnonCode) + delta
    const newIndexWithinRange = newIndex < 0 ? -1 : newIndex >= allExams.length ? 0 : newIndex
    const nextSchool = allExams.at(newIndexWithinRange)
    if (nextSchool) {
      navigate(gradingUrls.navigateToSchool(gradingRole, nextSchool.schoolAnonCode))
    }
  }

  const isImpersonating = (userData: UserData | undefined) => userData?.user?.details.impersonation !== undefined

  useEffect(() => {
    let isCancel = false
    const fetchDataAsync = async () => {
      if (!userData) {
        const userRes = await getJson<UserData>(gradingUrls.getUser())
        if (userRes.json) {
          return setUserData(userRes.json)
        }
      }
      const examAndScoresRes = await getJson<GradingExamAndScores>(
        gradingUrls.getExamAndScores(gradingRole, schoolExamAnonCode!)
      )
      setLoading(false)
      const examAndScoresJson = examAndScoresRes.json
      if (examAndScoresJson) {
        if (gradingRole === 'censoring' && examAndScoresJson.exam.censorDistributionDone) {
          examAndScoresJson.exam.isCensoringEnabled =
            examAndScoresJson.exam.isCensoringEnabled || isImpersonating(userData)
        }
        examAndScoresJson.updating = false
        if (!isCancel) setExamAndScores(examAndScoresJson)
      }
      if (examAndScoresRes.status >= 400) {
        if (examAndScoresRes.status == 404) {
          setLocalizedError({
            localizeKey: 'arpa.errors.exam_not_found',
            options: {
              close: () => window.location.assign(gradingUrls.returnToEvents(gradingRole)),
              showReload: false
            }
          })
        } else {
          if (!isCancel) setLocalizedError({ localizeKey: 'arpa.errors.problem', options: { logoutButton: true } })
        }
      }
    }
    try {
      void fetchDataAsync()
    } catch (e) {
      if (!isCancel) setLocalizedError({ localizeKey: 'arpa.errors.problem', options: { logoutButton: true } })
    }
    return () => {
      isCancel = true
    }
  }, [schoolExamAnonCode, userData])

  const isScoring = studentCode && displayNumber
  const student = examAndScores?.students?.find(student => student?.studentAnonIdentifier === Number(studentCode))
  const answer = student?.answers.find((answer): answer is GradingAnswerType => answer.displayNumber == displayNumber)
  const answerAndScoresRef = useRef<HTMLDivElement | null>(null)
  const scoreMarginRef = useRef<HTMLDivElement | null>(null)
  const answerWrapRef = useRef<HTMLDivElement | null>(null)
  const allStudentsVisible = (examAndScores?.students || []).every(student => !student.isHidden)

  useEffect(() => {
    const displayNumberPart = displayNumber ? `${displayNumber}.` : ''
    const title = exam ? exam.content.title.substring(5) : ''
    const studentPart = schoolExamAnonCode && studentCode ? ` (${studentCode} / ${schoolExamAnonCode})` : ''
    document.title = `${displayNumberPart}${studentPart} ${title}`
    if (!isScoring) {
      document.body.classList.remove('full_screen')
    }
    scoreMarginRef.current?.scrollTo(0, 0)
    answerWrapRef.current?.scrollTo(0, 0)
  }, [answer?.answerId])

  const unfinishedStudentsAndAnswers = useMemo(
    () =>
      examAndScores?.students.reduce((acc, student) => {
        student.answers.forEach(answer => {
          if (!answer.pregrading?.pregradingFinishedAt && answer.pregrading?.scoreValue != null) {
            const answerData = {
              id: answer.answerId,
              displayNumber: answer.displayNumber,
              studentUuid: student.studentUuid,
              pregradedByUser: answer.pregrading?.authorId === userData?.user?.userAccountId
            }
            acc.push(answerData)
          }
        })
        return acc
      }, [] as UnfinishedGradedAnswer[]),
    [examAndScores]
  )

  if (loading) {
    return <div style={{ padding: '1rem' }}>{t('sa.censor.loading')}</div>
  }

  function updateState(pregradingResponse: Pregrading[]) {
    // Create a lookup object where the keys are studentUuid and the values are another object
    // where the keys are answerId and the values are the corresponding pregrading object
    const data: Record<string, Record<number, Pregrading>> = {}
    pregradingResponse.forEach(pregrading => {
      if (!data[pregrading.studentUuid]) {
        data[pregrading.studentUuid] = {}
      }
      data[pregrading.studentUuid][pregrading.answerId] = pregrading
    })

    const newExamAndScores = {
      ...examAndScores,
      students: examAndScores?.students.map(student => ({
        ...student,
        answers: student.answers.map(answer => ({
          ...answer,
          userCanScore: data[student.studentUuid]?.[answer.answerId]?.userCanScore ?? answer.userCanScore,
          pregrading: data[student.studentUuid]?.[answer.answerId]
            ? { ...data[student.studentUuid]?.[answer.answerId], metadata: answer.pregrading?.metadata }
            : answer.pregrading
        }))
      }))
    } as GradingExamAndScores

    setExamAndScores((previousState: GradingExamAndScores | undefined) => {
      if (!previousState) return previousState
      return newExamAndScores
    })
  }

  const finishPregradingForMultipleAnswers = async (ids: number[]) => {
    const response = await postMarkPregradingFinished(ids)
    if (markOnlySelectedGradesFinished) {
      setColumnsToMarkFinished([])
      setRowsToMarkFinished([])
    }
    return response
  }

  async function markCensorWaitingTimePassedForMultipleAnswers(answerIds: number[]) {
    const response = await postSetCensorWaitingPeriodPassed(answerIds)
    if (markOnlySelectedGradesFinished) {
      setColumnsToMarkFinished([])
      setRowsToMarkFinished([])
    }
    return response
  }

  const postMarkPregradingFinished = async (answerIds?: number[]) => {
    if (answerIds?.length === 0) {
      return
    }
    const response = await postJson<Array<Pregrading & { answerId: number }>>(
      gradingUrls.markPregradingFinished!(schoolExamAnonCode!),
      { answerIds }
    )
    if (response.status >= 400) {
      setLocalizedError({ localizeKey: 'arpa.errors.problem' })
      return
    }
    if (response.json) {
      updateState(response.json)
      return response.json
    }
  }

  async function postSetCensorWaitingPeriodPassed(answerIds?: number[]) {
    if (answerIds?.length === 0) {
      return
    }
    const response = await postJson<Array<Pregrading & { answerId: number }>>(
      `/dev/answers/set-censor-waiting-period-passed`,
      { answerIds }
    )
    if (response.json) {
      updateState(response.json)
      return response.json
    }
  }

  function postRevertPregradingFinishedAt(answerId: number) {
    void (async () => {
      const response = await postJson<Array<Pregrading & { answerId: number }>>(
        gradingUrls.revertPregradingFinished!(answerId)
      )

      if (response.json) {
        updateState(response.json)
        return
      }
    })()
  }

  const pregradingDone = answer?.pregrading && answer.pregrading.pregradingFinishedAt
  const pregradingAnnotationsEnabled = (exam?.canBePregraded && !student?.skipPregrading && !pregradingDone) ?? false
  const gradingAnnotationsEnabled = (exam?.isCensoringEnabled && !!exam.censorDistributionDone) ?? false

  const questionIds =
    gradingRole == 'censoring' && exam ? exam.content.sections.flatMap(section => section.questions) : []

  const navigationMap = initScoreTableNavigation(examAndScores, navigateToAnswer, setUpdating, gradingRole, gradingUrls)

  function navigateToAnswer(newStudentCode?: number, newDisplayNumber?: string, newSchoolExamCode?: string) {
    if (newStudentCode === undefined || newDisplayNumber === undefined) {
      return
    }
    navigate(
      gradingUrls.navigateToAnswer(
        gradingRole,
        newSchoolExamCode || schoolExamAnonCode!,
        newStudentCode.toString(),
        newDisplayNumber
      ),
      {
        replace: true
      }
    )
  }

  async function postScoreAndUpdateState(
    answer: GradingAnswerType | Record<string, never>,
    scoreValue: string,
    setCellSavingState: (loading: boolean) => void
  ) {
    try {
      if (isEmptyAnswer(answer)) {
        return
      }

      const scoreValueNumber = scoreValue == '' ? null : Number(scoreValue)
      setCellSavingState(true)
      const scoreResponse = await postJson<PostPreGradingScoreResponse | PostCensoringScoreResponse>(
        gradingUrls.postScore(gradingRole, answer.answerId),
        {
          scoreValue: scoreValueNumber,
          versionNumber: answer.versionNumber + 1
        }
      )
      setCellSavingState(false)
      if (scoreResponse.json) {
        if (scoreValueNumber !== scoreResponse.json.scoreValue) {
          setLocalizedError({ localizeKey: 'arpa.errors.saving_score_failed' })
        }

        const shouldUpdateCensoringState = gradingRole === 'censoring'
        postScoreUpdateState(
          setExamAndScores,
          scoreResponse.json,
          answer.questionId,
          shouldUpdateCensoringState,
          scoreValueNumber
        )
      }
      if (scoreResponse.status >= 400) {
        if (scoreResponse.status == 401) {
          window.location.assign('/')
        } else {
          setLocalizedError({ localizeKey: 'arpa.errors.saving_score_failed' })
        }
      }
    } catch (err) {
      setLocalizedError({ localizeKey: 'arpa.errors.saving_score_failed' })
    }
  }

  const getAnswerCommentInput = (answer: GradingAnswerType, exam: GradingExam) => (
    <AnswerComment
      gradingRole={gradingRole}
      answer={answer}
      setExamAndScores={setExamAndScores}
      setLocalizedError={setLocalizedError}
      canBeCommented={
        !answer.isProductive && (gradingRole === 'censoring' ? exam.canBeCommented : !!exam.canBePregraded)
      }
      postCommentUrl={gradingUrls.postComment(gradingRole, answer.answerId)}
    />
  )

  return (
    <GradingContext.Provider
      value={{
        user: userData,
        navigationMap,
        currentAnswer: {
          schoolExamAnonCode,
          studentCode,
          displayNumber
        },
        unfinishedStudentsAndAnswers,
        columnsToMarkFinished,
        rowsToMarkFinished,
        markOnlyMyGradesFinished,
        markOnlySelectedGradesFinished,
        showAllPregradingScores,
        postScoreAndUpdateState,
        navigateToAnswer,
        waitingForCensorHours: waitingForCensorHours
      }}>
      {!isScoring && props.PageBanner}
      {exam && (
        <div id="fixed-pos-wrapper" className={classNames({ is_scoring: isScoring })}>
          <div className="top-bar">
            <ActionBar
              exam={exam}
              gradingRole={gradingRole}
              setShowPregradingAnnotations={setShowPregradingAnnotations}
              setShowAllPregradingScores={setShowAllPregradingScores}
              setHelpVisible={setHelpVisible}
              schoolExamAnonCode={schoolExamAnonCode}
              studentCode={studentCode}
              displayNumber={displayNumber}
              navigate={navigate}
              setShowAnswerSearchUI={setShowAnswerSearchUI}
              showAnswerSearchUI={showAnswerSearchUI}
              examContentUrl={gradingUrls.examContent(
                exam.examUuid,
                exam.examCode,
                exam.eventDate,
                exam.language,
                exam.examType
              )}
              attachmentContentUrl={gradingUrls.attachmentsContent(
                exam.examUuid,
                exam.examCode,
                exam.eventDate,
                exam.language,
                exam.examType
              )}
              gradingInstructionsUrl={gradingUrls.gradingInstructions(
                exam.examUuid,
                exam.examCode,
                exam.eventDate,
                exam.language,
                exam.examType
              )}
              returnToGridUrl={gradingUrls.returnToGrid(gradingRole, schoolExamAnonCode, exam.examCode)}
              returnToEventsUrl={gradingUrls.returnToEvents(gradingRole)}
            />

            {gradingRole === 'pregrading' && !answer && (
              <div id="toggle-show-grading-ui">
                <button onClick={() => setShowMarkGradingFinishedUI(true)} className="button">
                  {t('sa.pregrading.mark_gradings_finished')}...
                </button>
              </div>
            )}
          </div>

          <Split
            sizes={showAnswerSearchUI ? latestSplitSizes : [100, 0]}
            minSize={[100, showAnswerSearchUI ? 300 : 0]}
            className="split-view"
            expandToMin={true}
            snapOffset={0}
            cursor="col-resize"
            gutterSize={10}
            gutterStyle={() => ({ display: showAnswerSearchUI ? 'block' : 'none' })}
            onDragEnd={sizes => localStorage.setItem('split-sizes', JSON.stringify(sizes))}>
            <main>
              {!isScoring && (
                <div className="arpa-overview-exam-info">
                  <h1 className="exam-name">
                    {exam.schoolAnonCode} {exam.content.title}
                  </h1>

                  <ScoreTableInstructions
                    schoolExamAnonCode={schoolExamAnonCode ?? ''}
                    canBeGraded={gradingRole === 'pregrading' ? !!exam.canBePregraded : exam.isCensoringEnabled}
                    students={examAndScores.students}
                    allStudentsVisible={allStudentsVisible}
                    gradingRole={gradingRole}
                  />
                </div>
              )}

              {studentEdited && (
                <StudentRowActions
                  examAndScores={examAndScores}
                  setExamAndScores={setExamAndScores}
                  student={examAndScores.students.find(s => s.studentUuid == studentEdited)!}
                  setStudentEdited={setStudentEdited}
                  setLocalizedError={setLocalizedError}
                />
              )}
              <ScoreTable
                examAndScores={examAndScores}
                navigateToNextSchool={navigateToNextSchool}
                setExamAndScores={setExamAndScores}
                gradingRole={gradingRole}
                student={student!}
                studentEdited={studentEdited}
                setStudentEdited={setStudentEdited}
                showMarkGradingFinishedUI={showMarkGradingFinishedUI}
                setColumnsToMarkFinished={setColumnsToMarkFinished}
                setRowsToMarkFinished={setRowsToMarkFinished}
              />

              <div className="answer-and-scores" ref={answerAndScoresRef} tabIndex={1}>
                {answer && (
                  <>
                    <div className="score-margin" ref={scoreMarginRef}>
                      <ScoreHistory
                        answer={answer}
                        gradingRole={gradingRole}
                        skipPregrading={student?.skipPregrading ?? false}
                      />
                      <AnswerControls
                        examAndScores={examAndScores}
                        setExamAndScores={setExamAndScores}
                        setLocalizedError={setLocalizedError}
                        gradingRole={gradingRole}
                      />

                      {gradingRole === 'pregrading' && (
                        <PregradingControls
                          answer={answer}
                          isImpersonating={isImpersonating(userData)}
                          isPregradedByUser={answer.pregrading?.authorId === userData?.user?.userAccountId}
                          postRevertPregradingFinishedAt={postRevertPregradingFinishedAt}
                          postMarkPregradingFinished={postMarkPregradingFinished}
                        />
                      )}
                    </div>
                    <Answer
                      innerRef={answerWrapRef}
                      answer={answer}
                      gradingRole={gradingRole}
                      setLocalizedError={setLocalizedError}
                      setExamAndScores={setExamAndScores}
                      AnswerCommentElement={getAnswerCommentInput(answer, exam)}
                      canBeAnnotated={
                        !answer.isProductive && (pregradingAnnotationsEnabled || gradingAnnotationsEnabled)
                      }
                      showPregradingAnnotations={showPregradingAnnotations}
                    />
                  </>
                )}
              </div>
            </main>

            <div className="split-view-right-column">
              {gradingRole === 'censoring' && showAnswerSearchUI && (
                <aside id="answer-search" className={showAnswerSearchUI ? 'visible' : ''}>
                  <AnswerSearch
                    maxScores={examAndScores.maxScores}
                    displayNumber={displayNumber}
                    examUuid={exam.examUuid}
                    examDetails={exam}
                    questionIds={questionIds}
                    setExamAndScores={setExamAndScores}
                    examAndScores={examAndScores}
                    setLocalizedError={setLocalizedError}
                  />
                </aside>
              )}
            </div>
          </Split>

          {gradingRole === 'pregrading' && !answer && (
            <aside id="mark-grading-finished" className={showMarkGradingFinishedUI ? 'visible' : ''}>
              <MarkPregradingsReadyUI
                userData={userData}
                markCensorWaitingTimePassedForMultipleAnswers={markCensorWaitingTimePassedForMultipleAnswers}
                finishPregradingForMultipleAnswers={finishPregradingForMultipleAnswers}
                closeView={() => setShowMarkGradingFinishedUI(false)}
                markOnlyMyGradesFinished={markOnlyMyGradesFinished}
                setMarkOnlyMyGradesFinished={setMarkOnlyMyGradesFinished}
                setMarkOnlySelectedGradesFinished={setMarkOnlySelectedGradesFinished}
              />
            </aside>
          )}
        </div>
      )}
      {localizedError && (
        <ErrorDialog
          err={{ localizeKey: localizedError.localizeKey, options: { showReload: true, ...localizedError.options } }}
        />
      )}
      {helpVisible && <HelpDialog setHelpVisible={setHelpVisible} />}
    </GradingContext.Provider>
  )

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setHelpVisible(false)
    }
  }
}

export function PregradingView({
  pregradingUrls,
  waitingForCensorHours,
  PageBanner,
  lang
}: {
  pregradingUrls: PregradingUrls
  waitingForCensorHours: number
  PageBanner: JSX.Element
  lang: Language
}) {
  return (
    <I18nextProvider i18n={i18next(lang)}>
      <GradingUrlsContext.Provider value={pregradingUrls}>
        <CommonGradingView
          gradingUrls={pregradingUrls}
          gradingRole="pregrading"
          ScoreTable={PregradingScoreTable}
          waitingForCensorHours={waitingForCensorHours}
          PageBanner={PageBanner}
        />
      </GradingUrlsContext.Provider>
    </I18nextProvider>
  )
}

export function GradingView({
  gradingUrls,
  waitingForCensorHours,
  PageBanner,
  lang
}: {
  gradingUrls: CensoringUrls
  waitingForCensorHours: number
  PageBanner: JSX.Element
  lang: 'fi' | 'sv'
}) {
  return (
    <I18nextProvider i18n={i18next(lang)}>
      <GradingUrlsContext.Provider value={gradingUrls}>
        <CommonGradingView
          gradingUrls={gradingUrls}
          gradingRole="censoring"
          ScoreTable={GradingScoreTable}
          waitingForCensorHours={waitingForCensorHours}
          PageBanner={PageBanner}
        />
      </GradingUrlsContext.Provider>
    </I18nextProvider>
  )
}
