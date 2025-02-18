import { useEffect, useState } from 'react'

export function useFetchUser() {
  const [userName, setUserName] = useState<string | undefined>()
  useEffect(() => {
    void fetchUser()
  }, [])
  return userName

  async function fetchUser() {
    const response = await fetch('/kurko-api/user')
    if (response.ok) {
      const userData = (await response.json()) as { userName: string }
      setUserName(userData.userName)
    }
  }
}
