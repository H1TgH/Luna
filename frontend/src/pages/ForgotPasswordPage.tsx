import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const emailError = touched && !email
    ? 'Введите email'
    : touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? 'Некорректный email'
    : undefined

  const isValid = !emailError && email.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!isValid) return
    setIsLoading(true)
    setError(null)
    try {
      await authApi.requestPasswordReset(email)
      setSent(true)
    } catch {
      setError('Не удалось отправить письмо. Проверьте email и попробуйте снова.')
    } finally {
      setIsLoading(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.032)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '36px 36px 40px',
    boxShadow: '0 8px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,127,232,0.06)',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#06091a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative',
    }}>
      <Background />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '28px' }}>
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
          <p style={{
            color: '#6b729c', fontSize: '15px', fontWeight: 300,
            marginTop: '10px', fontFamily: "'Outfit', sans-serif",
          }}>
            Восстановление пароля
          </p>
        </div>

        <div className="animate-slide-up" style={cardStyle}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 20px',
                background: 'rgba(139,127,232,0.1)', border: '1px solid rgba(139,127,232,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" stroke="#8b7fe8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 6L12 13L2 6" stroke="#8b7fe8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={{
                margin: '0 0 10px', fontSize: '20px', fontWeight: 600,
                color: '#e8ecf8', fontFamily: "'Outfit', sans-serif",
              }}>
                Письмо отправлено
              </h2>
              <p style={{
                color: 'rgba(107,114,156,0.7)', fontSize: '14px',
                fontFamily: "'Outfit', sans-serif", margin: '0 0 24px', lineHeight: 1.6,
              }}>
                Проверьте почту <span style={{ color: '#a99ef0' }}>{email}</span> — мы отправили ссылку для сброса пароля.
              </p>
              <Link to="/login" style={{
                color: 'rgba(139,127,232,0.6)', fontSize: '13.5px',
                fontFamily: "'Outfit', sans-serif", textDecoration: 'none',
              }}>
                ← Вернуться ко входу
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="animate-fade-in" style={{
                  marginBottom: '20px', padding: '13px 16px', borderRadius: '10px',
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171', fontSize: '14px', fontFamily: "'Outfit', sans-serif",
                }}>
                  {error}
                </div>
              )}

              <p style={{
                color: 'rgba(107,114,156,0.65)', fontSize: '14px',
                fontFamily: "'Outfit', sans-serif", margin: '0 0 20px', lineHeight: 1.6,
              }}>
                Введите email, и мы отправим ссылку для сброса пароля.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  error={emailError}
                  onChange={(e) => { setEmail(e.target.value); setTouched(true) }}
                  onBlur={() => setTouched(true)}
                />

                <Button type="submit" loading={isLoading} disabled={!isValid} style={{ width: '100%' }}>
                  {!isLoading && 'Отправить письмо'}
                </Button>

                <p style={{ textAlign: 'center', fontSize: '14px', color: '#4a5070', fontFamily: "'Outfit', sans-serif" }}>
                  <Link
                    to="/login"
                    style={{ color: '#8b7fe8', textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#a99ef0')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#8b7fe8')}
                  >
                    ← Вернуться ко входу
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}