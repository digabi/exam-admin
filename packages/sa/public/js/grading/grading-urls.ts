import { GradingRole } from '@digabi/grading-ui/lib/grading/types'

export const gradingUrls = {
  getUser: () => '/kurko-api/user',
  navigateToSchool: (_gradingRole: GradingRole, schoolAnonCode: string) => `/school/grading/${schoolAnonCode}`,
  navigateToAnswer: (
    _gradingRole: GradingRole,
    schoolAnonCode: string,
    studentAnonCode: string,
    displayNumber: string
  ) => `/school/grading/${schoolAnonCode}/${studentAnonCode}/${displayNumber}`,
  returnToEvents: (_gradingRole: GradingRole | 'inspection') => '/school/grading',
  returnToGrid: (
    _gradingRole: GradingRole | 'inspection',
    schoolAnonCode?: string,
    _examCode?: string,
    _languageAndExamType?: string
  ) => `/school/grading/${schoolAnonCode}`,
  getExamAndScores: (_gradingRole: GradingRole, schoolAnonCode: string) =>
    `/exam-api/grading/${schoolAnonCode}/student-answers`,
  postScore: (gradingRole: GradingRole, answerId: number) => `/exam-api/grading/scores/${answerId}`,
  postAnnotation: (gradingRole: GradingRole, answerId: number) => `/exam-api/grading/metadata/${answerId}`,
  postComment: (gradingRole: GradingRole, answerId: number) => `/exam-api/grading/comments/${answerId}`,
  examContent: (examUuid: string) => `/school/preview/${examUuid}`,
  attachmentsContent: (examUuid: string) => `/school/preview/${examUuid}/attachments`,
  gradingInstructions: (examUuid: string) => '#',

  // pregrading specific urls
  markPregradingFinished: (schoolAnonCode: string) =>
    `/exam-api/grading/scores/${schoolAnonCode}/mark-grading-finished`,
  revertPregradingFinished: (answerId: number) => `/exam-api/grading/scores/${answerId}/revert-grading-finished`,
  getStudentResults: (schoolAnonCode: string, regStudentUuid: string) =>
    `/exam-api/grading/results/${schoolAnonCode}/${regStudentUuid}`,
  toggleSkipAnswerPaper: (_schoolAnonCode: string, _answerPaperId: number) => '#',
  exportAnswersCsv: (_schoolAnonCode: string) => '#',
  exportAnswersJson: (_schoolAnonCode: string) => '#',
  logout: () => '/kurko-api/user/logout'
}
