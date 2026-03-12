import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeStore } from '../store/meStore'
import { useMe } from '../hooks/useMe'

export default function RootRedirect() {
  const navigate = useNavigate()
  useMe()
  const me = useMeStore((s) => s.me)
  const fetched = useMeStore((s) => s.fetched)

  useEffect(() => {
    if (!fetched) return
    if (me?.username) navigate(`/${me.username}`, { replace: true })
    else navigate('/login', { replace: true })
  }, [fetched, me, navigate])

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