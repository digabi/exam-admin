import SQL from 'sql-template-strings'
import { pgrm } from './local-pg-resource-management'

export async function isExamImported(fileKey: string) {
  const result = pgrm.queryRowsAsync<{ exists: boolean }>(
    SQL`SELECT EXISTS(
            SELECT 1
            FROM imported_public_exam
            WHERE file_key = ${fileKey}
            )`
  )
  return (await result)[0].exists
}

export async function setExamImported(examUuid: string, fileKey: string) {
  await pgrm.queryRowsAsync<{ exists: boolean }>(
    SQL`INSERT INTO imported_public_exam (exam_uuid, file_key)
            VALUES (${examUuid}, ${fileKey})`
  )
}

export async function setExamAsSkipped(fileKey: string) {
  await pgrm.queryRowsAsync<{ exists: boolean }>(
    SQL`INSERT INTO imported_public_exam (exam_uuid, file_key, skipped_exam)
            VALUES (NULL, ${fileKey}, TRUE)`
  )
}
