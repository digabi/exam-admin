import { pgrm } from './local-pg-resource-management'
import SQL from 'sql-template-strings'

export async function getAnswerLength(answerId: number) {
  const result = await pgrm.queryRowsAsync<{ value: string }>(
    SQL`SELECT answer_content -> 'value' AS "value"
            FROM answer
            WHERE answer_id = ${answerId}`
  )
  if (!result.length) {
    throw new Error('Missing answer')
  }
  return result[0].value.length
}
