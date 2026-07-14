import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatApi } from '../../api/chat'
import type { ProfileResponse } from '../../types'

// ─── Local helpers ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

function avatarUrl(key: string | null | undefined): string | null {
  if (!key) return null
  return key.startsWith('http') ? key : null
}

function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(139,127,232,0.3), rgba(99,80,220,0.14))',
      border: '1.5px solid rgba(139,127,232,0.22)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.4, fontWeight: 600, color: 'rgba(169,158,240,0.9)', fontFamily: "'Outfit', sans-serif" }}>
            {name?.[0]?.toUpperCase() ?? '?'}
          </span>
      }
    </div>
  )
}

function Spinner({ size = 22 }: { size?: number }) {
  return (
    <svg style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
      <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── ParticipantRow ───────────────────────────────────────────────────────────

function ParticipantRow({ profile, onKick }: { profile: ProfileResponse; onKick: () => void }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '11px',
        padding: '9px 16px', borderRadius: '10px',
        background: hov ? 'rgba(255,255,255,0.035)' : 'transparent',
        transition: 'background 0.14s',
      }}
    >
      <div
        onClick={() => navigate(`/${profile.username}`)}
        style={{ display: 'flex', alignItems: 'center', gap: '11px', flex: 1, cursor: 'pointer', minWidth: 0 }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          overflow: 'hidden', background: 'rgba(139,127,232,0.18)',
          border: '1.5px solid rgba(139,127,232,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(169,158,240,0.9)', fontFamily: "'Outfit', sans-serif" }}>
                {profile.first_name[0]}
              </span>
          }
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '14.5px', fontWeight: 500, color: '#d0d4f0', fontFamily: "'Outfit', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.first_name} {profile.last_name}
          </p>
          <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(144,149,184,0.5)', fontFamily: "'Outfit', sans-serif" }}>
            @{profile.username}
          </p>
        </div>
      </div>
      {hov && (
        <button
          onClick={onKick}
          style={{
            background: 'none', border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: '7px', padding: '4px 10px', cursor: 'pointer',
            color: 'rgba(248,113,113,0.55)', fontSize: '12.5px', fontFamily: "'Outfit', sans-serif", flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.55)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)' }}
        >
          Удалить
        </button>
      )}
    </div>
  )
}

// ─── GroupChatInfoModal ───────────────────────────────────────────────────────

export default function GroupChatInfoModal({ chatId, chatName, chatAvatar, participantsCount, onClose, onChatUpdated }: {
  chatId: string
  chatName: string
  chatAvatar: string | null
  participantsCount: number | null
  onClose: () => void
  onChatUpdated: (name: string, avatarUrl: string | null) => void
}) {
  const [query, setQuery] = useState('')
  const [participants, setParticipants] = useState<ProfileResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(chatName)
  const [savingName, setSavingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarFileRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 280)

  useEffect(() => {
    chatApi.getParticipants(chatId)
      .then(({ data }) => setParticipants(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [chatId])

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setLoading(true)
      chatApi.getParticipants(chatId)
        .then(({ data }) => setParticipants(data))
        .catch(console.error)
        .finally(() => setLoading(false))
      return
    }
    setLoading(true)
    chatApi.searchParticipants(chatId, debouncedQuery)
      .then(({ data }) => setParticipants(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [debouncedQuery, chatId])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSaveName = async () => {
    if (!newName.trim() || savingName) return
    setSavingName(true)
    try {
      await chatApi.updateChatName(chatId, newName.trim())
      onChatUpdated(newName.trim(), chatAvatar)
      setEditingName(false)
    } catch { } finally { setSavingName(false) }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadingAvatar(true)
    try {
      const { data } = await chatApi.updateChatAvatar(chatId, f)
      onChatUpdated(newName, data.avatar_url)
    } catch { } finally { setUploadingAvatar(false) }
  }

  const handleKick = async (userId: string) => {
    try {
      await chatApi.kickUser(chatId, userId)
      setParticipants(prev => prev.filter(p => p.id !== userId))
    } catch { }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(3,5,15,0.82)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(10,14,36,0.99)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '20px', width: '100%', maxWidth: '420px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#f0f2ff', fontFamily: "'Outfit', sans-serif" }}>
            Беседа
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

        {/* Chat info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 24px', flexShrink: 0 }}>
          <div
            onClick={() => !uploadingAvatar && avatarFileRef.current?.click()}
            style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
          >
            <Avatar src={avatarUrl(chatAvatar)} name={chatName} size={52} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              {uploadingAvatar
                ? <Spinner size={16} />
                : <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2v9M5.5 5.5L9 2l3.5 3.5" stroke="#e8ecf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 13v2a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-2" stroke="#e8ecf8" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
              }
            </div>
            <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') { setEditingName(false); setNewName(chatName) }
                  }}
                  autoFocus
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,127,232,0.4)',
                    borderRadius: '8px', padding: '5px 10px', color: '#f0f2ff',
                    fontSize: '16px', fontFamily: "'Outfit', sans-serif", fontWeight: 600, outline: 'none',
                  }}
                />
                <button onClick={handleSaveName} disabled={savingName}
                  style={{ background: 'rgba(139,127,232,0.2)', border: '1px solid rgba(139,127,232,0.35)', borderRadius: '7px', padding: '5px 10px', cursor: 'pointer', color: '#a99ef0', fontSize: '13px', fontFamily: "'Outfit', sans-serif" }}>
                  {savingName ? '...' : 'OK'}
                </button>
                <button onClick={() => { setEditingName(false); setNewName(chatName) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(144,149,184,0.5)', fontSize: '13px', fontFamily: "'Outfit', sans-serif", padding: '5px' }}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#f0f2ff', fontFamily: "'Outfit', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {newName}
                </p>
                <button onClick={() => setEditingName(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(144,149,184,0.35)', padding: '2px', display: 'flex', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#9095b8')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(144,149,184,0.35)')}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(144,149,184,0.5)', fontFamily: "'Outfit', sans-serif" }}>
              {participantsCount != null ? `${participantsCount} участников` : `${participants.length} участников`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ margin: '0 24px 12px', padding: '8px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
          <button disabled title="Скоро"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: 'none', border: '1px solid rgba(139,147,210,0.15)', borderRadius: '9px', padding: '7px 12px', cursor: 'default', color: 'rgba(144,149,184,0.3)', fontSize: '13px', fontFamily: "'Outfit', sans-serif" }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Добавить участника
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 24px 10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,147,210,0.14)', borderRadius: '10px', padding: '0 12px', height: '36px' }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ color: 'rgba(144,149,184,0.4)', flexShrink: 0 }}>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск участников..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e0e4f8', fontSize: '13.5px', fontFamily: "'Outfit', sans-serif" }} />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(144,149,184,0.4)', padding: 0, display: 'flex' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
          {loading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><Spinner size={20} /></div>
            : participants.length === 0
              ? <p style={{ textAlign: 'center', padding: '24px', color: 'rgba(144,149,184,0.35)', fontSize: '14px', fontFamily: "'Outfit', sans-serif", margin: 0 }}>Никого не найдено</p>
              : participants.map(p => <ParticipantRow key={p.id} profile={p} onKick={() => handleKick(p.id)} />)
          }
        </div>
      </div>
    </div>
  )
}