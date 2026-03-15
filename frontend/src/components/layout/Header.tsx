import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useMeStore } from '../../store/meStore'
import { useMe } from '../../hooks/useMe'
import { searchApi } from '../../api/search'
import type { ProfileResponse } from '../../types'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function SearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProfileResponse[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query.trim(), 280)

  const doSearch = useCallback(async (q: string) => {
    if (!q) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const { data } = await searchApi.profiles(q, 8)
      setResults(data)
      setOpen(true)
      setActiveIndex(-1)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    doSearch(debouncedQuery)
  }, [debouncedQuery, doSearch])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter without selection → go to full search page
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) {
        navigate(`/${results[activeIndex].username}`)
        setOpen(false)
        setQuery('')
        inputRef.current?.blur()
      } else if (query.trim()) {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`)
        setOpen(false)
        setQuery('')
        inputRef.current?.blur()
      }
      return
    }
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleSelect = (username: string) => {
    navigate(`/${username}`)
    setOpen(false)
    setQuery('')
  }

  const goToSearch = () => {
    navigate(`/search${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)
    setOpen(false)
    setQuery('')
  }

  const showDropdown = open && focused && (results.length > 0 || loading || (debouncedQuery && !loading))

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '260px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: focused ? 'rgba(17,22,54,0.85)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'rgba(139,127,232,0.45)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '10px', padding: '0 8px 0 12px',
        height: '36px',
        transition: 'all 0.2s',
        boxShadow: focused ? '0 0 0 3px rgba(139,127,232,0.1)' : 'none',
      }}>
        {loading ? (
          <svg style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none">
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
            <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ flexShrink: 0, color: focused ? '#8b7fe8' : 'rgba(107,114,156,0.5)', transition: 'color 0.2s' }}>
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setFocused(true)
            if (results.length > 0) setOpen(true)
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Поиск людей..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#e8ecf8', fontSize: '13.5px',
            fontFamily: "'Outfit', sans-serif",
          }}
        />
        {query && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus() }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(107,114,156,0.45)', padding: '0', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'color 0.2s',
              width: '20px', height: '20px', lineHeight: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#6b729c')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(107,114,156,0.45)')}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'rgba(12,16,40,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '12px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden', zIndex: 200,
        }}>
          {results.length === 0 && debouncedQuery && !loading ? (
            <div style={{
              padding: '14px 16px',
              textAlign: 'center',
              color: 'rgba(107,114,156,0.5)',
              fontSize: '13px',
              fontFamily: "'Outfit', sans-serif",
            }}>
              Ничего не найдено
            </div>
          ) : (
            results.map((profile, i) => (
              <button
                key={profile.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(profile.username)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '10px 14px',
                  background: i === activeIndex ? 'rgba(139,127,232,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,127,232,0.08)'; setActiveIndex(i) }}
                onMouseLeave={(e) => { e.currentTarget.style.background = i === activeIndex ? 'rgba(139,127,232,0.1)' : 'transparent' }}
              >
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(139,127,232,0.3), rgba(99,80,220,0.15))',
                  border: '1.5px solid rgba(139,127,232,0.2)',
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(139,127,232,0.75)', fontFamily: "'Outfit', sans-serif" }}>
                      {profile.first_name[0]}
                    </span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '13.5px', fontWeight: 500, color: '#d4d8ef',
                    fontFamily: "'Outfit', sans-serif",
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {profile.first_name} {profile.last_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(107,114,156,0.6)', fontFamily: "'Outfit', sans-serif" }}>
                    @{profile.username}
                  </div>
                </div>
              </button>
            ))
          )}

          {/* Footer: link to full search */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={goToSearch}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', padding: '10px 14px',
              background: 'transparent',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              border: 'none',
              borderTopWidth: '1px',
              borderTopStyle: 'solid',
              borderTopColor: 'rgba(255,255,255,0.06)',
              cursor: 'pointer',
              color: 'rgba(139,127,232,0.55)',
              fontSize: '12.5px',
              fontFamily: "'Outfit', sans-serif",
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#a99ef0'; e.currentTarget.style.background = 'rgba(139,127,232,0.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(139,127,232,0.55)'; e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
              <path d="M9 9l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Расширенный поиск
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M4 2l4 3.5L4 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const navigate = useNavigate()
  const clearTokens = useAuthStore((s) => s.clearTokens)
  const clearMe = useMeStore((s) => s.clear)
  useMe()
  const me = useMeStore((s) => s.me)

  const handleLogout = () => {
    clearTokens()
    clearMe()
    navigate('/login')
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(6,9,26,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: '900px', margin: '0 auto',
        padding: '0 24px', height: '58px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px',
      }}>
        <Link
          to={me ? `/${me.username}` : '/'}
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}
        >
          <svg width="26" height="26" viewBox="0 0 96 96" fill="none">
            <path
              d="M56 24C42.745 24 32 34.745 32 48C32 61.255 42.745 72 56 72C49.373 72 44 61.255 44 48C44 34.745 49.373 24 56 24Z"
              fill="#8b7fe8"
            />
          </svg>
          <span style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '20px', fontWeight: 700,
            color: '#e8ecf8', letterSpacing: '0.04em', lineHeight: 1,
          }}>
            Luna
          </span>
        </Link>

        <SearchBar />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {me && (
            <Link
              to={`/${me.username}`}
              style={{
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '5px 10px', borderRadius: '10px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(139,127,232,0.35), rgba(99,80,220,0.18))',
                border: '1.5px solid rgba(139,127,232,0.22)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {me.avatar_url ? (
                  <img src={me.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(139,127,232,0.8)', fontFamily: "'Outfit', sans-serif" }}>
                    {me.first_name[0]}
                  </span>
                )}
              </div>
              <span style={{ 
                fontSize: '13.5px', color: '#9095b8', fontFamily: "'Outfit', sans-serif", fontWeight: 400,
                maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {me.username}
              </span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: '1px solid rgba(139,147,210,0.16)',
              borderRadius: '8px', padding: '7px 13px', cursor: 'pointer',
              color: '#6b729c', fontSize: '13px', fontFamily: "'Outfit', sans-serif",
              fontWeight: 400, transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.28)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b729c'; e.currentTarget.style.borderColor = 'rgba(139,147,210,0.16)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M9.5 9.5L12 7l-2.5-2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Выйти
          </button>
        </div>
      </div>
    </header>
  )
}