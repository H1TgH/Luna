import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/auth'

export default function ProtectedRoute() {
  const { accessToken, refreshToken, _hasHydrated, setTokens, clearTokens } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!_hasHydrated) return

    if (accessToken) {
      setChecking(false)
      return
    }

    if (refreshToken) {
      authApi.refresh(refreshToken)
        .then(({ data }) => {
          const stored = localStorage.getItem('luna-auth')
          const currentRefresh = stored ? JSON.parse(stored)?.state?.refreshToken : refreshToken
          setTokens(data.token, currentRefresh ?? refreshToken)
        })
        .catch(() => clearTokens())
        .finally(() => setChecking(false))
    } else {
      setChecking(false)
    }
  }, [_hasHydrated, accessToken, refreshToken, setTokens, clearTokens])

  if (!_hasHydrated || checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#06091a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg style={{ animation: 'spin 1s linear infinite' }} width="26" height="26" viewBox="0 0 24 24" fill="none">
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
          <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  return accessToken ? <Outlet /> : <Navigate to="/login" replace />
}