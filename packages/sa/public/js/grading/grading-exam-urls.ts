export const gradingExamUrls = {
  uploadAnswers: (_schoolId: string) => '/exam-api/grading/answers-meb',
  heldExams: (_schoolId: string) => '/kurko-api/exam/held-exams',
  grading: (schoolAnonCode: string) => `/school/grading/${schoolAnonCode}`,
  reviewAnswers: (schoolAnonCode: string) => `/school/review/${schoolAnonCode}`,
  deleteAnswers: (schoolAnonCode: string) => `/exam-api/exams/held-exam/${schoolAnonCode}`,
  undeleteAnswers: (schoolAnonCode: string) => `/exam-api/exams/held-exam/${schoolAnonCode}/undelete`,
  examsWithGrader: (_scopeId: string) => '#',
  unmappedStudents: (_schoolId: string) => '#'
}
