import { useEffect, useMemo, useState } from 'react'
import { chatApi } from '../../api/chat'
import type { ChatMessageResponse, ChatResponse } from '../../types'

function avatarUrl(key: string | null | undefined): string | null {
  if (!key) return null
  return key.startsWith('http') ? key : null
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(139,127,232,0.3), rgba(99,80,220,0.14))',
      border: '1.5px solid rgba(139,127,232,0.22)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.38, fontWeight: 600, color: 'rgba(169,158,240,0.9)', fontFamily: "'Outfit', sans-serif" }}>
            {name?.[0]?.toUpperCase() ?? '?'}
          </span>}
    </div>
  )
}

type Props = {
  messages: ChatMessageResponse[]
  currentChatId: string
  onClose: () => void
  /** Выбрали чат — открываем его с pending forward (как в Telegram). */
  onPickChat: (targetChatId: string) => void
}

export default function ForwardModal({ messages, currentChatId, onClose, onPickChat }: Props) {
  const [chats, setChats] = useState<ChatResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    chatApi.getChats(undefined, 50)
      .then(({ data }) => { if (!cancelled) setChats(data.chats) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chats
    return chats.filter(c => (c.name ?? '').toLowerCase().includes(q))
  }, [chats, query])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(4,6,18,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, maxHeight: 'min(640px, 90vh)',
          background: 'rgba(12,16,36,0.98)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        }}
      >
        <div style={{
          padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#f0f2ff', fontFamily: "'Outfit', sans-serif" }}>
              Переслать
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'rgba(144,149,184,0.55)', fontFamily: "'Outfit', sans-serif" }}>
              {messages.length} сообщ. · выберите чат
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(144,149,184,0.7)',
            fontSize: 22, lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        <div style={{ padding: '12px 14px 8px' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск чата..."
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '10px 12px', color: '#e0e4f8',
              fontSize: 14.5, fontFamily: "'Outfit', sans-serif", outline: 'none',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'rgba(144,149,184,0.45)', fontFamily: "'Outfit', sans-serif", fontSize: 14, padding: 24 }}>
              Загрузка...
            </p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(144,149,184,0.45)', fontFamily: "'Outfit', sans-serif", fontSize: 14, padding: 24 }}>
              Чаты не найдены
            </p>
          ) : filtered.map(chat => {
            const isCurrent = chat.id === currentChatId
            return (
              <button
                key={chat.id}
                onClick={() => onPickChat(chat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '10px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'transparent',
                  textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,127,232,0.14)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Avatar src={avatarUrl(chat.avatar_url)} name={chat.name ?? 'Чат'} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{
                    margin: 0, fontSize: 15, fontWeight: 500, color: '#e8ecf8',
                    fontFamily: "'Outfit', sans-serif",
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {chat.name ?? 'Чат'}
                    {isCurrent && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'rgba(169,158,240,0.75)', fontWeight: 400 }}>
                        текущий
                      </span>
                    )}
                  </p>
                  {chat.last_message && (
                    <p style={{
                      margin: '2px 0 0', fontSize: 12.5, color: 'rgba(144,149,184,0.5)',
                      fontFamily: "'Outfit', sans-serif",
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {chat.last_message.content}
                    </p>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
                  <path d="M6 3l5 5-5 5" stroke="#a99ef0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
