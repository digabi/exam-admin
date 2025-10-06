import { DataError } from '@digabi/express-utils'
import express from 'express'
import SQL from 'sql-template-strings'
import z from 'zod'
import { pgrm } from '../db/local-pg-resource-management'

const analysisRouter = express.Router()

analysisRouter.get('/held-exams', heldExamsHandler)
analysisRouter.post('/analysis-status', express.json(), analysisStatusHandler)

export default analysisRouter

async function heldExamsHandler(req: express.Request, res: express.Response) {
  const ids = heldExamUuidsSchema.safeParse(req.query['ids'])
  if (!ids.success) throw new DataError(`Invalid query parameter "ids"`)

  res.json(await getHeldExamStudents(ids.data))
}

const heldExamUuidsSchema = z.pipeline(
  z.string().transform(s => s.split(',')),
  z.array(z.string().uuid()).min(1)
)

export type ExamStudent = {
  examUuid: string
  heldExamUuid: string
  nsaFindingsStatus: string
  examTitle: string
  studentUuid: string
  studentFirstNames: string
  studentLastName: string
}

function getHeldExamStudents(ids: string[]): Promise<ExamStudent[]> {
  if (!ids.length) return Promise.resolve([])

  return pgrm.queryRowsAsync(
    SQL`SELECT
  exam.exam_uuid AS "examUuid",
  held_exam.held_exam_uuid AS "heldExamUuid",
  held_exam_nsa_findings_status AS "nsaFindingsStatus",
  exam.title AS "examTitle",
  student.student_uuid AS "studentUuid",
  student.first_names AS "studentFirstNames",
  student.last_name AS "studentLastName"
FROM held_exam
NATURAL JOIN exam
NATURAL JOIN answer_paper
NATURAL JOIN student
WHERE held_exam_uuid = ANY(${ids}::uuid[])`
  )
}

async function analysisStatusHandler(req: express.Request, res: express.Response) {
  const pairs = analysisStatusBodySchema.safeParse(req.body)
  if (!pairs.success) throw new DataError('Invalid request body')

  await updateAnalysisStatus(pairs.data)
  res.sendStatus(200)
}

const analysisStatusBodySchema = z.array(z.tuple([z.string().uuid(), z.enum(['no_findings', 'has_findings'])]))

async function updateAnalysisStatus(pairs: [heldExamUuid: string, nsaFindingsStatus: string][]) {
  if (!pairs.length) return

  const heldExamUuids = new Array(pairs.length)
  const statuses = new Array(pairs.length)
  for (let i = 0; i < pairs.length; i++) {
    heldExamUuids[i] = pairs[i][0]
    statuses[i] = pairs[i][1]
  }

  await pgrm.queryAsync(
    SQL`UPDATE held_exam
SET held_exam_nsa_findings_status = pairs.status
FROM unnest(${heldExamUuids}::uuid[], ${statuses}::nsa_findings_status[]) AS pairs(id, status)
WHERE held_exam_uuid = pairs.id`
  )
}
