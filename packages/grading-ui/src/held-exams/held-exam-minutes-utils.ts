import { MinutesNote } from './types'

export function filterMinutesRows(
  rows: MinutesNote[],
  selectedExamFilter: string | null,
  selectedRoomFilter: string | null
) {
  // if only exam filter is applied, display also all room notes,
  // because we don't know in which room(s) the exam was held

  return rows.filter(row => {
    const examMatches = !selectedExamFilter || row.examUuid === selectedExamFilter || !row.examUuid
    const roomMatches = !selectedRoomFilter || row.examRoomName === selectedRoomFilter

    return examMatches && roomMatches
  })
}
