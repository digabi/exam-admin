import { pgrm } from './local-pg-resource-management'
import SQL from 'sql-template-strings'

export async function getExamStatistics(startWeek?: string, endWeek?: string) {
  return pgrm.queryRowsAsync(SQL`SELECT held_exam_ktp_version,
                                        to_char(held_exam_created, 'IYYY-IW') AS week,
                                        COUNT(DISTINCT held_exam_uuid)::int   AS exam_count,
                                        COUNT(answer_paper_id)::int           AS answer_paper_count
                                 FROM held_exam
                                        NATURAL JOIN answer_paper
                                 WHERE held_exam_ktp_version LIKE 'SERVER-%'
                                   AND (CAST(${startWeek} AS text) IS NULL OR
                                        to_char(held_exam_created, 'IYYY-IW') >= ${startWeek})
                                   AND (CAST(${endWeek} AS text) IS NULL OR
                                        to_char(held_exam_created, 'IYYY-IW') <= ${endWeek})
                                 GROUP BY held_exam_ktp_version, week
                                 ORDER BY week, held_exam_ktp_version`)
}
