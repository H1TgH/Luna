import { chatApi } from "@/api/chat"
import { searchApi } from "@/api/search"
import { ProfileResponse } from "@/types"
import { useEffect, useRef, useState } from "react"

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

function CreateGroupChatModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (chatId: string) => void
}) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [selected, setSelected] = useState<ProfileResponse[]>([])
  const [query, setQuery] = useState('')
  const [interlocutors, setInterlocutors] = useState<ProfileResponse[]>([])
  const [globalResults, setGlobalResults] = useState<ProfileResponse[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Load interlocutors on mount
  useEffect(() => {
    searchApi.interlocutors('', 30).then(({ data }) => setInterlocutors(data)).catch(() => {})
  }, [])

  // Search on query change
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setGlobalResults([])
      // Reload interlocutors without filter
      searchApi.interlocutors('', 30).then(({ data }) => setInterlocutors(data)).catch(() => {})
      return
    }
    setSearching(true)
    Promise.all([
      searchApi.interlocutors(debouncedQuery, 15).then(r => r.data),
      searchApi.profiles(debouncedQuery, 15).then(r => r.data),
    ]).then(([inter, global]) => {
      setInterlocutors(inter)
      // Exclude interlocutors from global to avoid duplicates
      const interIds = new Set(inter.map(p => p.id))
      setGlobalResults(global.filter(p => !interIds.has(p.id)))
    }).catch(() => {}).finally(() => setSearching(false))
  }, [debouncedQuery])

  const toggleSelect = (profile: ProfileResponse) => {
    setSelected(prev =>
      prev.some(p => p.id === profile.id)
        ? prev.filter(p => p.id !== profile.id)
        : [...prev, profile]
    )
  }

  const isSelected = (id: string) => selected.some(p => p.id === id)

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatar(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  const handleCreate = async () => {
    if (!name.trim() || selected.length < 1) return
    setCreating(true)
    setError(null)
    try {
      const { data } = await chatApi.createGroup(name.trim(), selected.map(p => p.id), avatar ?? undefined)
      onCreated(data.id)
    } catch {
      setError('Не удалось создать беседу')
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const canCreate = name.trim().length > 0 && selected.length >= 1 && !creating

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(3,5,15,0.82)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(10,14,36,0.99)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '20px', width: '100%', maxWidth: '480px',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#f0f2ff', fontFamily: "'Outfit', sans-serif" }}>
            Новая беседа
          </h2>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(144,149,184,0.5)', padding: '4px', display: 'flex', borderRadius: '6px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9095b8')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(144,149,184,0.5)')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Avatar + Name */}
        <div style={{ padding: '0 24px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                background: avatarPreview ? 'none' : 'rgba(139,127,232,0.12)',
                border: '2px dashed rgba(139,127,232,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,127,232,0.7)')}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,127,232,0.35)')}
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4v12M4 10h12" stroke="rgba(139,127,232,0.6)" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Название беседы"
              style={{
                flex: 1, height: '44px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(139,147,210,0.18)', borderRadius: '11px',
                padding: '0 14px', fontSize: '15px', fontFamily: "'Outfit', sans-serif",
                color: '#e0e4f8', outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,127,232,0.45)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(139,147,210,0.18)')}
            />
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
              {selected.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(139,127,232,0.15)', border: '1px solid rgba(139,127,232,0.28)',
                  borderRadius: '20px', padding: '4px 10px 4px 8px',
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', background: 'rgba(139,127,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(169,158,240,0.9)', fontFamily: "'Outfit', sans-serif" }}>{p.first_name[0]}</span>
                    }
                  </div>
                  <span style={{ fontSize: '13px', color: '#c8cce8', fontFamily: "'Outfit', sans-serif" }}>
                    {p.first_name}
                  </span>
                  <button onClick={() => toggleSelect(p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(144,149,184,0.5)', padding: 0, display: 'flex', lineHeight: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(144,149,184,0.5)')}
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: '0 24px 12px', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,147,210,0.14)',
            borderRadius: '11px', padding: '0 12px', height: '38px',
          }}>
            {searching
              ? <svg style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
                  <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'rgba(144,149,184,0.45)', flexShrink: 0 }}>
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
            }
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Найти участников..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e0e4f8', fontSize: '14px', fontFamily: "'Outfit', sans-serif" }}
            />
          </div>
        </div>

        {/* User lists */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {/* Interlocutors section */}
          {interlocutors.length > 0 && (
            <>
              {(query.trim() || globalResults.length > 0) && (
                <div style={{ padding: '6px 16px 4px', fontSize: '11.5px', color: 'rgba(144,149,184,0.45)', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Собеседники
                </div>
              )}
              {interlocutors.map(p => (
                <UserSelectRow key={p.id} profile={p} selected={isSelected(p.id)} onToggle={() => toggleSelect(p)} />
              ))}
            </>
          )}

          {/* Global search section */}
          {globalResults.length > 0 && (
            <>
              <div style={{ padding: '10px 16px 4px', fontSize: '11.5px', color: 'rgba(144,149,184,0.45)', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Все пользователи
              </div>
              {globalResults.map(p => (
                <UserSelectRow key={p.id} profile={p} selected={isSelected(p.id)} onToggle={() => toggleSelect(p)} />
              ))}
            </>
          )}

          {!searching && query.trim() && interlocutors.length === 0 && globalResults.length === 0 && (
            <p style={{ textAlign: 'center', padding: '24px', color: 'rgba(144,149,184,0.35)', fontSize: '14px', fontFamily: "'Outfit', sans-serif" }}>
              Никого не найдено
            </p>
          )}

          {!query.trim() && interlocutors.length === 0 && (
            <p style={{ textAlign: 'center', padding: '24px', color: 'rgba(144,149,184,0.35)', fontSize: '14px', fontFamily: "'Outfit', sans-serif" }}>
              У вас пока нет собеседников
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          {error && (
            <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#f87171', fontFamily: "'Outfit', sans-serif" }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(144,149,184,0.4)', fontFamily: "'Outfit', sans-serif" }}>
              {selected.length > 0 ? `Выбрано: ${selected.length}` : 'Выберите участников'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onClose}
                style={{ background: 'none', border: '1px solid rgba(139,147,210,0.18)', borderRadius: '9px', padding: '8px 16px', cursor: 'pointer', color: '#6b729c', fontSize: '14px', fontFamily: "'Outfit', sans-serif", transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#9095b8'; e.currentTarget.style.borderColor = 'rgba(139,147,210,0.32)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6b729c'; e.currentTarget.style.borderColor = 'rgba(139,147,210,0.18)' }}
              >
                Отмена
              </button>
              <button onClick={handleCreate} disabled={!canCreate}
                style={{
                  background: canCreate ? 'linear-gradient(135deg, #8b7fe8, #7a6dd8)' : 'rgba(139,127,232,0.12)',
                  border: 'none', borderRadius: '9px', padding: '8px 20px',
                  cursor: canCreate ? 'pointer' : 'default',
                  color: canCreate ? '#fff' : 'rgba(139,127,232,0.35)',
                  fontSize: '14px', fontFamily: "'Outfit', sans-serif", fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s',
                }}
              >
                {creating
                  ? <><svg style={{ animation: 'spin 0.8s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>Создаю...</>
                  : <>Создать</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserSelectRow({ profile, selected, onToggle }: {
  profile: ProfileResponse; selected: boolean; onToggle: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '11px', width: '100%',
        padding: '9px 16px', background: selected ? 'rgba(139,127,232,0.1)' : hov ? 'rgba(255,255,255,0.035)' : 'transparent',
        border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.14s',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: 'rgba(139,127,232,0.18)', border: '1.5px solid rgba(139,127,232,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(169,158,240,0.9)', fontFamily: "'Outfit', sans-serif" }}>{profile.first_name[0]}</span>
          }
        </div>
        {selected && (
          <div style={{
            position: 'absolute', bottom: -1, right: -1, width: 16, height: 16,
            background: '#8b7fe8', borderRadius: '50%', border: '2px solid rgba(10,14,36,0.99)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4l2 2 4-4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '14.5px', fontWeight: 500, color: selected ? '#f0f2ff' : '#d0d4f0', fontFamily: "'Outfit', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile.first_name} {profile.last_name}
        </p>
        <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(144,149,184,0.5)', fontFamily: "'Outfit', sans-serif" }}>
          @{profile.username}
        </p>
      </div>
    </button>
  )
}

export default CreateGroupChatModal