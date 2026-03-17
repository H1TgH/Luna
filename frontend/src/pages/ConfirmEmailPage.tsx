import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'

const STARS = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: Math.random() * 1.8 + 0.4,
  opacity: Math.random() * 0.45 + 0.08,
}))

function Background() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(88,70,180,0.22) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(99,80,220,0.14) 0%, transparent 65%)',
      }} />
      {STARS.map((s) => (
        <div key={s.id} style={{
          position: 'absolute', top: s.top + '%', left: s.left + '%',
          width: s.size + 'px', height: s.size + 'px',
          borderRadius: '50%', background: '#fff', opacity: s.opacity,
        }} />
      ))}
    </div>
  )
}

type Status = 'loading' | 'success' | 'error' | 'no-token'

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'no-token')

  useEffect(() => {
    if (!token) return
    authApi.confirmEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.032)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '40px 36px',
    boxShadow: '0 8px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,127,232,0.06)',
    textAlign: 'center',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#06091a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative',
    }}>
      <Background />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px' }}>
            <svg width="32" height="32" viewBox="0 0 96 96" fill="none">
              <path d="M56 24C42.745 24 32 34.745 32 48C32 61.255 42.745 72 56 72C49.373 72 44 61.255 44 48C44 34.745 49.373 24 56 24Z" fill="#8b7fe8" />
            </svg>
            <span style={{
              fontFamily: "'Cormorant', serif", fontSize: '36px', fontWeight: 300,
              fontStyle: 'italic', color: '#e8ecf8', letterSpacing: '0.06em',
            }}>
              Luna
            </span>
          </div>
        </div>

        <div style={cardStyle}>
          {status === 'loading' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
                  <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
                  <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <p style={{ color: '#9095b8', fontSize: '15px', fontFamily: "'Outfit', sans-serif", margin: 0 }}>
                Подтверждаем почту...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 20px',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 style={{
                margin: '0 0 10px', fontSize: '22px', fontWeight: 600,
                color: '#e8ecf8', fontFamily: "'Outfit', sans-serif",
              }}>
                Почта подтверждена
              </h2>
              <p style={{
                color: 'rgba(107,114,156,0.7)', fontSize: '14px',
                fontFamily: "'Outfit', sans-serif", margin: '0 0 24px', lineHeight: 1.6,
              }}>
                Ваш аккаунт успешно активирован. Теперь вы можете войти.
              </p>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'linear-gradient(135deg, #8b7fe8 0%, #7a6dd8 100%)',
                  color: '#fff', fontSize: '14px', fontWeight: 500,
                  textDecoration: 'none', padding: '12px 28px', borderRadius: '10px',
                  boxShadow: '0 0 20px rgba(139,127,232,0.3)',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Войти в аккаунт
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M7.5 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </>
          )}

          {(status === 'error' || status === 'no-token') && (
            <>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 20px',
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v4M12 16v.5" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="9" stroke="#f87171" strokeWidth="1.5" />
                </svg>
              </div>
              <h2 style={{
                margin: '0 0 10px', fontSize: '22px', fontWeight: 600,
                color: '#e8ecf8', fontFamily: "'Outfit', sans-serif",
              }}>
                {status === 'no-token' ? 'Ссылка недействительна' : 'Ошибка подтверждения'}
              </h2>
              <p style={{
                color: 'rgba(107,114,156,0.7)', fontSize: '14px',
                fontFamily: "'Outfit', sans-serif", margin: '0 0 24px', lineHeight: 1.6,
              }}>
                {status === 'no-token'
                  ? 'Ссылка для подтверждения отсутствует или повреждена.'
                  : 'Ссылка устарела или уже была использована. Попробуйте зарегистрироваться снова.'}
              </p>
              <Link
                to="/register"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'transparent', border: '1px solid rgba(139,147,210,0.25)',
                  color: '#9095b8', fontSize: '14px', fontWeight: 500,
                  textDecoration: 'none', padding: '12px 28px', borderRadius: '10px',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Назад к регистрации
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}