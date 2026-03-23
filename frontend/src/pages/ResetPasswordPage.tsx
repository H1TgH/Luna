import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }))

  const passwordError = touched.password && password.length < 8 ? 'Минимум 8 символов' : undefined
  const confirmError = touched.confirm && password !== confirm ? 'Пароли не совпадают' : undefined
  const isValid = password.length >= 8 && password === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ password: true, confirm: true })
    if (!isValid || !token) return
    setIsLoading(true)
    setError(null)
    try {
      await authApi.resetPassword(token, password)
      navigate('/login', { state: { passwordReset: true } })
    } catch {
      setError('Ссылка устарела или уже была использована. Запросите новую.')
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

  if (!token) {
    return (
      <div style={{
        minHeight: '100vh', background: '#06091a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', position: 'relative',
      }}>
        <Background />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
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
            <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 600, color: '#e8ecf8', fontFamily: "'Outfit', sans-serif" }}>
              Ссылка недействительна
            </h2>
            <p style={{ color: 'rgba(107,114,156,0.7)', fontSize: '14px', fontFamily: "'Outfit', sans-serif", margin: '0 0 24px', lineHeight: 1.6 }}>
              Запросите новую ссылку для сброса пароля.
            </p>
            <Link to="/forgot-password" style={{ color: '#8b7fe8', fontSize: '14px', fontFamily: "'Outfit', sans-serif", textDecoration: 'none' }}>
              Запросить снова
            </Link>
          </div>
        </div>
      </div>
    )
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
            Новый пароль
          </p>
        </div>

        <div className="animate-slide-up" style={cardStyle}>
          {error && (
            <div className="animate-fade-in" style={{
              marginBottom: '20px', padding: '13px 16px', borderRadius: '10px',
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              color: '#f87171', fontSize: '14px', fontFamily: "'Outfit', sans-serif",
            }}>
              {error}{' '}
              <Link to="/forgot-password" style={{ color: '#f87171', fontWeight: 500 }}>
                Запросить снова
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Новый пароль"
              type="password"
              placeholder="Минимум 8 символов"
              autoFocus
              value={password}
              error={passwordError}
              onChange={(e) => { setPassword(e.target.value); touch('password') }}
              onBlur={() => touch('password')}
            />
            <Input
              label="Подтверждение пароля"
              type="password"
              placeholder="Повторите пароль"
              value={confirm}
              error={confirmError}
              onChange={(e) => { setConfirm(e.target.value); touch('confirm') }}
              onBlur={() => touch('confirm')}
            />

            <Button type="submit" loading={isLoading} disabled={!isValid} style={{ width: '100%', marginTop: '4px' }}>
              {!isLoading && (
                <>
                  Сохранить пароль
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M3 7.5h9M8.5 4l3.5 3.5L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}