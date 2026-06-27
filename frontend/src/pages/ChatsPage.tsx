import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useMeStore } from '../store/meStore'
import { useMe } from '../hooks/useMe'
import Header from '../components/layout/Header'
import { chatApi } from '../api/chat'
import type { ChatMessageResponse, ChatResponse } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMsgTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatSidebarTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (diffDays < 7) return d.toLocaleDateString('ru-RU', { weekday: 'short' })
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatDateSeparator(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function isSystem(msg: ChatMessageResponse) {
  return msg.type === 'System' || msg.sender === null
}

function getAvatarUrl(key: string | null | undefined): string | null {
  if (!key) return null
  if (key.startsWith('http')) return key
  return null
}

function Ticks({ double }: { double: boolean }) {
  const c = double ? '#a99ef0' : 'rgba(107,114,156,0.45)'
  return (
    <svg width="15" height="9" viewBox="0 0 15 9" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 4.5l2.5 2.5 4-6" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 4.5l2.5 2.5 4-6" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity={double ? 1 : 0} />
    </svg>
  )
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  src, name, size = 36,
}: { src?: string | null; name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(139,127,232,0.28), rgba(99,80,220,0.12))',
      border: '1.5px solid rgba(139,127,232,0.2)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.38, fontWeight: 600, color: 'rgba(139,127,232,0.8)', fontFamily: "'Outfit', sans-serif" }}>
          {name?.[0]?.toUpperCase() ?? '?'}
        </span>
      }
    </div>
  )
}

// ─── System message ───────────────────────────────────────────────────────────

function SystemMessage({ content }: { content: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', padding: '4px 0',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px', padding: '5px 14px',
        fontSize: '12px', color: 'rgba(107,114,156,0.6)',
        fontFamily: "'Outfit', sans-serif", fontStyle: 'italic',
        maxWidth: '70%', textAlign: 'center', lineHeight: 1.5,
      }}>
        {content}
      </div>
    </div>
  )
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0',
    }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
      <span style={{
        fontSize: '11px', color: 'rgba(107,114,156,0.4)',
        fontFamily: "'Outfit', sans-serif", letterSpacing: '0.04em',
      }}>
        {formatDateSeparator(date)}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
  showAvatar,
  isGroup,
  isLastOwn,
  isRead,
  onEdited,
  onDeleteForMe,
  onDeleteForAll,
}: {
  msg: ChatMessageResponse
  isOwn: boolean
  showAvatar: boolean
  isGroup: boolean
  isLastOwn: boolean
  isRead: boolean
  onEdited: (updated: ChatMessageResponse) => void
  onDeleteForMe: (id: string) => void
  onDeleteForAll: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(msg.content)
  const [saving, setSaving] = useState(false)
  const [showDelMenu, setShowDelMenu] = useState(false)
  const delMenuRef = useRef<HTMLDivElement>(null)
 
  useEffect(() => {
    if (!showDelMenu) return
    const handler = (e: MouseEvent) => {
      if (delMenuRef.current && !delMenuRef.current.contains(e.target as Node)) setShowDelMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDelMenu])
 
  const handleSaveEdit = async () => {
    if (!editText.trim() || saving) return
    setSaving(true)
    try {
      await chatApi.editMessage(msg.id, editText.trim())
      onEdited({ ...msg, content: editText.trim(), is_edited: true })
      setEditing(false)
    } catch { } finally { setSaving(false) }
  }
 
  const senderName = msg.sender
    ? `${msg.sender.first_name} ${msg.sender.last_name}`.trim() || msg.sender.username
    : ''
  const avatarSrc = msg.sender?.avatar_key?.startsWith('http') ? msg.sender.avatar_key : null
 
  return (
    <div
      style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px', padding: '2px 0' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isOwn && (
        <div style={{ width: 32, flexShrink: 0 }}>
          {showAvatar && <Avatar src={avatarSrc} name={senderName} size={32} />}
        </div>
      )}
 
      <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {!isOwn && isGroup && showAvatar && senderName && (
          <span style={{ fontSize: '11.5px', fontWeight: 500, color: 'rgba(139,127,232,0.7)', fontFamily: "'Outfit', sans-serif", marginBottom: '2px', paddingLeft: '2px' }}>
            {senderName}
          </span>
        )}
 
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
          {/* Bubble */}
          <div style={{
            background: isOwn
              ? 'linear-gradient(135deg, rgba(139,127,232,0.22), rgba(99,80,220,0.14))'
              : 'rgba(255,255,255,0.04)',
            border: isOwn ? '1px solid rgba(139,127,232,0.25)' : '1px solid rgba(255,255,255,0.07)',
            borderRadius: isOwn ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
            padding: '8px 12px',
          }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
                    if (e.key === 'Escape') { setEditing(false); setEditText(msg.content) }
                  }}
                  autoFocus
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,127,232,0.3)',
                    borderRadius: '8px', padding: '6px 8px', color: '#d4d8ef',
                    fontSize: '14px', fontFamily: "'Outfit', sans-serif",
                    resize: 'none', outline: 'none', lineHeight: 1.5, minHeight: '60px',
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setEditing(false); setEditText(msg.content) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(107,114,156,0.5)', fontSize: '12px', fontFamily: "'Outfit', sans-serif", padding: '4px 8px' }}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving || !editText.trim()}
                    style={{
                      background: 'rgba(139,127,232,0.2)', border: '1px solid rgba(139,127,232,0.3)',
                      borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
                      color: '#a99ef0', fontSize: '12px', fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {saving ? '...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#d4d8ef', lineHeight: 1.55, fontFamily: "'Outfit', sans-serif", fontWeight: 300, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </p>
            )}
 
            {!editing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginTop: '4px' }}>
                {msg.is_edited && (
                  <span style={{ fontSize: '10px', color: 'rgba(107,114,156,0.4)', fontFamily: "'Outfit', sans-serif" }}>изм.</span>
                )}
                <span style={{ fontSize: '10.5px', color: 'rgba(107,114,156,0.45)', fontFamily: "'Outfit', sans-serif" }}>
                  {formatMsgTime(msg.created_at)}
                </span>
                {isOwn && isLastOwn && <Ticks double={isRead} />}
              </div>
            )}
          </div>
 
          {/* Hover actions */}
          {hovered && !editing && (
            <div style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: '2px', alignItems: 'center' }}>
              {isOwn && (
                <button
                  onClick={() => { setEditing(true); setHovered(false) }}
                  title="Редактировать"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(107,114,156,0.55)', padding: 0, flexShrink: 0 }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <div ref={delMenuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowDelMenu(p => !p)}
                  title="Удалить"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(248,113,113,0.5)', padding: 0, flexShrink: 0 }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 3h8M4.5 3V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 5.5V9M7 5.5V9M2.5 3l.5 7a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {showDelMenu && (
                  <div style={{
                    position: 'absolute', [isOwn ? 'right' : 'left']: 0, bottom: '30px',
                    background: 'rgba(12,16,40,0.99)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '10px', overflow: 'hidden', minWidth: '160px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 50,
                  }}>
                    <button
                      onClick={() => { onDeleteForMe(msg.id); setShowDelMenu(false) }}
                      style={{ display: 'flex', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#9095b8', fontSize: '13px', fontFamily: "'Outfit', sans-serif", textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      Удалить у меня
                    </button>
                    {isOwn && (
                      <button
                        onClick={() => { onDeleteForAll(msg.id); setShowDelMenu(false) }}
                        style={{ display: 'flex', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '13px', fontFamily: "'Outfit', sans-serif", textAlign: 'left', transition: 'background 0.15s', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        Удалить у всех
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


function ActionBtn({ children, title, disabled }: { children: React.ReactNode; title: string; disabled?: boolean }) {
  return (
    <button
      title={title + (disabled ? ' (скоро)' : '')}
      disabled={disabled}
      style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '6px', width: '24px', height: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'rgba(107,114,156,0.3)' : 'rgba(107,114,156,0.55)',
        transition: 'all 0.15s', padding: 0, flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ─── Chat sidebar item ────────────────────────────────────────────────────────

function ChatListItem({
  chat, active, onClick, myId
}: { chat: ChatResponse; active: boolean; onClick: () => void; myId?: string }) {
  const [hovered, setHovered] = useState(false)
  const displayName = chat.name ?? 'Чат'
  const lastMsg = chat.last_message
  const avatarSrc = getAvatarUrl(chat.avatar_url)

  const preview = lastMsg ? lastMsg.content : null

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 16px', width: '100%',
        background: active
          ? 'rgba(139,127,232,0.1)'
          : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: 'none',
        borderLeft: active ? '2px solid rgba(139,127,232,0.6)' : '2px solid transparent',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
      }}
    >
      <div style={{ position: 'relative' }}>
        <Avatar src={avatarSrc} name={displayName} size={44} />
        {chat.is_group && (
          <div style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 16, height: 16, borderRadius: '50%',
            background: 'rgba(139,127,232,0.2)',
            border: '2px solid #06091a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 6c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2M4 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" stroke="rgba(139,127,232,0.8)" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
          <span style={{
            fontSize: '14px', fontWeight: 500,
            color: active ? '#e8ecf8' : '#c8cce8',
            fontFamily: "'Outfit', sans-serif",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayName}
          </span>
          {lastMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              {myId && lastMsg.sender?.sender_id === myId && (
                <Ticks double={!chat.is_mark_unread} />
              )}
              <span style={{ fontSize: '11px', color: 'rgba(107,114,156,0.4)', fontFamily: "'Outfit', sans-serif" }}>
                {formatSidebarTime(lastMsg.created_at)}
              </span>
              {chat.unread_count > 0 && (
                <div style={{
                  background: '#8b7fe8', borderRadius: '10px',
                  minWidth: '18px', height: '18px', padding: '0 5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 600, color: '#fff', fontFamily: "'Outfit', sans-serif",
                }}>
                  {chat.unread_count > 99 ? '99+' : chat.unread_count}
                </div>
              )}
            </div>
          )}
        </div>
        {preview && (
          <p style={{
            fontSize: '12.5px', color: 'rgba(107,114,156,0.5)',
            fontFamily: "'Outfit', sans-serif", fontWeight: 300,
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontStyle: isSystem(lastMsg!) ? 'italic' : 'normal',
          }}>
            {preview}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── Chat window ──────────────────────────────────────────────────────────────

function ChatWindow({
  chatId,
  chat,
  myId,
  onChatsUpdate
}: {
  chatId: string
  chat: ChatResponse
  myId: string
  onChatsUpdate: (chats: ChatResponse[]) => void
}) {
  const [messages, setMessages] = useState<ChatMessageResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [chatInfo, setChatInfo] = useState<{ name: string | null; avatar_url: string | null; username: string | null } | null>(null)
  const [lastReadMsgId, setLastReadMsgId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const loadingMoreRef = useRef(false)
  const isFirstLoad = useRef(true)
 
  const headerName = chatInfo?.name ?? chat.name ?? 'Чат'
  const headerAvatar = chatInfo?.avatar_url ?? chat.avatar_url
 
  const loadHistory = useCallback(async (append = false, cur?: string | null) => {
    if (append && loadingMoreRef.current) return
    if (append) { loadingMoreRef.current = true; setLoadingMore(true) }
    else setLoading(true)
 
    try {
      const { data } = await chatApi.getHistory(chatId, cur ?? undefined)
      // Save chat meta from history (has proper name/avatar for personal chats)
      setChatInfo({
        name: data.chat.name ?? null,
        avatar_url: data.chat.avatar_url ?? null,
        username: data.chat.username ?? null
      })
      setLastReadMsgId(data.last_read_message_id ?? null)
      // Messages come newest-first, reverse for display
      const reversed = [...data.messages].reverse()
      setMessages(prev => append ? [...reversed, ...prev] : reversed)
      setHasMore(data.has_next)
      setCursor(data.next_cursor ?? null)
      // Mark last (newest) message as read
      if (data.messages.length > 0) {
        chatApi.markAsRead(chatId, data.messages[0].id).catch(() => {})
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (append) { setLoadingMore(false); loadingMoreRef.current = false }
      else setLoading(false)
    }
  }, [chatId])
 
  useEffect(() => {
    isFirstLoad.current = true
    setMessages([])
    setHasMore(false)
    setCursor(null)
    setChatInfo(null)
    loadHistory(false, null)
  }, [chatId, loadHistory])
 
  // Scroll to bottom on first load
  useEffect(() => {
    if (!loading && isFirstLoad.current) {
      messagesEndRef.current?.scrollIntoView()
      isFirstLoad.current = false
    }
  }, [loading])
 
  // Polling instead of WebSocket
  useEffect(() => {
    const poll = async () => {
      if (document.hidden) return
      try {
        const { data } = await chatApi.getHistory(chatId, undefined, 30)
        const incoming = [...data.messages].reverse()
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id))
          const newMsgs = incoming.filter(m => !ids.has(m.id))
          if (newMsgs.length === 0) return prev
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          return [...prev, ...newMsgs]
        })
        if (data.messages.length > 0) {
          chatApi.markAsRead(chatId, data.messages[0].id).catch(() => {})
        }
      } catch { }
    }
    const interval = setInterval(poll, 4000)
    return () => clearInterval(interval)
  }, [chatId])
 
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return
      chatApi.getChats()
        .then(({ data }) => onChatsUpdate(data.chats))
        .catch(() => {})
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Infinite scroll upward
  useEffect(() => {
    if (!topSentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMoreRef.current) loadHistory(true, cursor)
      },
      { threshold: 0.1 }
    )
    observer.observe(topSentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, cursor, loadHistory])
 
  const handleSend = async () => {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
 
    try {
      const { data } = await chatApi.sendMessage(chatId, content)
      setMessages(prev => [...prev, data])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30)
    } catch {
      setText(content)
    } finally {
      setSending(false)
    }
  }
 
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }
 
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const scrollY = window.scrollY
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
    window.scrollTo({ top: scrollY })
  }
 
  const handleEdited = (updated: ChatMessageResponse) => {
    setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
  }
 
  const handleDeleteForMe = async (id: string) => {
    try {
      await chatApi.deleteForMe(id)
      setMessages(prev => prev.filter(m => m.id !== id))
    } catch { }
  }
 
  const handleDeleteForAll = async (id: string) => {
    try {
      await chatApi.deleteForAll(id)
      setMessages(prev => prev.filter(m => m.id !== id))
    } catch { }
  }
 
  const renderedMessages = () => {
    const items: React.ReactNode[] = []
    // Filter: hide messages deleted by their sender (is_deleted = true means sender deleted for self)
    const visible = messages.filter(msg => !(msg.sender?.sender_id === myId && msg.is_deleted))
    const lastOwnMsgId = [...visible].reverse()
      .find(m => !isSystem(m) && m.sender?.sender_id === myId)?.id ?? null

    visible.forEach((msg, i) => {
      const prev = visible[i - 1]
      if (!prev || !isSameDay(prev.created_at, msg.created_at)) {
        items.push(<DateSeparator key={`date-${msg.id}`} date={msg.created_at} />)
      }
      if (isSystem(msg)) {
        items.push(<SystemMessage key={msg.id} content={msg.content} />)
        return
      }
      const isOwn = msg.sender?.sender_id === myId
      const next = visible[i + 1]
      const showAvatar = !next || isSystem(next)
        || next.sender?.sender_id !== msg.sender?.sender_id
        || !isSameDay(msg.created_at, next.created_at)
 
      items.push(
        <MessageBubble
          key={msg.id}
          msg={msg}
          isOwn={isOwn}
          showAvatar={showAvatar}
          isGroup={chat.is_group}
          isLastOwn={msg.id === lastOwnMsgId}
          isRead={!chat.is_mark_unread}
          onEdited={handleEdited}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForAll={handleDeleteForAll}
        />
      )
    })
    return items
  }
 
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
      {/* Header */}
      <div style={{
        height: '58px', display: 'flex', alignItems: 'center', padding: '0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.015)', gap: '12px', flexShrink: 0,
      }}>
        {chatInfo?.username && !chat.is_group ? (
          <Link to={`/${chatInfo.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Avatar src={getAvatarUrl(headerAvatar)} name={headerName} size={38} />
            <p style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: '#e8ecf8', fontFamily: "'Outfit', sans-serif" }}>
              {headerName}
            </p>
          </Link>
        ) : (
          <>
            <Avatar src={getAvatarUrl(headerAvatar)} name={headerName} size={38} />
            <div>
              <p style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: '#e8ecf8', fontFamily: "'Outfit', sans-serif" }}>
                {headerName}
              </p>
              {chat.is_group && (
                <p style={{ margin: 0, fontSize: '11.5px', color: 'rgba(107,114,156,0.4)', fontFamily: "'Outfit', sans-serif" }}>
                  Беседа
                </p>
              )}
            </div>
          </>
        )}
      </div>
 
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column' }}>
        <div ref={topSentinelRef} style={{ height: '1px' }} />
        {loadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
            <Spinner size={16} />
          </div>
        )}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'rgba(107,114,156,0.3)', fontSize: '13.5px', fontFamily: "'Outfit', sans-serif", margin: 0 }}>
              Начните переписку
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: 'auto' }}>
            {renderedMessages()}
          </div>
        )}
        <div ref={messagesEndRef} style={{ height: '4px' }} />
      </div>
 
      {/* Input — always visible */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)', flexShrink: 0 }}>
        <div
          style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,147,210,0.14)', borderRadius: '14px', padding: '8px 12px', transition: 'border-color 0.2s' }}
          ref={el => {
            if (el) {
              el.addEventListener('focusin', () => el.style.borderColor = 'rgba(139,127,232,0.35)')
              el.addEventListener('focusout', () => el.style.borderColor = 'rgba(139,147,210,0.14)')
            }
          }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение... (Enter для отправки)"
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              resize: 'none', color: '#d4d8ef', fontSize: '14.5px',
              fontFamily: "'Outfit', sans-serif", fontWeight: 300,
              lineHeight: 1.55, overflow: 'hidden', minHeight: '22px', maxHeight: '160px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              background: text.trim() && !sending ? 'linear-gradient(135deg, #8b7fe8 0%, #7a6dd8 100%)' : 'rgba(139,127,232,0.1)',
              border: 'none', borderRadius: '10px', width: '36px', height: '36px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: text.trim() && !sending ? 'pointer' : 'default', transition: 'all 0.2s',
            }}
          >
            {sending ? <Spinner size={14} /> : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L2 2l3.5 6L2 14 14 8z" fill={text.trim() ? '#fff' : 'rgba(139,127,232,0.3)'} />
              </svg>
            )}
          </button>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '10px', color: 'rgba(107,114,156,0.25)', fontFamily: "'Outfit', sans-serif", paddingLeft: '2px' }}>
          Shift+Enter — перенос строки
        </p>
      </div>
    </div>
  )
}


// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 22 }: { size?: number }) {
  return (
    <svg style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
      <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Empty chat state ─────────────────────────────────────────────────────────

function NoChatSelected() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '14px', color: 'rgba(107,114,156,0.35)',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'rgba(139,127,232,0.06)',
        border: '1px solid rgba(139,127,232,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M3 4.5h24a1.5 1.5 0 011.5 1.5v15a1.5 1.5 0 01-1.5 1.5H18l-5.5 5.5V22.5H3a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z"
            stroke="rgba(139,127,232,0.35)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 11h12M9 15.5h7" stroke="rgba(139,127,232,0.25)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '15px', fontFamily: "'Outfit', sans-serif" }}>
          Выберите чат
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '13px', fontFamily: "'Outfit', sans-serif", color: 'rgba(107,114,156,0.25)' }}>
          или начните новую переписку
        </p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatsPage() {
  const { chatId } = useParams<{ chatId?: string }>()
  const navigate = useNavigate()
  useMe()
  const myProfile = useMeStore((s) => s.me)

  const [chats, setChats] = useState<ChatResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarVisible, setSidebarVisible] = useState(true)

  useEffect(() => {
    chatApi.getChats()
      .then(({ data }) => setChats(data.chats))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!chatId || chats.some(c => c.id === chatId)) return
    chatApi.getChats().then(({ data }) => setChats(data.chats)).catch(console.error)
  }, [chatId])

  const activeChat = chats.find(c => c.id === chatId) ?? null

  const headerHeight = 58
  const panelHeight = `calc(100vh - ${headerHeight}px)`

  return (
    <div style={{ minHeight: '100vh', background: '#06091a', color: '#e8ecf8' }}>
      <Header />

      <div style={{ display: 'flex', height: panelHeight }}>
        {/* ── Sidebar ── */}
        <div style={{
          width: '300px', flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(255,255,255,0.01)',
          height: '100%', overflow: 'hidden',
        }}>
          <div style={{
            padding: '0 16px', height: '58px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#e8ecf8', fontFamily: "'Outfit', sans-serif" }}>
              Сообщения
            </span>

            <button
              disabled
              title="Создание бесед — скоро"
              style={{
                background: 'none', border: '1px solid rgba(139,147,210,0.15)',
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'default', color: 'rgba(107,114,156,0.25)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <Spinner />
              </div>
            ) : chats.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(107,114,156,0.35)', fontFamily: "'Outfit', sans-serif" }}>
                  Нет переписок
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'rgba(107,114,156,0.25)', fontFamily: "'Outfit', sans-serif" }}>
                  Зайдите на чью-то страницу и напишите
                </p>
              </div>
            ) : (
              chats.map(chat => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  active={chat.id === chatId}
                  onClick={() => navigate(`/chats/${chat.id}`)}
                  myId={myProfile?.id}
                />
              ))
            )}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', minWidth: 0, height: '100%' }}>
          {chatId && myProfile
            ? (
              <ChatWindow
                key={chatId}
                chatId={chatId}
                chat={activeChat ?? {
                  id: chatId,
                  name: null,
                  avatar_url: null,
                  is_group: false,
                  is_mark_unread: true,
                  last_message: null,
                  unread_count: 0,
                  created_at: '',
                }}
                myId={myProfile.id}
                onChatsUpdate={setChats}
              />
            )
            : <NoChatSelected />
          }
        </div>
      </div>
    </div>
  )
}