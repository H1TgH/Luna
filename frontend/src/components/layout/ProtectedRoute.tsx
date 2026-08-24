import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useMeStore } from '../../store/meStore'
import { authApi } from '../../api/auth'
import { profileApi } from '../../api/profile'
import LoadingSpinner from '../ui/LoadingSpinner'

async function verifySession(): Promise<boolean> {
  const { setAuthenticated, clearAuth } = useAuthStore.getState()

  const tryLoadProfile = async () => {
    const { data } = await profileApi.getMe()
    useMeStore.getState().setMe(data)
    useMeStore.getState().setFetched(true)
    setAuthenticated(true)
  }

  try {
    await tryLoadProfile()
    return true
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status !== 401) {
      clearAuth()
      return false
    }
  }

  try {
    await authApi.refresh()
    await tryLoadProfile()
    return true
  } catch {
    clearAuth()
    return false
  }
}

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [checking, setChecking] = useState(!isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      setChecking(false)
      return
    }

    let cancelled = false
    verifySession().finally(() => {
      if (!cancelled) setChecking(false)
    })

    return () => { cancelled = true }
  }, [isAuthenticated])

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(88,70,180,0.12) 0%, #06091a 55%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <LoadingSpinner label="Проверяем сессию..." />
      </div>
    )
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
