import _ from 'lodash'
import SQL from 'sql-template-strings'
import { pgrm } from './local-pg-resource-management'
import { logger } from '../logger'

export type MinutesNote = {
  eventUuid: string
  timestamp: number
  note: string
  extraTime?: number
  studentUuid?: string
  firstNames?: string
  lastName?: string
  examUuid?: string
  examTitle?: string
  examRoomName?: string
}

export type MinutesExamRef = {
  examUuid: string
  examTitle: string
  isDefaultExam: boolean
}

export type MinutesResponse = {
  examRooms: string[]
  notes: MinutesNote[]
  exams: MinutesExamRef[]
}

export async function getMinutesByHeldExamUuid(heldExamUuid: string): Promise<MinutesResponse | undefined> {
  const heldExamRow = await queryHeldExamMinutesRow(heldExamUuid)
  if (!heldExamRow || !heldExamRow.minutesSessionId) {
    logger.info('Held exam has no minutes session', { heldExamUuid })
    return
  }

  const { minutesSessionId, defaultExamUuid } = heldExamRow
  const { examRooms, roomEvents, studentEvents } = await loadMinutesSessionBundle(minutesSessionId)

  const distinctExamUuids = [...new Set(studentEvents.map(event => event.examUuid))]
  const distinctStudentUuids = [...new Set(studentEvents.map(event => event.studentUuid))]
  const { titleByExamUuid, nameByStudentUuid } = await buildExamAndStudentLookupMaps(
    distinctExamUuids,
    distinctStudentUuids
  )

  const notes = mergeAndSortMinutesNotes(roomEvents, studentEvents, titleByExamUuid, nameByStudentUuid)
  const exams = buildMinutesExamsList(distinctExamUuids, titleByExamUuid, defaultExamUuid)

  return { examRooms, notes, exams }
}

async function queryHeldExamMinutesRow(heldExamUuid: string) {
  const rows = await pgrm.queryRowsAsync<{
    minutesSessionId: string | null
    defaultExamUuid: string
  }>(
    SQL`SELECT minutes_session_id AS "minutesSessionId",
               exam_uuid AS "defaultExamUuid"
        FROM held_exam
        WHERE held_exam_uuid = ${heldExamUuid}`
  )
  return rows[0]
}

async function loadMinutesSessionBundle(minutesSessionId: string) {
  const [examRoomRows, roomEvents, studentEvents] = await Promise.all([
    pgrm.queryRowsAsync<{ examRoomName: string }>(
      SQL`SELECT exam_room_name AS "examRoomName"
          FROM minutes_exam_room
          WHERE minutes_session_id = ${minutesSessionId}
          ORDER BY exam_room_name ASC`
    ),
    pgrm.queryRowsAsync<{
      examRoomName: string
      note: string
      eventTimestamp: Date
      eventUuid: string
    }>(
      SQL`SELECT exam_room_name AS "examRoomName",
                 note,
                 event_timestamp AS "eventTimestamp",
                 event_uuid AS "eventUuid"
          FROM minutes_exam_room_event
          WHERE minutes_session_id = ${minutesSessionId}`
    ),
    pgrm.queryRowsAsync<{
      studentUuid: string
      examUuid: string
      examRoomName: string | null
      note: string
      extraTime: number | null
      eventTimestamp: Date
      eventUuid: string
    }>(
      SQL`SELECT student_uuid AS "studentUuid",
                 exam_uuid AS "examUuid",
                 exam_room_name AS "examRoomName",
                 note,
                 extra_time AS "extraTime",
                 event_timestamp AS "eventTimestamp",
                 event_uuid AS "eventUuid"
          FROM minutes_student_event
          WHERE minutes_session_id = ${minutesSessionId}`
    )
  ])
  return {
    examRooms: examRoomRows.map(row => row.examRoomName),
    roomEvents,
    studentEvents
  }
}

async function buildExamAndStudentLookupMaps(examUuids: string[], studentUuids: string[]) {
  const [examRows, studentRows] = await Promise.all([
    pgrm.queryRowsAsync<{ examUuid: string; examTitle: string }>(
      SQL`SELECT exam_uuid AS "examUuid", title AS "examTitle"
              FROM exam
              WHERE exam_uuid = ANY(${examUuids})`
    ),
    pgrm.queryRowsAsync<{
      studentUuid: string
      firstNames: string
      lastName: string
    }>(
      SQL`SELECT student_uuid AS "studentUuid",
                     first_names AS "firstNames",
                     last_name AS "lastName"
              FROM student
              WHERE student_uuid = ANY(${studentUuids})`
    )
  ])
  return {
    titleByExamUuid: new Map(examRows.map(({ examUuid, examTitle }) => [examUuid, examTitle])),
    nameByStudentUuid: new Map(
      studentRows.map(({ studentUuid, firstNames, lastName }) => [studentUuid, { firstNames, lastName }])
    )
  }
}

function mergeAndSortMinutesNotes(
  roomEvents: {
    examRoomName: string
    note: string
    eventTimestamp: Date
    eventUuid: string
  }[],
  studentEvents: {
    studentUuid: string
    examUuid: string
    examRoomName: string | null
    note: string
    extraTime: number | null
    eventTimestamp: Date
    eventUuid: string
  }[],
  titleByExamUuid: Map<string, string>,
  nameByStudentUuid: Map<string, { firstNames: string; lastName: string }>
): MinutesNote[] {
  return [
    ...roomEvents.map(({ eventTimestamp, examRoomName, note, eventUuid }): MinutesNote => ({
      eventUuid,
      timestamp: new Date(eventTimestamp).getTime(),
      note,
      examRoomName
    })),
    ...studentEvents.map(
      ({ eventTimestamp, note, studentUuid, examUuid, examRoomName, extraTime, eventUuid }): MinutesNote => {
        const names = nameByStudentUuid.get(studentUuid)
        const examTitle = titleByExamUuid.get(examUuid)
        return {
          eventUuid,
          timestamp: new Date(eventTimestamp).getTime(),
          note,
          studentUuid,
          firstNames: names?.firstNames,
          lastName: names?.lastName,
          examUuid,
          examTitle,
          examRoomName: examRoomName ?? undefined,
          extraTime: extraTime ?? undefined
        }
      }
    )
  ].sort((a, b) => a.timestamp - b.timestamp)
}

function buildMinutesExamsList(
  examUuids: string[],
  titleByExamUuid: Map<string, string>,
  defaultExamUuid: string
): MinutesExamRef[] {
  return examUuids
    .map(uuid => ({
      examUuid: uuid,
      examTitle: titleByExamUuid.get(uuid) ?? '',
      isDefaultExam: uuid === defaultExamUuid
    }))
    .sort((a, b) => a.examTitle.localeCompare(b.examTitle))
}

export async function importMinutes(entries: unknown[], heldExamUuids: string[]) {
  const sessionEntry = entries.find((e: unknown) => isRecord(e) && e.type === 'minutes-session') as
    { minutesUuid?: string } | undefined
  if (!sessionEntry?.minutesUuid) {
    logger.warn('Minutes payload missing minutes-session entry')
    return
  }

  const minutesSessionId = sessionEntry.minutesUuid

  return pgrm.withTransaction(async tx => {
    for (const heldExamUuid of heldExamUuids) {
      await tx.queryRowsAsync(
        SQL`UPDATE held_exam
            SET minutes_session_id = ${minutesSessionId}
            WHERE held_exam_uuid = ${heldExamUuid}`
      )
    }

    for (const entry of entries) {
      if (!isRecord(entry)) {
        continue
      }
      switch (entry.type) {
        case 'minutes-session':
          break
        case 'exam-room':
          await tx.queryRowsAsync(
            SQL`INSERT INTO minutes_exam_room (minutes_session_id, exam_room_name)
                VALUES (${minutesSessionId}, ${entry.examRoomName})
                ON CONFLICT (minutes_session_id, exam_room_name) DO NOTHING`
          )
          break
        case 'exam-room-event':
          await tx.queryRowsAsync(
            SQL`INSERT INTO minutes_exam_room_event
                  (minutes_session_id, exam_room_name, note, event_timestamp, event_uuid)
                VALUES (
                  ${minutesSessionId},
                  ${entry.examRoomName},
                  ${entry.note},
                  ${new Date(Number(entry.timestamp))},
                  ${entry.eventUuid}
                )
                ON CONFLICT (minutes_session_id, event_uuid) DO NOTHING`
          )
          break
        case 'student-event':
          await tx.queryRowsAsync(
            SQL`INSERT INTO minutes_student_event
                  (minutes_session_id, student_uuid, exam_uuid, exam_room_name, note, event_timestamp, extra_time, event_uuid)
                VALUES (
                  ${minutesSessionId},
                  ${entry.studentUuid},
                  ${entry.examUuid},
                  ${entry.examRoomName ?? null},
                  ${entry.note},
                  ${new Date(Number(entry.timestamp))},
                  ${entry.extraTime ?? null},
                  ${entry.eventUuid}
                )
                ON CONFLICT (minutes_session_id, event_uuid) DO NOTHING`
          )
          break
        default:
          logger.warn('Unknown minutes entry type', { type: entry.type })
      }
    }
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return _.isPlainObject(value)
}
