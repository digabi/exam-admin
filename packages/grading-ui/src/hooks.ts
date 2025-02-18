import { useContext, useEffect, useState } from 'react'
import axios, { AxiosRequestConfig } from 'axios'
import { ErrorKey, FloatingErrorContext } from './common/floating-error'

export const useAxiosGet = () => {
  const controller = new AbortController()

  const [loadingCount, setLoadingCount] = useState(-1)
  const setCurrentError = useContext(FloatingErrorContext)

  const fetch = async <T>(
    url: string,
    delay: number = 0,
    errorKey: ErrorKey | undefined = 'sa.errors.load_error',
    options: AxiosRequestConfig<any> | undefined = undefined
  ): Promise<T | null> => {
    setLoadingCount(loading => Math.max(loading + 1, 1))
    try {
      const { data } = await axios.get<T>(url, { ...options, signal: controller.signal })
      const delaydData = await new Promise(resolve => setTimeout(() => resolve(data), delay))
      setLoadingCount(loading => loading - 1)
      return delaydData as T | null
    } catch (err) {
      if (!controller.signal.aborted) setCurrentError(errorKey)
      setLoadingCount(loading => loading - 1)
      return null
    }
  }

  useEffect(() => () => controller.abort(), [])

  return [fetch, loadingCount !== 0] as const
}
