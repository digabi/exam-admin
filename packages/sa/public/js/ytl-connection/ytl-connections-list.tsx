import React, { useState } from 'react'
import i18next from 'i18next'
import { format } from 'date-fns'
import { useLanguage } from '../page-banner/page-banner'

const t = (key: string) => i18next.t(`sa.ytl_connection.${key}`)

export type YtlConnectionInfo = {
  id: number
  name: string
  createdAt: string
}

function formatDateTime(date: string) {
  return format(new Date(date), 'd.M.yyyy HH.mm')
}

export const YtlConnectionsList = ({
  connections,
  fetchConnections
}: {
  connections: YtlConnectionInfo[]
  fetchConnections: () => Promise<void>
}) => {
  useLanguage()
  const [deleteInProgress, setDeleteInProgress] = useState(false)

  async function deleteConnection(id: number) {
    setDeleteInProgress(true)
    try {
      await fetch(`/kurko-api/ytl-connection/active-connections/${id}`, { method: 'DELETE' })
      await fetchConnections()
    } finally {
      setDeleteInProgress(false)
    }
  }

  if (connections.length === 0) {
    return (
      <div className="ktp-connections-section">
        <h2>{t('active_connections')}</h2>
        <p className="ktp-no-connections">{t('no_connections')}</p>
      </div>
    )
  }

  return (
    <div className="ktp-connections-section">
      <h2>{t('active_connections')}</h2>
      <div className="ktp-connections-list">
        <div className="ktp-connections-header">
          <div className="ktp-connection-cell">{t('connected')}</div>
          <div className="ktp-connection-cell-flexible">{t('connected_by')}</div>
        </div>
        {connections.map(connection => (
          <div key={connection.id} className="ktp-connection-row">
            <div className="ktp-connection-cell">{formatDateTime(connection.createdAt)}</div>
            <div className="ktp-connection-cell-flexible">{connection.name}</div>
            <div>
              <button
                onClick={() => void deleteConnection(connection.id)}
                className="ktp-connection-delete-button"
                disabled={deleteInProgress}
              >
                {t('disconnect_connection')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
