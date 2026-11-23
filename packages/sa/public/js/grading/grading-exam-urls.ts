export const gradingExamUrls = {
  uploadAnswers: (_schoolId: string) => '/exam-api/grading/held-exam-packages',
  heldExams: (_schoolId: string) => '/kurko-api/exam/held-exams',
  heldExamsView: () => '/school/grading',
  minutesData: (schoolAnonCode: string) => `/exam-api/exams/held-exam/${schoolAnonCode}/minutes`,
  minutesView: (schoolAnonCode: string) => `/school/grading/minutes/${schoolAnonCode}`,
  grading: (schoolAnonCode: string) => `/school/grading/${schoolAnonCode}`,
  reviewAnswers: (schoolAnonCode: string) => `/school/review/${schoolAnonCode}`,
  deleteAnswers: (schoolAnonCode: string) => `/exam-api/exams/held-exam/${schoolAnonCode}`,
  undeleteAnswers: (schoolAnonCode: string) => `/exam-api/exams/held-exam/${schoolAnonCode}/undelete`,
  examsWithGrader: (_scopeId: string) => '#',
  unmappedStudents: (_schoolId: string) => '#'
}
