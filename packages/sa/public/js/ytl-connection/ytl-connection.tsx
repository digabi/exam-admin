import React, { useEffect, useRef, useState } from 'react'
import i18next from 'i18next'
import { YtlConnectionsList, YtlConnectionInfo } from './ytl-connections-list'
import { useLanguage } from '../page-banner/page-banner'

const t = (key: string) => i18next.t(`sa.ytl_connection.${key}`)

interface PinResponse {
  pin: string
}

export const YtlConnection = () => {
  useLanguage()
  const [pin, setPin] = useState<PinResponse | null>(null)
  const [connections, setConnections] = useState<YtlConnectionInfo[]>([])
  const [requestInFlight, setRequestInFlight] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchExistingPin = async () => {
    const res = await fetch('/kurko-api/ytl-connection/current-pin')

    if (res.ok) {
      const data = (await res.json()) as PinResponse | null

      if (data) {
        setPin(data)
      }
    }
  }

  const fetchConnections = async () => {
    const res = await fetch('/kurko-api/ytl-connection/active-connections')

    if (res.ok) {
      const data = (await res.json()) as YtlConnectionInfo[]
      setConnections(prev => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data))
    }
  }

  useEffect(() => {
    void fetchExistingPin()
    void fetchConnections()
  }, [])

  useEffect(() => {
    if (pin) {
      pollIntervalRef.current = setInterval(() => {
        void fetchConnections()
      }, 5000)
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [pin])

  const createPin = async () => {
    if (requestInFlight) {
      return
    }

    setRequestInFlight(true)
    try {
      const res = await fetch('/kurko-api/ytl-connection/create-pin', { method: 'POST' })

      if (res.ok) {
        setPin((await res.json()) as PinResponse)
      }
    } finally {
      setRequestInFlight(false)
    }
  }

  return (
    <div id="ytl-connection-content">
      <div className="ktp-pin-section">
        <h2>{t('title')}</h2>
        <p className="ktp-pin-description">{t('description')}</p>

        {pin && (
          <div className="ktp-pin-display">
            <span className="ktp-pin-code">{pin.pin}</span>
          </div>
        )}

        <div>
          <button
            className="ktp-generate-btn ktp-generate-btn-outline"
            onClick={() => void createPin()}
            disabled={requestInFlight}
          >
            {t('generate_pin')}
          </button>
        </div>

        <div className="ktp-instructions">
          <ol>
            <li>{t('instruction_1')}</li>
            <li>{t('instruction_2')}</li>
            <li>{t('instruction_3')}</li>
            <li>{t('instruction_4')}</li>
          </ol>
          <p>{t('instruction_change_pin')}</p>
        </div>
      </div>

      <YtlConnectionsList connections={connections} fetchConnections={fetchConnections} />
    </div>
  )
}
