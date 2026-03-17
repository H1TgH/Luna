import { Link } from 'react-router-dom'

export default function ConfirmEmailPendingPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#06091a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.032)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', padding: '40px 36px',
        maxWidth: '420px', width: '100%', textAlign: 'center',
        boxShadow: '0 8px 80px rgba(0,0,0,0.5)',
      }}>
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
          margin: '0 0 10px', fontSize: '22px', fontWeight: 600,
          color: '#e8ecf8', fontFamily: "'Outfit', sans-serif",
        }}>
          Подтвердите почту
        </h2>
        <p style={{
          color: 'rgba(107,114,156,0.7)', fontSize: '14px',
          fontFamily: "'Outfit', sans-serif", margin: '0 0 24px', lineHeight: 1.6,
        }}>
          Мы отправили письмо с ссылкой на вашу почту. Перейдите по ней, чтобы получить доступ к Luna.
        </p>
        <Link
          to="/login"
          style={{
            color: 'rgba(139,127,232,0.6)', fontSize: '13.5px',
            fontFamily: "'Outfit', sans-serif", textDecoration: 'none',
          }}
        >
          Войти с другого аккаунта
        </Link>
      </div>
    </div>
  )
}