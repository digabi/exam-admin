import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HeldExamMinutesTable } from './held-exam-minutes-table'
import { filterMinutesRows } from './held-exam-minutes-utils'
import { MinutesApiResponse } from './types'

interface Props {
  defaultExamUuid: string
  minutes: MinutesApiResponse
}

export const HeldExamMinutes = ({ defaultExamUuid, minutes }: Props) => {
  const { t } = useTranslation()
  const [selectedExamFilter, setSelectedExamFilter] = useState<string | null>(null)
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string | null>(null)

  useEffect(() => {
    setSelectedExamFilter(defaultExamUuid)
    setSelectedRoomFilter(null)
  }, [defaultExamUuid, minutes])

  const filteredRows = useMemo(
    () => filterMinutesRows(minutes.notes, selectedExamFilter, selectedRoomFilter),
    [minutes.notes, selectedExamFilter, selectedRoomFilter]
  )

  if (minutes.notes.length === 0) {
    return <div>{t('sa.minutes.no_minutes')}</div>
  }

  return (
    <HeldExamMinutesTable
      rows={filteredRows}
      examFilters={minutes.exams}
      roomFilters={minutes.examRooms}
      selectedExamFilter={selectedExamFilter}
      selectedRoomFilter={selectedRoomFilter}
      onExamFilterChange={setSelectedExamFilter}
      onRoomFilterChange={setSelectedRoomFilter}
    />
  )
}
