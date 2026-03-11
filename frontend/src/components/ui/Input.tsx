import { forwardRef, useState, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const [focused, setFocused] = useState(false)

    const borderColor = error
      ? focused ? 'rgba(248,113,113,0.7)' : 'rgba(248,113,113,0.5)'
      : focused ? 'rgba(139,127,232,0.55)' : 'rgba(139,147,210,0.18)'

    const boxShadow = focused
      ? error ? '0 0 0 3px rgba(248,113,113,0.12)' : '0 0 0 3px rgba(139,127,232,0.12)'
      : 'none'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label htmlFor={inputId} style={{
            fontSize: '12px', fontWeight: 500,
            color: '#6b729c', textTransform: 'uppercase',
            letterSpacing: '0.07em', fontFamily: "'Outfit', sans-serif",
          }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          style={{
            height: '44px', width: '100%', borderRadius: '10px',
            padding: '0 16px', fontSize: '15px', fontFamily: "'Outfit', sans-serif",
            background: 'rgba(17,22,54,0.6)',
            border: `1px solid ${borderColor}`,
            boxShadow,
            color: '#e8ecf8',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
          {...props}
        />
        {error && (
          <p style={{
            fontSize: '12.5px', color: '#f87171',
            fontFamily: "'Outfit', sans-serif",
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="6" cy="6" r="5.5" stroke="#f87171" strokeWidth="1"/>
              <path d="M6 3.5v3M6 8v.5" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p style={{ fontSize: '12px', color: 'rgba(107,114,156,0.55)', fontFamily: "'Outfit', sans-serif" }}>
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input