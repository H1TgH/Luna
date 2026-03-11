import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { profileApi } from '../api/profile'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

type Step = 1 | 2

interface AccountData {
  email: string
  password: string
  confirmPassword: string
}

interface ProfileData {
  username: string
  firstName: string
  lastName: string
  birthDate: string
  gender: 'Male' | 'Female' | ''
}

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  username?: string
  firstName?: string
  lastName?: string
  birthDate?: string
  gender?: string
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
        fontSize: '42px',
        fontWeight: 300,
        fontStyle: 'italic',
        color: '#e8ecf8',
        letterSpacing: '0.06em',
        lineHeight: 1,
      }}>
        Luna
      </span>
    </div>
  )
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '32px' }}>
      <div style={{
        flex: 1, textAlign: 'center', paddingBottom: '10px',
        borderBottom: `2px solid ${current === 1 ? '#8b7fe8' : 'rgba(139,127,232,0.2)'}`,
        transition: 'border-color 0.3s ease',
      }}>
        <span style={{
          fontSize: '13px',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: current === 1 ? 500 : 400,
          color: current === 1 ? '#a99ef0' : 'rgba(139,127,232,0.35)',
          letterSpacing: '0.02em',
          transition: 'color 0.3s ease',
        }}>
          Аккаунт
        </span>
      </div>
      <div style={{
        flex: 1, textAlign: 'center', paddingBottom: '10px',
        borderBottom: `2px solid ${current === 2 ? '#8b7fe8' : 'rgba(255,255,255,0.07)'}`,
        transition: 'border-color 0.3s ease',
      }}>
        <span style={{
          fontSize: '13px',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: current === 2 ? 500 : 400,
          color: current === 2 ? '#a99ef0' : 'rgba(255,255,255,0.2)',
          letterSpacing: '0.02em',
          transition: 'color 0.3s ease',
        }}>
          Профиль
        </span>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)

  const [step, setStep] = useState<Step>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [account, setAccount] = useState<AccountData>({ email: '', password: '', confirmPassword: '' })
  const [profile, setProfile] = useState<ProfileData>({ username: '', firstName: '', lastName: '', birthDate: '', gender: '' })

  const validateStep1 = (): FormErrors => {
    const e: FormErrors = {}
    if (!account.email) e.email = 'Введите email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) e.email = 'Некорректный email'
    if (!account.password) e.password = 'Введите пароль'
    else if (account.password.length < 8) e.password = 'Минимум 8 символов'
    if (!account.confirmPassword) e.confirmPassword = 'Подтвердите пароль'
    else if (account.password !== account.confirmPassword) e.confirmPassword = 'Пароли не совпадают'
    return e
  }

  const validateStep2 = (): FormErrors => {
    const e: FormErrors = {}
    if (!profile.username) e.username = 'Введите имя пользователя'
    else if (!/^[a-z0-9_]{3,32}$/.test(profile.username)) e.username = 'Только строчные буквы, цифры и _ (3–32 символа)'
    if (!profile.firstName) e.firstName = 'Обязательное поле'
    if (!profile.lastName) e.lastName = 'Обязательное поле'
    if (!profile.birthDate) e.birthDate = 'Укажите дату рождения'
    else if (new Date(profile.birthDate) > new Date()) e.birthDate = 'Дата не может быть в будущем'
    else if (new Date(profile.birthDate) > new Date()) e.birthDate = 'Дата не может быть в будущем'
    if (!profile.gender) e.gender = 'Выберите пол'
    return e
  }

  // Errors computed live on every render — no stale state
  const step1Errors = validateStep1()
  const step2Errors = validateStep2()
  const step1Valid = Object.keys(step1Errors).length === 0
  const step2Valid = Object.keys(step2Errors).length === 0

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setTouched((p) => ({ ...p, email: true, password: true, confirmPassword: true }))
    if (step1Valid) setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setTouched((p) => ({ ...p, username: true, firstName: true, lastName: true, birthDate: true, gender: true }))
    if (!step2Valid) return

    setIsLoading(true)
    try {
      await authApi.register({ email: account.email, password: account.password })
      const { data: tokens } = await authApi.login({ email: account.email, password: account.password })
      setTokens(tokens.access_token, tokens.refresh_token)
      await profileApi.create({
        username: profile.username,
        first_name: profile.firstName,
        last_name: profile.lastName,
        birth_date: profile.birthDate,
        gender: profile.gender as 'Male' | 'Female',
      })
      navigate(`/${profile.username}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown } } }
      const detail = axiosErr?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : 'Что-то пошло не так. Попробуйте снова.'
      setApiError(msg)
      if (msg.toLowerCase().includes('user already exists') || msg.toLowerCase().includes('email')) setStep(1)
    } finally {
      setIsLoading(false)
    }
  }

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }))

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
      minHeight: '100vh',
      background: '#06091a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
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
            {step === 1 ? 'Создайте аккаунт' : 'Заполните профиль'}
          </p>
        </div>

        <div className="animate-slide-up" style={cardStyle}>
          <StepIndicator current={step} />

          {apiError && (
            <div className="animate-fade-in" style={{
              marginBottom: '20px', padding: '13px 16px', borderRadius: '10px',
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              color: '#f87171', fontSize: '14px', fontFamily: "'Outfit', sans-serif",
            }}>
              {apiError}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleStep1} className="animate-step-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} key="s1">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                value={account.email}
                error={touched.email ? step1Errors.email : undefined}
                onChange={(e) => { setAccount((p) => ({ ...p, email: e.target.value })); touch('email') }}
                onBlur={() => touch('email')}
              />
              <Input
                label="Пароль"
                type="password"
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                value={account.password}
                error={touched.password ? step1Errors.password : undefined}
                onChange={(e) => { setAccount((p) => ({ ...p, password: e.target.value })); touch('password') }}
                onBlur={() => touch('password')}
              />
              <Input
                label="Подтверждение пароля"
                type="password"
                placeholder="Повторите пароль"
                autoComplete="new-password"
                value={account.confirmPassword}
                error={touched.confirmPassword ? step1Errors.confirmPassword : undefined}
                onChange={(e) => { setAccount((p) => ({ ...p, confirmPassword: e.target.value })); touch('confirmPassword') }}
                onBlur={() => touch('confirmPassword')}
              />

              <Button type="submit" disabled={!step1Valid} style={{ width: '100%', marginTop: '6px' }}>
                Продолжить
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M3 7.5h9M8.5 4l3.5 3.5L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
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
          ) : (
            <form onSubmit={handleStep2} className="animate-step-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} key="s2">
              <button
                type="button"
                onClick={() => { setStep(1); setApiError(null) }}
                style={{
                  alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '13px', color: '#4a5070', background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                  marginBottom: '-4px', padding: 0, transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#8b7fe8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#4a5070')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Назад
              </button>

              <Input
                label="Имя пользователя"
                placeholder="your_username"
                autoFocus
                value={profile.username}
                error={touched.username ? step2Errors.username : undefined}
                hint="Только строчные латинские буквы, цифры и _"
                onChange={(e) => { setProfile((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })); touch('username') }}
                onBlur={() => touch('username')}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Имя"
                  placeholder="Иван"
                  value={profile.firstName}
                  error={touched.firstName ? step2Errors.firstName : undefined}
                  onChange={(e) => { setProfile((p) => ({ ...p, firstName: e.target.value })); touch('firstName') }}
                  onBlur={() => touch('firstName')}
                />
                <Input
                  label="Фамилия"
                  placeholder="Иванов"
                  value={profile.lastName}
                  error={touched.lastName ? step2Errors.lastName : undefined}
                  onChange={(e) => { setProfile((p) => ({ ...p, lastName: e.target.value })); touch('lastName') }}
                  onBlur={() => touch('lastName')}
                />
              </div>

              <Input
                label="Дата рождения"
                type="date"
                value={profile.birthDate}
                error={touched.birthDate ? step2Errors.birthDate : undefined}
                onChange={(e) => { setProfile((p) => ({ ...p, birthDate: e.target.value })); touch('birthDate') }}
                onBlur={() => touch('birthDate')}
              />

              <Select
                label="Пол"
                placeholder="Выберите пол"
                value={profile.gender}
                error={touched.gender ? step2Errors.gender : undefined}
                onChange={(e) => { setProfile((p) => ({ ...p, gender: e.target.value as 'Male' | 'Female' })); touch('gender') }}
                options={[
                  { value: 'Male', label: 'Мужской' },
                  { value: 'Female', label: 'Женский' },
                ]}
              />

              <Button type="submit" loading={isLoading} disabled={!step2Valid} style={{ width: '100%', marginTop: '6px' }}>
                {!isLoading && (
                  <>
                    Создать аккаунт
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M3 7.5h9M8.5 4l3.5 3.5L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}