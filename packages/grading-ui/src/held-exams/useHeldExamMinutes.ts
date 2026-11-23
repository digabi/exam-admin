import { useEffect, useState } from 'react'
import { getJson } from '../common/utils'
import { MinutesApiResponse } from './types'

type UseHeldExamMinutesResult = {
  minutes: MinutesApiResponse | null
  defaultExamUuid: string
  isLoading: boolean
  hasError: boolean
}

export function useHeldExamMinutes(minutesUrl: string): UseHeldExamMinutesResult {
  const [minutes, setMinutes] = useState<MinutesApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isCancelled = false

    void (async () => {
      setIsLoading(true)
      setHasError(false)
      try {
        const response = await getJson<MinutesApiResponse>(minutesUrl)
        if (!isCancelled) {
          if (response.status >= 400) {
            setHasError(true)
            setMinutes(null)
          } else {
            setMinutes(response.json)
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [minutesUrl])

  return {
    minutes,
    defaultExamUuid: minutes?.exams.find(exam => exam.isDefaultExam)?.examUuid ?? '',
    isLoading,
    hasError
  }
}
