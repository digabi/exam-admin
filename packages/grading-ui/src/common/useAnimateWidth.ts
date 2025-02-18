import { useEffect, useState } from 'react'

export const useAnimatedWidth = (width: number) => {
  const [animate, setAnimate] = useState(false)
  useEffect(() => {
    setTimeout(() => {
      setAnimate(true)
    }, 50)
  }, [])

  const duration = (width / 100) * 0.5
  const randomFactor = 1 + Math.random() * 0.25

  return {
    width: !animate ? 0 : `${width}%`,
    transition: `width ${duration * randomFactor}s ease-out`
  }
}
