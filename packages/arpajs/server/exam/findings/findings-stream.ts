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

  const { body, format } = (await awsUtils.downloadNsaFindings(heldExamUuid)) as {
    body: stream.Readable
    format: string
  }
  return {
    contents: body,
    filename: `${heldExam.title}.${format}`,
    contentType: format === 'html' ? 'text/html; charset=UTF-8' : 'application/pdf'
  }
}
