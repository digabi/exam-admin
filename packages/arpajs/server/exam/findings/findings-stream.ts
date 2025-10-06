import * as awsUtils from '../../aws-utils'
import * as examDb from '../../db/exam-data'
import { DataError } from '@digabi/express-utils'
import stream from 'stream'

export async function retrieveNsaFindingsAsStream(heldExamUuid: string) {
  const heldExam = (await examDb.getHeldExam(heldExamUuid)) as {
    title: string
    findingsStatus: 'not_generated' | 'no_findings' | 'has_findings'
  }
  if (!heldExam) {
    throw new DataError('Held exam not found', 404)
  }

  if (heldExam.findingsStatus !== 'has_findings') {
    throw new DataError('No findings available', 404)
  }

  return {
    contents: (await awsUtils.downloadNsaFindings(heldExamUuid)) as stream.Readable,
    filename: `${heldExam.title}.pdf`
  }
}
