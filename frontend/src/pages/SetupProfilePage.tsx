import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { profileApi } from '../api/profile'
import { useMeStore } from '../store/meStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

interface FormErrors {
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

export default function SetupProfilePage() {
  const navigate = useNavigate()
  const setMe = useMeStore((s) => s.setMe)
  const setFetched = useMeStore((s) => s.setFetched)

  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('')

  const validate = (): FormErrors => {
    const e: FormErrors = {}
    if (!username) e.username = 'Введите имя пользователя'
    else if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) e.username = 'Только буквы, цифры и _ (3–32 символа)'
    if (!firstName) e.firstName = 'Обязательное поле'
    if (!lastName) e.lastName = 'Обязательное поле'
    if (!birthDate) e.birthDate = 'Укажите дату рождения'
    else if (new Date(birthDate) > new Date()) e.birthDate = 'Дата не может быть в будущем'
    if (!gender) e.gender = 'Выберите пол'
    return e
  }

  const errors = validate()
  const isValid = Object.keys(errors).length === 0

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }))

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
    touch('username')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setTouched({ username: true, firstName: true, lastName: true, birthDate: true, gender: true })
    if (!isValid) return

    setIsLoading(true)
    try {
      await profileApi.create({
        username,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        gender: gender as 'Male' | 'Female',
      })
      const { data } = await profileApi.getMe()
      setMe(data)
      setFetched(true)
      navigate(`/${data.username}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown } } }
      const detail = axiosErr?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : 'Не удалось создать профиль. Попробуйте снова.'
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
            Заполните профиль
          </p>
        </div>

        <div className="animate-slide-up" style={cardStyle}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '24px', padding: '10px 14px',
            background: 'rgba(139,127,232,0.07)',
            border: '1px solid rgba(139,127,232,0.15)',
            borderRadius: '10px',
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5.5l2 2L8 3" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{
              margin: 0, fontSize: '13px', color: 'rgba(107,114,156,0.7)',
              fontFamily: "'Outfit', sans-serif", lineHeight: 1.4,
            }}>
              Почта подтверждена. Осталось заполнить профиль.
            </p>
          </div>

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
              label="Имя пользователя"
              placeholder="your_username"
              autoFocus
              value={username}
              error={touched.username ? errors.username : undefined}
              hint="Только латинские буквы, цифры и _"
              onChange={handleUsernameChange}
              onBlur={() => touch('username')}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Имя"
                placeholder="Иван"
                value={firstName}
                error={touched.firstName ? errors.firstName : undefined}
                onChange={(e) => { setFirstName(e.target.value); touch('firstName') }}
                onBlur={() => touch('firstName')}
              />
              <Input
                label="Фамилия"
                placeholder="Иванов"
                value={lastName}
                error={touched.lastName ? errors.lastName : undefined}
                onChange={(e) => { setLastName(e.target.value); touch('lastName') }}
                onBlur={() => touch('lastName')}
              />
            </div>

            <Input
              label="Дата рождения"
              type="date"
              value={birthDate}
              error={touched.birthDate ? errors.birthDate : undefined}
              onChange={(e) => { setBirthDate(e.target.value); touch('birthDate') }}
              onBlur={() => touch('birthDate')}
            />

            <Select
              label="Пол"
              placeholder="Выберите пол"
              value={gender}
              error={touched.gender ? errors.gender : undefined}
              onChange={(e) => { setGender(e.target.value as 'Male' | 'Female'); touch('gender') }}
              options={[
                { value: 'Male', label: 'Мужской' },
                { value: 'Female', label: 'Женский' },
              ]}
            />

            <Button
              type="submit"
              loading={isLoading}
              disabled={!isValid}
              style={{ width: '100%', marginTop: '6px' }}
            >
              {!isLoading && (
                <>
                  Создать профиль
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