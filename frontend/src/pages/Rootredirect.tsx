import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeStore } from '../store/meStore'
import { useMe } from '../hooks/useMe'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function RootRedirect() {
  const navigate = useNavigate()
  useMe()
  const me = useMeStore((s) => s.me)
  const fetched = useMeStore((s) => s.fetched)

  useEffect(() => {
    if (!fetched) return
    if (me?.username) navigate(`/${me.username}`, { replace: true })
    else navigate('/setup-profile', { replace: true })
  }, [fetched, me, navigate])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(88,70,180,0.12) 0%, #06091a 55%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <LoadingSpinner />
    </div>
  )
}