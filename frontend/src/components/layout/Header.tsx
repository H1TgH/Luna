import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useMeStore } from '../../store/meStore'
import { useMe } from '../../hooks/useMe'

export default function Header() {
  const navigate = useNavigate()
  const clearTokens = useAuthStore((s) => s.clearTokens)
  const clearMe = useMeStore((s) => s.clear)
  useMe()
  const me = useMeStore((s) => s.me)

  const handleLogout = () => {
    clearTokens()
    clearMe()
    navigate('/login')
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(6,9,26,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: '680px', margin: '0 auto',
        padding: '0 24px', height: '58px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link
          to={me ? `/${me.username}` : '/'}
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px' }}
        >
          <svg width="26" height="26" viewBox="0 0 96 96" fill="none">
            <path
              d="M56 24C42.745 24 32 34.745 32 48C32 61.255 42.745 72 56 72C49.373 72 44 61.255 44 48C44 34.745 49.373 24 56 24Z"
              fill="#8b7fe8"
            />
          </svg>
          <span style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '20px',
            fontWeight: 700,
            color: '#e8ecf8',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}>
            Luna
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {me && (
            <Link
              to={`/${me.username}`}
              style={{
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '5px 10px', borderRadius: '10px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(139,127,232,0.35), rgba(99,80,220,0.18))',
                border: '1.5px solid rgba(139,127,232,0.22)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {me.avatar_url ? (
                  <img src={me.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(139,127,232,0.8)', fontFamily: "'Outfit', sans-serif" }}>
                    {me.first_name[0]}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: '13.5px', color: '#9095b8',
                fontFamily: "'Outfit', sans-serif", fontWeight: 400,
              }}>
                {me.username}
              </span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: '1px solid rgba(139,147,210,0.16)',
              borderRadius: '8px', padding: '7px 13px', cursor: 'pointer',
              color: '#6b729c', fontSize: '13px', fontFamily: "'Outfit', sans-serif",
              fontWeight: 400, transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f87171'
              e.currentTarget.style.borderColor = 'rgba(248,113,113,0.28)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b729c'
              e.currentTarget.style.borderColor = 'rgba(139,147,210,0.16)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M9.5 9.5L12 7l-2.5-2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Выйти
          </button>
        </div>
      </div>
    </header>
  )
}