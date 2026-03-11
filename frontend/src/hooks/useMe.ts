import { useEffect } from 'react'
import { profileApi } from '../api/profile'
import { useAuthStore } from '../store/authStore'
import { useMeStore } from '../store/meStore'

let inflightRequest: Promise<void> | null = null

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!accessToken) {
      inflightRequest = null
      useMeStore.getState().clear()
      return
    }

    const { fetched } = useMeStore.getState()
    if (fetched) return
    if (inflightRequest) return

    inflightRequest = profileApi.getMe()
      .then(({ data }) => {
        useMeStore.getState().setMe(data)
        useMeStore.getState().setFetched(true)
      })
      .catch(() => {
        useMeStore.getState().setMe(null)
        useMeStore.getState().setFetched(true)
      })
      .finally(() => {
        inflightRequest = null
      })
  }, [accessToken])
}