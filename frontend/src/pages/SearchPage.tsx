import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { searchApi } from '../api/search'
import type { ProfileResponse } from '../types'
import { useMe } from '../hooks/useMe'
import Header from '../components/layout/Header'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function ProfileCard({ profile }: { profile: ProfileResponse }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => navigate(`/${profile.username}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 18px',
        background: hovered ? 'rgba(139,127,232,0.06)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hovered ? 'rgba(139,127,232,0.2)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '14px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? '0 4px 24px rgba(139,127,232,0.1)' : 'none',
      }}
    >
      <div style={{
        width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(139,127,232,0.28), rgba(99,80,220,0.12))',
        border: `2px solid ${hovered ? 'rgba(139,127,232,0.35)' : 'rgba(139,127,232,0.15)'}`,
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.18s',
      }}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{
            fontSize: '18px', fontWeight: 600,
            color: hovered ? 'rgba(169,158,240,0.9)' : 'rgba(139,127,232,0.65)',
            fontFamily: "'Outfit', sans-serif",
            transition: 'color 0.18s',
          }}>
            {profile.first_name[0]}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '15px', fontWeight: 500,
          color: hovered ? '#e8ecf8' : '#c8cce8',
          fontFamily: "'Outfit', sans-serif",
          transition: 'color 0.18s',
        }}>
          {profile.first_name} {profile.last_name}
        </div>
        <div style={{
          fontSize: '13px',
          color: hovered ? 'rgba(139,127,232,0.7)' : 'rgba(107,114,156,0.55)',
          fontFamily: "'Outfit', sans-serif",
          transition: 'color 0.18s',
          marginTop: '1px',
        }}>
          @{profile.username}
        </div>
        {profile.status && (
          <div style={{
            fontSize: '12.5px', color: 'rgba(107,114,156,0.45)',
            fontFamily: "'Outfit', sans-serif", marginTop: '4px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {profile.status}
          </div>
        )}
      </div>

      <svg
        width="16" height="16" viewBox="0 0 16 16" fill="none"
        style={{
          color: hovered ? 'rgba(139,127,232,0.6)' : 'rgba(107,114,156,0.2)',
          transition: 'color 0.18s, transform 0.18s',
          transform: hovered ? 'translateX(2px)' : 'none',
          flexShrink: 0,
        }}
      >
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '64px 0', gap: '14px',
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: 'rgba(139,127,232,0.06)',
        border: '1px solid rgba(139,127,232,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7.5" stroke="rgba(139,127,232,0.4)" strokeWidth="1.5" />
          <path d="M17 17l4 4" stroke="rgba(139,127,232,0.4)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8.5 11h5M11 8.5v5" stroke="rgba(139,127,232,0.3)" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{
          color: 'rgba(232,236,248,0.55)', fontSize: '15px',
          fontFamily: "'Outfit', sans-serif", fontWeight: 400,
        }}>
          По запросу <span style={{ color: '#a99ef0' }}>«{query}»</span> никого не найдено
        </p>
        <p style={{
          color: 'rgba(107,114,156,0.45)', fontSize: '13px',
          fontFamily: "'Outfit', sans-serif", marginTop: '6px',
        }}>
          Попробуйте другое имя или юзернейм
        </p>
      </div>
    </div>
  )
}

function InitialState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '64px 0', gap: '14px',
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: 'rgba(139,127,232,0.06)',
        border: '1px solid rgba(139,127,232,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7.5" stroke="rgba(139,127,232,0.4)" strokeWidth="1.5" />
          <path d="M17 17l4 4" stroke="rgba(139,127,232,0.4)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p style={{
        color: 'rgba(107,114,156,0.45)', fontSize: '14px',
        fontFamily: "'Outfit', sans-serif",
      }}>
        Введите имя или юзернейм для поиска
      </p>
    </div>
  )
}

const PAGE_SIZE = 20

export default function SearchPage() {
  useMe()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [inputValue, setInputValue] = useState(initialQuery)
  const [results, setResults] = useState<ProfileResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [activeQuery, setActiveQuery] = useState(initialQuery)

  const inputRef = useRef<HTMLInputElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const debouncedQuery = useDebounce(inputValue.trim(), 320)

  const fetchResults = useCallback(async (q: string, off: number, append = false) => {
    if (!q) return
    if (append) {
      if (loadingMoreRef.current) return
      loadingMoreRef.current = true
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const { data } = await searchApi.profiles(q, PAGE_SIZE, off)
      if (append) {
        setResults((prev) => [...prev, ...data])
      } else {
        setResults(data)
      }
      setHasMore(data.length === PAGE_SIZE)
      setOffset(off + data.length)
    } catch {
      if (!append) setResults([])
    } finally {
      if (append) {
        setLoadingMore(false)
        loadingMoreRef.current = false
      } else {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (initialQuery) {
      fetchResults(initialQuery, 0)
    }
  }, [])

  useEffect(() => {
    if (debouncedQuery === activeQuery) return
    setActiveQuery(debouncedQuery)
    setOffset(0)
    setHasMore(false)

    if (debouncedQuery) {
      setSearchParams({ q: debouncedQuery }, { replace: true })
      fetchResults(debouncedQuery, 0)
    } else {
      setSearchParams({}, { replace: true })
      setResults([])
    }
  }, [debouncedQuery, activeQuery, fetchResults, setSearchParams])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMoreRef.current) {
          fetchResults(activeQuery, offset, true)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, offset, activeQuery, fetchResults])

  const showEmpty = !loading && activeQuery && results.length === 0
  const showInitial = !activeQuery && results.length === 0

  return (
    <div style={{ minHeight: '100vh', background: '#06091a', color: '#e8ecf8' }}>
      <Header />

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px 80px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontSize: '24px', fontWeight: 600, color: '#e8ecf8',
            fontFamily: "'Outfit', sans-serif", margin: 0, lineHeight: 1.2,
          }}>
            Поиск людей
          </h1>
          <p style={{
            fontSize: '14px', color: 'rgba(107,114,156,0.5)',
            fontFamily: "'Outfit', sans-serif", marginTop: '6px',
          }}>
            Найдите пользователей по имени или юзернейму
          </p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(17,22,54,0.7)',
          border: '1px solid rgba(139,127,232,0.2)',
          borderRadius: '14px', padding: '0 18px',
          height: '52px', marginBottom: '28px',
          boxShadow: '0 0 0 0px rgba(139,127,232,0)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
          onFocus={() => {}}
          ref={(el) => {
            if (el) {
              el.addEventListener('focusin', () => {
                el.style.borderColor = 'rgba(139,127,232,0.5)'
                el.style.boxShadow = '0 0 0 3px rgba(139,127,232,0.1)'
              })
              el.addEventListener('focusout', () => {
                el.style.borderColor = 'rgba(139,127,232,0.2)'
                el.style.boxShadow = 'none'
              })
            }
          }}
        >
          {loading ? (
            <svg style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} width="18" height="18" viewBox="0 0 24 24" fill="none">
              <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
              <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
              <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: 'rgba(139,127,232,0.5)', flexShrink: 0 }}>
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}

          <input
            ref={inputRef}
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Имя, фамилия или @юзернейм..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#e8ecf8', fontSize: '16px',
              fontFamily: "'Outfit', sans-serif", fontWeight: 300,
            }}
          />

          {inputValue && (
            <button
              onClick={() => {
                setInputValue('')
                setResults([])
                setActiveQuery('')
                setSearchParams({}, { replace: true })
                inputRef.current?.focus()
              }}
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                borderRadius: '6px', width: '26px', height: '26px',
                cursor: 'pointer', color: 'rgba(107,114,156,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s', flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#9095b8' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(107,114,156,0.6)' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {!loading && results.length > 0 && (
          <p style={{
            fontSize: '12.5px', color: 'rgba(107,114,156,0.45)',
            fontFamily: "'Outfit', sans-serif", marginBottom: '14px',
          }}>
            {results.length}{hasMore ? '+' : ''} {results.length === 1 ? 'пользователь' : results.length >= 2 && results.length <= 4 ? 'пользователя' : 'пользователей'}
          </p>
        )}

        {results.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '8px',
          }}>
            {results.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} style={{ height: '1px' }} />

        {loadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <svg style={{ animation: 'spin 0.8s linear infinite' }} width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
              <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {showInitial && <InitialState />}
        {showEmpty && <EmptyState query={activeQuery} />}

        {!loading && !loadingMore && !hasMore && results.length > 0 && (
          <div style={{
            textAlign: 'center', padding: '32px 0 0',
            color: 'rgba(107,114,156,0.3)', fontSize: '13px',
            fontFamily: "'Outfit', sans-serif",
          }}>
            · · ·
          </div>
        )}
      </div>
    </div>
  )
}