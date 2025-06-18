import { pgrm } from './local-pg-resource-management'
import R from 'ramda'

export type Attachment = {
  storageKey: string
  displayName: string
  mimeType: string
  size: number
  metadata: string
}

export function getAttachment(examUuid: string, fileName: string) {
  return (
    pgrm.queryRowsAsync(
      `SELECT storage_key AS "storageKey",
              display_name AS "displayName",
              mime_type AS "mimeType",
              size,
              metadata     AS "metadata"
       FROM attachment
       WHERE exam_uuid = $1
         AND display_name = $2`,
      [examUuid, fileName]
    ) as Promise<Attachment[]>
  ).then(attachments => R.head<Attachment>(attachments))
}

export function getAttachments(examUuid: string) {
  return pgrm.queryRowsAsync(
    `SELECT storage_key AS  "storageKey",
            display_name AS "displayName",
            mime_type AS    "mimeType",
            size,
            metadata     AS "metadata"
     FROM attachment
     WHERE exam_uuid = $1
     ORDER BY display_name ASC`,
    [examUuid]
  ) as Promise<Attachment[]>
}
