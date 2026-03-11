import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, style, disabled, ...props }, ref) => {
    const base: React.CSSProperties = {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", fontWeight: 500,
      borderRadius: '10px', border: 'none', cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease', userSelect: 'none',
      opacity: disabled || loading ? 0.5 : 1,
      letterSpacing: '0.01em',
      gap: size === 'sm' ? '6px' : '8px',
      ...(size === 'sm'
        ? { height: '36px', padding: '0 16px', fontSize: '13px' }
        : { height: '44px', padding: '0 24px', fontSize: '15px' }),
    }

    const variants: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, #8b7fe8 0%, #7a6dd8 100%)',
        color: '#fff',
        boxShadow: '0 0 20px rgba(139,127,232,0.3)',
      },
      ghost: {
        background: 'transparent',
        color: '#6b729c',
        border: '1px solid rgba(139,147,210,0.18)',
      },
      danger: {
        background: 'rgba(248,113,113,0.1)',
        color: '#f87171',
        border: '1px solid rgba(248,113,113,0.2)',
      },
    }

    return (
      <button
        ref={ref}
        style={{ ...base, ...variants[variant], ...style }}
        disabled={disabled || loading}
        onMouseEnter={(e) => {
          if (disabled || loading) return
          if (variant === 'primary') {
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.background = 'linear-gradient(135deg, #9e93f0 0%, #8b7fe8 100%)'
          }
          if (variant === 'ghost') e.currentTarget.style.color = '#a99ef0'
        }}
        onMouseLeave={(e) => {
          if (disabled || loading) return
          if (variant === 'primary') {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(139,127,232,0.3)'
            e.currentTarget.style.background = 'linear-gradient(135deg, #8b7fe8 0%, #7a6dd8 100%)'
          }
          if (variant === 'ghost') e.currentTarget.style.color = '#6b729c'
        }}
        onMouseDown={(e) => {
          if (!disabled && !loading) e.currentTarget.style.transform = 'scale(0.98)'
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Загрузка...
          </>
        ) : children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button