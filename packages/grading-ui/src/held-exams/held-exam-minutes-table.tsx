import React from 'react'
import { useTranslation } from 'react-i18next'
import { MinutesNote } from './types'

export type MinutesFilter = {
  examUuid: string
  examTitle: string
}

const MinutesFilterSelect = ({
  id,
  value,
  placeholder,
  options,
  onChange
}: {
  id: string
  value: string | null
  placeholder: string
  options: { value: string; label: string }[]
  onChange: (value: string | null) => void
}) => (
  <div className="minutes-filter">
    <select id={id} value={value || ''} onChange={e => onChange(e.currentTarget.value || null)}>
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {value ? (
      <button
        type="button"
        className="minutes-filter-icon icon-clear"
        aria-label={placeholder}
        onClick={() => onChange(null)}>
        <i className="fa fa-solid fa-times" />
      </button>
    ) : (
      <span className="minutes-filter-icon icon-down">
        <i className="fa fa-solid fa-chevron-down" />
      </span>
    )}
  </div>
)

export const HeldExamMinutesTable = ({
  rows,
  examFilters,
  roomFilters,
  selectedExamFilter,
  selectedRoomFilter,
  onExamFilterChange,
  onRoomFilterChange
}: {
  rows: MinutesNote[]
  examFilters: MinutesFilter[]
  roomFilters: string[]
  selectedExamFilter: string | null
  selectedRoomFilter: string | null
  onExamFilterChange: (value: string | null) => void
  onRoomFilterChange: (value: string | null) => void
}) => {
  const { t } = useTranslation()
  const toHelsinkiTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString('fi-FI', {
      hour: 'numeric',
      minute: 'numeric',
      timeZone: 'Europe/Helsinki'
    })

  return (
    <div className="minutes-table-wrapper">
      <table className="minutes-table">
        <thead>
          <tr className="minutes-table-header">
            <th>{t('sa.minutes.time')}</th>
            <th>{t('sa.minutes.student_name')}</th>
            <th>
              <div>{t('sa.minutes.exam')}</div>
              <MinutesFilterSelect
                id="minutes-exam-filter"
                value={selectedExamFilter}
                placeholder={t('sa.minutes.filter_all_exams')}
                options={examFilters.map(filter => ({
                  value: filter.examUuid,
                  label: filter.examTitle
                }))}
                onChange={onExamFilterChange}
              />
            </th>
            <th>
              <div>{t('sa.minutes.exam_room_name')}</div>
              <MinutesFilterSelect
                id="minutes-room-filter"
                value={selectedRoomFilter}
                placeholder={t('sa.minutes.filter_all_rooms')}
                options={roomFilters.map(roomName => ({
                  value: roomName,
                  label: roomName
                }))}
                onChange={onRoomFilterChange}
              />
            </th>
            <th>{t('sa.minutes.note')}</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(entry => {
            const { examTitle, examUuid, examRoomName } = entry
            return (
              <tr key={entry.eventUuid} data-testid="minutes-row" data-student-uuid={entry.studentUuid}>
                <td className="note-time">{toHelsinkiTime(entry.timestamp)}</td>
                <td className="note-name">
                  {[entry.lastName, entry.firstNames].filter(Boolean).join(', ') || entry.studentUuid}
                  {entry.studentSsn && <div className="note-student-ssn">{entry.studentSsn}</div>}
                  {entry.schoolName && <div className="note-school-name">{entry.schoolName}</div>}
                </td>
                <td className="note-exam">
                  {examTitle && examUuid ? (
                    <button onClick={() => onExamFilterChange(examUuid)}>{examTitle}</button>
                  ) : (
                    ''
                  )}
                </td>
                <td className="note-room">
                  {examRoomName ? <button onClick={() => onRoomFilterChange(examRoomName)}>{examRoomName}</button> : ''}
                </td>
                <td className="note-text">
                  {entry.note}
                  {(entry?.extraTime || 0) > 0 && <span className="note-extra-time">+ {entry.extraTime} min</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
