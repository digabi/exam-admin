import { CensorDistributionState } from '../common/types'

type EventExam = {
  eventUuid: string
  eventDate: string
  examCode: string
  examUuid: string
  title: string
}

export type ArpaExamGradingStatus = ArpaGradingStatus & EventExam

type ArpaGradingStatus = {
  uuid: string
  schoolAnonCode: string
  answerPapers: number
  answers: number
  censorDistributionState: CensorDistributionState
  pregradingScores: number
  autogradedScores: number
  pregradingFinishedCount: number
  censoredAnswerPaperCount: number
  censoringProgress: number
  censoringAnswerProgress: number
  nonAutogradedAnswerPapers: number
  secondRoundCensoredAnswers: number
  secondRoundAnswers: number
  thirdRoundCensoredAnswers: number
  thirdRoundAnswers: number
}

export type ExamGradingStatus = ArpaExamGradingStatus & {
  teacherGradingProgress: number
  teacherGradingCompleted: boolean
  censorGradingCompleted: boolean
  eventDateStr: string
  nextLevelCensoringCompleted?: boolean
  teacherGradingFinishedProgress: number
}

export type ArpaExamPregradingStatus = ArpaPregradingStatus & EventExam

type ArpaPregradingStatus = {
  canBePregraded: boolean
  uuid: string
  title: string
  schoolAnonCode: string
  uploaded?: string
  answerPapers: number
  answers: number
  autogradedScores: number
  pregradingScores: number
  pregradingFinishedCount: number
  pregradingDeadlines: ExamPregradingDeadlines
}

export type ExamPregradingStatus = ArpaExamPregradingStatus & {
  teacherGradingProgress: number
  teacherGradingCompleted: boolean
  eventDateStr: string
  teacherGradingFinishedProgress: number
  heldExamDeletionDate?: string
}

export type ExamPregradingDeadlines = {
  intDeadline: DateAndTarget
  finalDeadline: DateAndTarget
}

type DateAndTarget = {
  date: string | null
  target: number
}

export type PregradingExamUrls = {
  uploadAnswers: (schoolId: string) => string
  heldExams: (schooldId: string) => string
  grading: (schoolAnonCode: string) => string
  reviewAnswers: (schoolAnonCode: string) => string
  deleteAnswers: (schoolAnonCode: string) => string
  undeleteAnswers: (schoolAnonCode: string) => string
  examsWithGrader: (scopeId: string) => string
  unmappedStudents: (schoolId: string) => string
}

export type PregradingExamUrlsContextData = PregradingExamUrls
