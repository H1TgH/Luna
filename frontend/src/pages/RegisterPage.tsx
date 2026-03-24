import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
}

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
      <div style={{
        position: 'absolute', top: '40%', left: '-8%',
        width: '360px', height: '360px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(120,80,200,0.1) 0%, transparent 65%)',
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

function LunaLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="48" cy="48" r="47" stroke="rgba(139,127,232,0.15)" strokeWidth="1" />
        <circle cx="48" cy="48" r="38" stroke="rgba(139,127,232,0.07)" strokeWidth="1" fill="none" />
        <path
          d="M56 24C42.745 24 32 34.745 32 48C32 61.255 42.745 72 56 72C49.373 72 44 61.255 44 48C44 34.745 49.373 24 56 24Z"
          fill="#8b7fe8"
        />
        <circle cx="72" cy="24" r="2.5" fill="rgba(139,127,232,0.28)" />
        <circle cx="18" cy="68" r="1.8" fill="rgba(139,127,232,0.18)" />
        <circle cx="76" cy="62" r="1.2" fill="rgba(169,158,240,0.22)" />
        <circle cx="24" cy="28" r="1" fill="rgba(169,158,240,0.18)" />
      </svg>
      <span style={{
        fontFamily: "'Cormorant', serif",
        fontSize: '42px', fontWeight: 300, fontStyle: 'italic',
        color: '#e8ecf8', letterSpacing: '0.06em', lineHeight: 1,
      }}>
        Luna
      </span>
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const validate = (): FormErrors => {
    const e: FormErrors = {}
    if (!email) e.email = 'Введите email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Некорректный email'
    if (!password) e.password = 'Введите пароль'
    else if (password.length < 8) e.password = 'Минимум 8 символов'
    if (!confirmPassword) e.confirmPassword = 'Подтвердите пароль'
    else if (password !== confirmPassword) e.confirmPassword = 'Пароли не совпадают'
    return e
  }

  const errors = validate()
  const isValid = Object.keys(errors).length === 0

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setTouched({ email: true, password: true, confirmPassword: true })
    if (!isValid) return

    setIsLoading(true)
    try {
      await authApi.register({ email, password })
      navigate('/confirm-email-pending')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown } } }
      const detail = axiosErr?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : 'Что-то пошло не так. Попробуйте снова.'
      setApiError(msg)
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
          <LunaLogo />
          <p style={{
            color: '#6b729c', fontSize: '15px', fontWeight: 300,
            marginTop: '10px', letterSpacing: '0.03em',
            fontFamily: "'Outfit', sans-serif",
          }}>
            Создайте аккаунт
          </p>
        </div>

        <div className="animate-slide-up" style={cardStyle}>
          {apiError && (
            <div className="animate-fade-in" style={{
              marginBottom: '20px', padding: '13px 16px', borderRadius: '10px',
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              color: '#f87171', fontSize: '14px', fontFamily: "'Outfit', sans-serif",
            }}>
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              value={email}
              error={touched.email ? errors.email : undefined}
              onChange={(e) => { setEmail(e.target.value); touch('email') }}
              onBlur={() => touch('email')}
            />
            <Input
              label="Пароль"
              type="password"
              placeholder="Минимум 8 символов"
              autoComplete="new-password"
              value={password}
              error={touched.password ? errors.password : undefined}
              onChange={(e) => { setPassword(e.target.value); touch('password') }}
              onBlur={() => touch('password')}
            />
            <Input
              label="Подтверждение пароля"
              type="password"
              placeholder="Повторите пароль"
              autoComplete="new-password"
              value={confirmPassword}
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
              onChange={(e) => { setConfirmPassword(e.target.value); touch('confirmPassword') }}
              onBlur={() => touch('confirmPassword')}
            />

            <Button
              type="submit"
              loading={isLoading}
              disabled={!isValid}
              style={{ width: '100%', marginTop: '6px' }}
            >
              {!isLoading && (
                <>
                  Зарегистрироваться
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M3 7.5h9M8.5 4l3.5 3.5L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </Button>

            <p style={{ textAlign: 'center', fontSize: '14px', color: '#4a5070', fontFamily: "'Outfit', sans-serif" }}>
              Уже есть аккаунт?{' '}
              <Link
                to="/login"
                style={{ color: '#8b7fe8', textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#a99ef0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8b7fe8')}
              >
                Войти
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}