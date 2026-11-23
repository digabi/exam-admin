import { DataError } from '@digabi/express-utils'
import express from 'express'
import SQL from 'sql-template-strings'
import z from 'zod'
import { pgrm } from '../db/local-pg-resource-management'

const analysisRouter = express.Router()

analysisRouter.get('/held-exams', heldExamsHandler)

export default analysisRouter

async function heldExamsHandler(req: express.Request, res: express.Response) {
  const ids = heldExamUuidsSchema.safeParse(req.query['ids'])
  if (!ids.success) throw new DataError(`Invalid query parameter "ids"`)

  res.json(await getHeldExamStudents(ids.data))
}

const heldExamUuidsSchema = z.pipe(
  z.string().transform(s => s.split(',')),
  z.array(z.uuid()).min(1)
)

export type ExamStudent = {
  examUuid: string
  heldExamUuid: string
  examTitle: string
  studentUuid: string
  studentFirstNames: string
  studentLastName: string
  ktpVersion: string
  examAccountUsername: string
}

function getHeldExamStudents(ids: string[]): Promise<ExamStudent[]> {
  if (!ids.length) return Promise.resolve([])

  return pgrm.queryRowsAsync(
    SQL`SELECT
  exam.exam_uuid AS "examUuid",
  held_exam.held_exam_uuid AS "heldExamUuid",
  exam.title AS "examTitle",
  student.student_uuid AS "studentUuid",
  student.first_names AS "studentFirstNames",
  student.last_name AS "studentLastName",
  answer_paper.external_computer_allowed AS "externalComputerAllowed",
  held_exam.held_exam_ktp_version AS "ktpVersion",
  user_account.user_account_username AS "examAccountUsername"
FROM held_exam
NATURAL JOIN exam
NATURAL JOIN answer_paper
NATURAL JOIN student
NATURAL JOIN user_account
WHERE held_exam_uuid = ANY(${ids}::uuid[])`
  )
}
