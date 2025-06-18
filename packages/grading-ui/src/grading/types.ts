import { Annotation, AudioAnswer, GradingStructure, RichTextAnswer, TextAnswer } from '@digabi/exam-engine-core'
import { Dispatch, SetStateAction } from 'react'
import { Language, CensorDistributionState, UserData } from '../common/types'
import { NavigateInGrid } from './grid-navigation'
import { isEmpty } from 'lodash'

export type ExamType = 'normal' | 'visually-impaired' | 'hearing-impaired'

export type GradingRole = 'pregrading' | 'censoring'

export type CopyOfExamPaperExam = {
  language?: Language
  gradingStructure: GradingStructure
  contentXml: string
}

export type GradingExam = {
  examUuid: string
  examCode: string
  examType: ExamType
  eventDate: string
  language: string
  canBePregraded?: boolean
  censorDistributionDone?: boolean
  canBeCommented: boolean
  schoolAnonCode: string
  isCensoringEnabled: boolean
  isFirstLevelCensor: boolean
  censorDistributionState: CensorDistributionState
  content: {
    title: string
    sections: GradingStructure[]
  }
}

export type CensoringScore = {
  scoreValue: number
  censoringRound: number
  shortCode: string
  censorId: string
}

type PostScoreResponse = {
  answerId: number
  scoreValue: number | null
  versionNumber: number
  shortCode: string | null
  censorId?: string
  authorId: string | null
  censoringRound: number
  censoringState: CensoringState
}

export type PostPreGradingScoreResponse = PostScoreResponse & { authorId?: string }
export type PostCensoringScoreResponse = PostScoreResponse & { censorId?: string }

export type CensoringState =
  | 'no_score'
  | 'initial_ok'
  | 'handled'
  | 'waiting_for_second'
  | 'waiting_for_third'
  | 'needs_first_approval'
  | 'needs_second_approval'
  | 'needs_both_approvals'
  | 'second_in_progress'
  | 'third_in_progress'

export type Censoring = {
  censoringState: CensoringState
  scores: CensoringScore[]
  metadata: {
    annotations: Annotation[]
  } | null
}

export type Pregrading = {
  authorId: string | null
  comment: string | null
  metadata: { annotations: Annotation[] } | null
  pregradingFinishedAt: Date
  scoreValue: number | null
  shortCode: string | null
  versionNumber: number
  studentUuid: string
  answerId: number
  userCanScore: boolean
}

export type Inspection = {
  scoreValue: number | null
  shortCode: string
  versionNumber: number
}

export type Inspector = {
  uuid: string
  shortCode?: string
  isCompleted?: boolean
}

export type GradingAnswerType = {
  answerId: number
  displayNumber: string
  content: RichTextAnswer | TextAnswer | AudioAnswer
  questionId: number
  maxScore: number
  maxLength?: number
  pregrading?: Pregrading
  censoring?: Censoring
  inspection?: Inspection
  scoreValue: number | null
  censoringScoreValue: number
  userCanScore: boolean
  scoreDifference?: string
  versionNumber: number
  comment?: string
  rationale?: string
  inspectionState: InspectionState
  isProductive: boolean
}
export type Annotations = {
  pregrading: Annotation[]
  censoring: Annotation[]
}

export type GradingStudent = {
  studentUuid: string
  answerPaperId: number
  autogradedAnswers: string[]
  regStudentUuid: string
  studentAnonIdentifier: number
  schoolAnonCode: string
  lastName?: string
  firstNames?: string
  href?: string
  answers: (GradingAnswerType | Record<string, never>)[]
  totalAutogradingScore: number
  totalScore: number
  score: string
  scoreDifferenceAcknowledgedBy: string | null
  isHidden?: boolean
  inspectorCanScore: boolean
  inspectionReady: boolean
  inspectors: Inspector[]
  userCanBeInspector: boolean
  manualHandling: boolean
  sentToRegistry: boolean
  censorIsDisqualified?: boolean
  skipPregrading?: boolean
}

export type StudentResponse = { student: GradingStudent }

export type MaxScore = {
  displayNumber: string
  maxScore: number
  id?: number
}

export type ScoreAverage = {
  questionId: number
  average: string
}

export type GradingExamAndScores = {
  areResultsPublishedToKoski: boolean
  exam: GradingExam
  questionCount: number
  maxScores: MaxScore[]
  autogradingAnswers: boolean
  maxAutogradingScore: number
  meanAutogradingScore: number
  students: GradingStudent[]
  scoreAverages?: ScoreAverage[]
  autogradingDone: boolean
  updating: boolean
}

export type SetExamAndScores = Dispatch<SetStateAction<GradingExamAndScores | undefined>>
export type SetLocalizedError = Dispatch<SetStateAction<LocalizeKeyWithOptions | undefined>>
export type SetStudentEdited = Dispatch<SetStateAction<string | undefined>>

type CommonScoreTableProps = {
  examAndScores: GradingExamAndScores
  setExamAndScores: SetExamAndScores
}

export type ScoreTableProps = CommonScoreTableProps & {
  gradingRole: GradingRole
  student: GradingStudent
  navigateToNextSchool?: (delta: number) => void
  studentEdited?: string
  setStudentEdited: SetStudentEdited
}

type ErrorDialogKey =
  | 'arpa.errors.problem'
  | 'arpa.errors.saving_score_failed'
  | 'arpa.errors.saving_skip_pregrading_failed'
  | 'arpa.errors.saving_metadata_failed'
  | 'arpa.errors.saving_comment_failed'
  | 'arpa.errors.exam_not_found'

export type LocalizeKeyWithOptions = {
  localizeKey: ErrorDialogKey
  options?: { logoutButton?: boolean; showReload?: boolean; close?: () => void }
}

export type ErrorProps = { err: LocalizeKeyWithOptions }

export type StudentExamScores = {
  examAndScores: GradingExamAndScores
  student: GradingStudent
}

export type NavigateToAnswerFunction = (
  newStudentCode: number,
  newDisplayNumber: string,
  newSchoolExamCode?: string
) => void

type CommonGradingContextData = {
  user?: UserData
  unfinishedStudentsAndAnswers?: UnfinishedGradedAnswer[]
}

export type GradingContextData = CommonGradingContextData & {
  navigateInGrid: NavigateInGrid
  currentAnswer: Partial<{
    schoolExamAnonCode: string
    studentCode: string
    displayNumber: string
  }>
  columnsToMarkFinished: string[]
  rowsToMarkFinished: string[]
  markOnlyMyGradesFinished: boolean
  markOnlySelectedGradesFinished?: boolean
  showAllPregradingScores: boolean
  postScoreAndUpdateState: (
    answer: GradingAnswerType | Record<string, never>,
    scoreValue: string,
    setCellSavingState: (loading: boolean) => void
  ) => Promise<void>
  navigateToAnswer: NavigateToAnswerFunction
  waitingForCensorHours?: number
}

export type UnfinishedGradedAnswer = {
  id: number
  displayNumber: string
  studentUuid: string
  pregradedByUser: boolean
}

export type InspectionState =
  | 'no_inspection'
  | 'requested'
  | 'handled_with_rejection'
  | 'handled_with_score'
  | 'needs_score'

export const isEmptyAnswer = (a: GradingAnswerType | Record<string, never>): a is Record<string, never> => isEmpty(a)

export type AnswerSearchResultData = {
  totalResultCount: number
  slicedData: AnswerSearchResultDetails[]
}

export type AnswerSearchResultDetails = {
  displayNumber: string
  studentAnonIdentifier: number
  schoolAnonCode: string
  censoringScoreValue: number
  answerContent: string
  maxScore: number
  answerId: number
  versionNumber: number
  questionId: number
  comment: string | null
  userCanScore: boolean
  censoringState: CensoringState
}

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U

type GradingUrls = {
  getUser: () => string
  navigateToSchool: (gradingRole: GradingRole, schoolAnonCode: string) => string
  navigateToAnswer: (
    gradingRole: GradingRole,
    schoolAnonCode: string,
    studentAnonCode: string,
    displayNumber: string
  ) => string
  returnToEvents: (gradingRole: GradingRole | 'inspection') => string
  returnToGrid: (
    gradingRole: GradingRole | 'inspection',
    schoolAnonCode?: string,
    examCode?: string,
    languageAndExamType?: string
  ) => string
  getExamAndScores: (gradingRole: GradingRole, schoolAnonCode: string) => string
  postScore: (gradingRole: GradingRole, answerId: number) => string
  postAnnotation: (gradingRole: GradingRole, answerId: number) => string
  postComment: (gradingRole: GradingRole, answerId: number) => string
  examContent: (examUuid: string, examCode: string, eventDate: string, language: string, examType: ExamType) => string
  attachmentsContent: (
    examUuid: string,
    examCode: string,
    eventDate: string,
    language: string,
    examType: ExamType
  ) => string
  gradingInstructions: (
    examUuid: string,
    examCode: string,
    eventDate: string,
    language: string,
    examType: ExamType
  ) => string
  logout: () => string
}

export type PregradingUrls = GradingUrls & {
  toggleSkipAnswerPaper: (schoolAnonCode: string, answerPaperId: number) => string
  markPregradingFinished: (schoolAnonCode: string) => string
  revertPregradingFinished: (answerId: number) => string
  getStudentResults: (schoolAnonCode: string, regStudentUuid: string) => string
  exportAnswersCsv: (schoolAnonCode: string) => string
  exportAnswersJson: (schoolAnonCode: string) => string
}

export type CensoringUrls = GradingUrls & {
  getStudentFromPreviousOrNextSchool: (
    direction: string,
    examUuid: string,
    questionId: number,
    schoolAnonCode: string
  ) => string
  getFirstAnswerWithNoScore: (examUuid: string, questionId: number) => string
  getPreviousOrNextAnswerWithNoScore: (
    direction: string,
    examUuid: string,
    questionId: number,
    schoolAnonCode: string
  ) => string
  requestNextCensor: (answerId: number) => string
  cancelNextCensor: (answerId: number) => string
  postAnswerPaperToSecondRound: (answerPaperId: number) => string
  toggleAcknowledgeScoreDifference: (endpoint: string, answerPaperId: number) => string
  postCensorAction: (endpoints: string, answerId: number) => string
  getExamQuestion: (examCode: string, questionId: number) => string
  getCorrectAnswers: (examCode: string, questionId: number) => string
  postProductiveScore: (examUuid: string, questionId: number) => string
  getAnswerSearchResults: (examUuid: string) => string
}

export type GradingUrlsContextData = XOR<PregradingUrls, CensoringUrls>
