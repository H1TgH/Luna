interface LoadingSpinnerProps {
  size?: number
  label?: string
}

export default function LoadingSpinner({ size = 28, label }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Загрузка'}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}
    >
      <svg
        style={{ animation: 'spin 0.9s linear infinite' }}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.18" />
        <path d="M4 12a8 8 0 018-8" stroke="#a99ef0" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {label && (
        <span style={{
          fontSize: '13px',
          color: 'rgba(169,158,240,0.65)',
          fontFamily: "'Outfit', sans-serif",
          letterSpacing: '0.04em',
        }}>
          {label}
        </span>
      )}
    </div>
  )
}
