import React from 'react'
import { PulseLoader } from 'react-spinners'

export const LoadingSpinner = ({ loading }: { loading: boolean }) => (
  <div style={{ top: '35%', left: '45%', position: 'absolute', zIndex: 10 }}>
    <PulseLoader className="loader" loading={loading} size={20} />
  </div>
)
