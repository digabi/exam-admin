import { pgrm } from './local-pg-resource-management'
import SQL from 'sql-template-strings'
import * as awsUtils from '../aws-utils'
import { logger } from '../logger'

export async function changeUserName(oldUsername: string, newUsername: string) {
  await assertUsernameExists(oldUsername)
  await pgrm.queryRowsAsync(
    SQL`UPDATE user_account SET user_account_username = ${newUsername} WHERE user_account_username = ${oldUsername}`
  )
}

export async function moveExamsFromUsername(oldUsername: string, newUsername: string) {
  await assertUsernameExists(oldUsername)
  await assertUsernameExists(newUsername)
  return pgrm.queryRowsAsync(
    SQL`UPDATE exam SET user_account_id = (
    SELECT user_account_id FROM user_account WHERE user_account_username = ${newUsername}
    ) WHERE user_account_id = (SELECT user_account_id FROM user_account WHERE user_account_username = ${oldUsername}) returning *`
  )
}

export async function assertUsernameExists(username: string) {
  const result = await pgrm.queryRowsAsync(SQL`SELECT 1 FROM user_account WHERE user_account_username = ${username}`)
  if (result.length !== 1) {
    logger.info('Username not found', { username })
    throw new Error('Username not found')
  }
}

export async function ktpVersionsByWeek() {
  return pgrm.queryRowsAsync(SQL`select to_char(held_exam_created, 'YYYYWW')::int as held_exams_creation_week,
           server_environment_data ->> 'environment_ktp_version' as ktp_version,
           count(held_exam_uuid) as held_exam_count
       from server_environment
           natural join server_environment_held_exam_map
           natural join held_exam
       where server_environment_data ->> 'environment_ktp_version' <> ''
               and held_exam_created >= now() - interval '1 year'
       group by 1,2
       order by 1`)
}
export async function ktpTypesByWeek() {
  return pgrm.queryRowsAsync(SQL`select to_char(held_exam_created, 'YYYYWW')::int as held_exams_creation_week,
           count(distinct held_exam_uuid) filter (where server_environment_data ->> 'environment_virtual' = 'true') as virtual,
           count(distinct held_exam_uuid) filter (where server_environment_data ->> 'environment_virtual' = 'false') as tikku
       from held_exam
                natural join server_environment_held_exam_map
                natural join server_environment
       where held_exam_created >= now() - interval '1 year'
       group by 1
       order by 1`)
}

export async function deleteExams(days: number) {
  logger.audit('Pruning permanently exams deleted.', { softDeletedDaysAgo: days })

  const [{ storageKeys, deletedExams }] = await pgrm.queryRowsAsync<{
    storageKeys: string[]
    deletedExams: number
  }>(SQL`WITH exams_to_be_deleted AS (SELECT exam_uuid FROM exam WHERE deletion_date < now() - (${days} || ' days')::INTERVAL limit 300),
            storage_keys AS (SELECT DISTINCT storage_key
        FROM attachment
            NATURAL JOIN exams_to_be_deleted),
            deleted_exams AS (DELETE FROM exam WHERE exam_uuid IN (SELECT exam_uuid FROM exams_to_be_deleted))
        SELECT coalesce(json_agg(storage_key), '[]') AS "storageKeys", (SELECT count(1)::integer FROM exams_to_be_deleted) AS "deletedExams"
        FROM storage_keys`)
  await deleteFromS3(storageKeys)
  const deletedHeldExams = await pgrm.queryRowsAsync(
    SQL`DELETE FROM held_exam WHERE held_exam_uuid IN (SELECT held_exam_uuid FROM held_exam WHERE held_exam_deletion_date < now() - (${days} || ' days')::INTERVAL LIMIT 300) returning *`
  )
  logger.audit(`Pruned ${deletedExams} exams with answers and ${deletedHeldExams.length} held exams`)
  return { deletedExams, deletedHeldExams: deletedHeldExams.length }
}

export async function deleteExamsFromUser(userName: string, deleteUntilDate?: string) {
  logger.audit('Removing some exams for given user', { userName, deleteUntilDate })

  if (deleteUntilDate) {
    const updatedRows = await pgrm.queryRowsAsync(
      SQL`UPDATE exam SET deletion_date = now()
          WHERE creation_date < ${deleteUntilDate}
            AND user_account_id = (SELECT user_account_id FROM user_account WHERE user_account_username = ${userName})
          RETURNING *`
    )
    logger.audit('Marked exams as deleted for given user', { userName, rowsMarkedAsDeleted: updatedRows.length })
  }

  const [{ storageKeys, deletedExams }] = await pgrm.queryRowsAsync<{
    storageKeys: string[]
    deletedExams: number
  }>(SQL`WITH exams_to_be_deleted AS (SELECT exam_uuid FROM exam natural join user_account WHERE user_account_username = ${userName} and deletion_date is not null),
            storage_keys AS (SELECT DISTINCT storage_key
        FROM attachment
            NATURAL JOIN exams_to_be_deleted),
            deleted_exams AS (DELETE FROM exam WHERE exam_uuid IN (SELECT exam_uuid FROM exams_to_be_deleted))
        SELECT coalesce(json_agg(storage_key), '[]') AS "storageKeys", (SELECT count(1)::integer FROM exams_to_be_deleted) AS "deletedExams"
        FROM storage_keys`)
  await deleteFromS3(storageKeys)
  logger.audit('Removed exams for given user', { userName, deletedExams })
  return { deletedExams }
}

function chunk(array: string[]): string[][] {
  const chunkSize = 500
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize)
    chunks.push(chunk)
  }
  return chunks
}

async function deleteFromS3(storageKeys: string[]) {
  logger.audit(`Removing totally ${storageKeys.length} unused attachments from s3`)
  const storageKeyChunks = chunk(storageKeys)
  for (const storageKeyChunk of storageKeyChunks) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await awsUtils.deleteAttachmentBuffersFromS3(storageKeyChunk)
    logger.audit(`Just removed ${storageKeyChunk.length} unused attachments from s3`)
  }
}
