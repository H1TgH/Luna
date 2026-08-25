import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMeStore } from '../store/meStore'
import { useMe } from '../hooks/useMe'
import { useChatSocket } from '../hooks/useChatSocket'
import Header from '../components/layout/Header'
import { chatApi } from '../api/chat'
import type { ChatMessageResponse, ChatResponse } from '../types'
import CreateGroupChatModal from "../components/ui/CreateGroupChatModal";
import GroupChatInfoModal from '../components/ui/GroupChatInfoModal'

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [v, setV] = useState(window.innerWidth < 768)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatSidebarTime(iso: string) {
  const d = new Date(iso), now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (days < 7) return d.toLocaleDateString('ru-RU', { weekday: 'short' })
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatDateSep(iso: string) {
  const d = new Date(iso), now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function isAtBottom(el: HTMLDivElement | null, gap = 80) {
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight <= gap
}

function isSystem(msg: ChatMessageResponse) {
  return msg.type === 'System' || msg.sender === null
}

function avatarUrl(key: string | null | undefined): string | null {
  if (!key) return null
  return key.startsWith('http') ? key : null
}

// ─── Ticks ───────────────────────────────────────────────────────────────────

function Ticks({ read }: { read: boolean }) {
  return (
    <svg
      width={read ? 16 : 10} height="10"
      viewBox={read ? '0 0 16 10' : '0 0 10 10'}
      fill="none" style={{ flexShrink: 0, marginLeft: 2 }}
    >
      <path d="M1 5l2.5 2.5L8 1"
        stroke={read ? '#a99ef0' : 'rgba(144,149,184,0.55)'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {read && (
        <path d="M7 5l2.5 2.5L14 1"
          stroke="#a99ef0"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

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

// ─── System message ───────────────────────────────────────────────────────────

function SystemMessage({ content }: { content: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px', padding: '5px 16px',
        fontSize: '12.5px', color: 'rgba(144,149,184,0.7)',
        fontFamily: "'Outfit', sans-serif", fontStyle: 'italic',
        maxWidth: '75%', textAlign: 'center', lineHeight: 1.5,
      }}>
        {content}
      </div>
    </div>
  )
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      <span style={{ fontSize: '12px', color: 'rgba(107,114,156,0.5)', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.03em' }}>
        {formatDateSep(date)}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isOwn, showAvatar, isGroup, isRead, onEdit, onDeleteForMe, onDeleteForAll }: {
  msg: ChatMessageResponse
  isOwn: boolean
  showAvatar: boolean
  isGroup: boolean
  isRead: boolean
  onEdit: (id: string, content: string) => void
  onDeleteForMe: (id: string) => void
  onDeleteForAll: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(msg.content)
  const [showDel, setShowDel] = useState(false)
  const delRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showDel) return
    const h = (e: MouseEvent) => {
      if (delRef.current && !delRef.current.contains(e.target as Node)) setShowDel(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showDel])

  useEffect(() => {
    if (!editing) setEditText(msg.content)
  }, [msg.content, editing])

  const saveEdit = () => {
    if (!editText.trim()) return
    onEdit(msg.id, editText.trim())
    setEditing(false)
  }

  const senderName = msg.sender
    ? `${msg.sender.first_name} ${msg.sender.last_name}`.trim() || msg.sender.username
    : ''
  const src = avatarUrl(msg.sender?.avatar_key)

  return (
    <div
      style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px', padding: '1px 0' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isOwn && (
        <div style={{ width: 34, flexShrink: 0 }}>
          {showAvatar && <Avatar src={src} name={senderName} size={34} />}
        </div>
      )}

      <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {!isOwn && isGroup && showAvatar && senderName && (
          <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'rgba(169,158,240,0.85)', fontFamily: "'Outfit', sans-serif", marginBottom: '3px', paddingLeft: '4px' }}>
            {senderName}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
          <div style={{
            background: isOwn
              ? 'linear-gradient(135deg, rgba(139,127,232,0.25), rgba(99,80,220,0.16))'
              : 'rgba(255,255,255,0.055)',
            border: isOwn ? '1px solid rgba(139,127,232,0.28)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            padding: '9px 13px',
          }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', minWidth: '220px' }}>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                    if (e.key === 'Escape') { setEditing(false); setEditText(msg.content) }
                  }}
                  autoFocus
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,127,232,0.35)',
                    borderRadius: '8px', padding: '7px 10px', color: '#e0e4f8',
                    fontSize: '14.5px', fontFamily: "'Outfit', sans-serif",
                    resize: 'none', outline: 'none', lineHeight: 1.55, minHeight: '64px',
                  }}
                />
                <div style={{ display: 'flex', gap: '7px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setEditing(false); setEditText(msg.content) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(144,149,184,0.6)', fontSize: '13px', fontFamily: "'Outfit', sans-serif", padding: '4px 8px' }}>
                    Отмена
                  </button>
                  <button onClick={saveEdit} disabled={!editText.trim()}
                    style={{ background: 'rgba(139,127,232,0.2)', border: '1px solid rgba(139,127,232,0.35)', borderRadius: '7px', padding: '4px 12px', cursor: 'pointer', color: '#a99ef0', fontSize: '13px', fontFamily: "'Outfit', sans-serif" }}>
                    Сохранить
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '15px', color: '#e0e4f8', lineHeight: 1.6, fontFamily: "'Outfit', sans-serif", fontWeight: 300, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </p>
            )}

            {!editing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginTop: '4px' }}>
                {msg.is_edited && (
                  <span style={{ fontSize: '11px', color: 'rgba(144,149,184,0.5)', fontFamily: "'Outfit', sans-serif" }}>изм.</span>
                )}
                <span style={{ fontSize: '11px', color: 'rgba(144,149,184,0.6)', fontFamily: "'Outfit', sans-serif" }}>
                  {formatMsgTime(msg.created_at)}
                </span>
                {isOwn && <Ticks read={isRead} />}
              </div>
            )}
          </div>

          {hovered && !editing && (
            <div style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: '3px', alignItems: 'center' }}>
              {isOwn && (
                <button onClick={() => { setEditing(true); setHovered(false) }} title="Редактировать"
                  style={{ ...actionBtnStyle }}>
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <div ref={delRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowDel(p => !p)} title="Удалить"
                  style={{ ...actionBtnStyle, color: 'rgba(248,113,113,0.55)' }}>
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                    <path d="M2 3h8M4.5 3V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 5.5V9M7 5.5V9M2.5 3l.5 7a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {showDel && (
                  <div style={{
                    position: 'absolute', [isOwn ? 'right' : 'left']: 0, bottom: '30px',
                    background: 'rgba(10,14,36,0.99)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', overflow: 'hidden', minWidth: '170px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.55)', zIndex: 50,
                  }}>
                    <DelBtn label="Удалить у меня" onClick={() => { onDeleteForMe(msg.id); setShowDel(false) }} />
                    {isOwn && <DelBtn label="Удалить у всех" onClick={() => { onDeleteForAll(msg.id); setShowDel(false) }} danger />}
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

const actionBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '7px', width: '26px', height: '26px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'rgba(144,149,184,0.6)', padding: 0, flexShrink: 0,
}

function DelBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', width: '100%', padding: '11px 16px', background: h ? (danger ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.04)') : 'none',
        border: 'none', borderTop: danger ? '1px solid rgba(255,255,255,0.06)' : 'none',
        cursor: 'pointer', color: danger ? '#f87171' : '#c8cce8',
        fontSize: '14px', fontFamily: "'Outfit', sans-serif", textAlign: 'left', transition: 'background 0.12s',
      }}>
      {label}
    </button>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <style>{`
        @keyframes lunaTypingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', height: 14 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 4, height: 4, borderRadius: '50%',
            background: 'rgba(169,158,240,0.95)',
            animation: 'lunaTypingDot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
          }} />
        ))}
      </span>
      <span style={{ fontSize: '12px', color: 'rgba(169,158,240,0.85)', fontFamily: "'Outfit', sans-serif" }}>
        Печатает
      </span>
    </div>
  )
}

function OnlineStatus({ isOnline, lastSeen }: { isOnline?: boolean | null; lastSeen?: string | null }) {
  if (isOnline === null && !lastSeen) return null

  if (isOnline) {
    return (
      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(134,239,172,0.75)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 5px rgba(34,197,94,0.6)', flexShrink: 0 }} />
        В сети
      </p>
    )
  }

  if (!lastSeen) {
    return <p style={{ margin: 0, fontSize: '12px', color: 'rgba(144,149,184,0.4)', fontFamily: "'Outfit', sans-serif" }}>Не в сети</p>
  }

  const d = new Date(lastSeen)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  let label = 'давно'
  if (diff < 60) label = 'только что'
  else if (diff < 3600) label = `${Math.floor(diff / 60)} мин. назад`
  else if (diff < 86400) label = `${Math.floor(diff / 3600)} ч. назад`
  else if (diff < 172800) label = 'вчера'
  else label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  return (
    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(144,149,184,0.45)', fontFamily: "'Outfit', sans-serif" }}>
      был(а) {label}
    </p>
  )
}

// ─── Chat list item ───────────────────────────────────────────────────────────

function ChatListItem({ chat, active, onClick, myId }: {
  chat: ChatResponse; active: boolean; onClick: () => void; myId?: string
}) {
  const [hov, setHov] = useState(false)
  const name = chat.name ?? 'Чат'
  const last = chat.last_message
  const src = avatarUrl(chat.avatar_url)
  const preview = last?.content ?? null

  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '13px',
        padding: '12px 16px', width: '100%',
        background: active ? 'rgba(139,127,232,0.12)' : hov ? 'rgba(255,255,255,0.035)' : 'transparent',
        border: 'none',
        borderLeft: `3px solid ${active ? 'rgba(139,127,232,0.65)' : 'transparent'}`,
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.14s',
      }}>
      <div style={{ position: 'relative' }}>
        <Avatar src={src} name={name} size={46} />
        {chat.is_group && (
          <div style={{
            position: 'absolute', bottom: -1, right: -1, width: 17, height: 17, borderRadius: '50%',
            background: 'rgba(139,127,232,0.22)', border: '2px solid #06091a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 7c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2M4.5 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" stroke="rgba(169,158,240,0.9)" strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{
            fontSize: '15px', fontWeight: 500,
            color: active ? '#f0f2ff' : '#d0d4f0',
            fontFamily: "'Outfit', sans-serif",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
          {last && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
              {myId && last.sender?.sender_id === myId && (
                <Ticks read={!chat.is_mark_unread} />
              )}
              <span style={{ fontSize: '12px', color: 'rgba(144,149,184,0.55)', fontFamily: "'Outfit', sans-serif" }}>
                {formatSidebarTime(last.created_at)}
              </span>
              {chat.unread_count > 0 && (
                <div style={{
                  background: active ? 'rgba(169,158,240,0.9)' : '#8b7fe8',
                  borderRadius: '10px', minWidth: '20px', height: '20px', padding: '0 6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11.5px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif",
                }}>
                  {chat.unread_count > 99 ? '99+' : chat.unread_count}
                </div>
              )}
            </div>
          )}
        </div>
        {preview && (
          <p style={{
            fontSize: '13.5px', color: isSystem(last!) ? 'rgba(144,149,184,0.45)' : 'rgba(144,149,184,0.6)',
            fontFamily: "'Outfit', sans-serif", fontWeight: 300,
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontStyle: isSystem(last!) ? 'italic' : 'normal',
          }}>
            {preview}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── Chat window ──────────────────────────────────────────────────────────────

function ChatWindow({ chatId, chat, myId, isMobile }: {
  chatId: string; chat: ChatResponse; myId: string; isMobile: boolean
}) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessageResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [chatInfo, setChatInfo] = useState<{
      name: string | null
      avatar_url: string | null
      is_group: boolean
      username?: string | null
      is_online?: boolean | null
      last_seen?: string | null
      participants_count?: number | null
      online_participants_count?: number | null
    } | null>(null)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [participantsRevision, setParticipantsRevision] = useState(0)
  const [ownLastReadMsgId, setOwnLastReadMsgId] = useState<string | null>(null)
  const [peerLastReadMsgId, setPeerLastReadMsgId] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const [newBelowCount, setNewBelowCount] = useState(0)

  const endRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const moreRef = useRef(false)
  const firstLoad = useRef(true)
  const lastMarkedRef = useRef<string | null>(null)
  const initLoadDoneRef = useRef(false)
  const unreadDividerRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSent = useRef(0)
  const wsSendRef = useRef<(payload: Record<string, unknown>) => boolean>(() => false)

  const headerName = chatInfo?.name ?? chat.name ?? 'Чат'
  const headerAvatar = chatInfo?.avatar_url ?? chat.avatar_url
  const isGroup = chatInfo?.is_group ?? chat.is_group

  const scrollToBottom = useCallback((smooth = true) => {
    endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    setNewBelowCount(0)
  }, [])

  const getMessageIndex = useCallback((messageId: string | null) => {
    if (!messageId) return -1
    return messages.findIndex(m => m.id === messageId)
  }, [messages])

  const isOwnMessageRead = useCallback((messageId: string) => {
    const peerIndex = getMessageIndex(peerLastReadMsgId)
    const msgIndex = getMessageIndex(messageId)
    return peerIndex !== -1 && msgIndex !== -1 && msgIndex <= peerIndex
  }, [getMessageIndex, peerLastReadMsgId])

  const getLatestIncomingMessageId = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (!isSystem(msg) && msg.sender?.sender_id !== myId) return msg.id
    }
    return null
  }, [messages, myId])

  const { send: wsSend } = useChatSocket(chatId, {
    onMessageCreated: (msg) => {
      const nearBottom = isAtBottom(scrollRef.current)
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      if (msg.sender?.sender_id !== myId) {
        setTyping(false)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        if (nearBottom) setTimeout(() => scrollToBottom(), 50)
        else setNewBelowCount(prev => prev + 1)
      } else {
        setTimeout(() => scrollToBottom(), 50)
      }
    },
    onMessageUpdated: (msg) => {
      setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
    },
    onMessageDeleted: (messageId) => {
      setMessages(prev => prev.filter(m => m.id !== messageId))
    },
    onMessageRead: (messageId, readerId) => {
      if (readerId && String(readerId) === String(myId)) {
        setOwnLastReadMsgId(messageId)
        return
      }
      if (readerId && String(readerId) !== String(myId)) {
        setPeerLastReadMsgId(messageId)
      }
    },
    onUserTyping: (userId) => {
      if (String(userId) === String(myId)) return
      setTyping(true)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setTyping(false), 5500)
    },
    onChatRenamed: (name) => {
      setChatInfo(prev => prev ? { ...prev, name } : prev)
    },
    onParticipantAdded: () => {
      setChatInfo(prev => prev ? {
        ...prev,
        participants_count: (prev.participants_count ?? 0) + 1,
      } : prev)
      setParticipantsRevision(v => v + 1)
    },
    onParticipantKicked: (kickedUserId) => {
      if (String(kickedUserId) === String(myId)) {
        navigate('/chats')
        return
      }
      setChatInfo(prev => prev ? {
        ...prev,
        participants_count: Math.max(0, (prev.participants_count ?? 1) - 1),
      } : prev)
      setParticipantsRevision(v => v + 1)
    },
  })
  wsSendRef.current = wsSend

  const load = useCallback(async (append = false, cur?: string | null) => {
    if (append && moreRef.current) return
    if (append) { moreRef.current = true; setLoadingMore(true) }
    else setLoading(true)
    try {
      const { data } = await chatApi.getHistory(chatId, cur ?? undefined)
      setChatInfo({
        name: data.chat.name,
        avatar_url: data.chat.avatar_url,
        is_group: data.chat.is_group,
        username: data.chat.username ?? null,
        is_online: data.chat.is_online ?? null,
        last_seen: data.chat.last_seen ?? null,
        participants_count: data.chat.participants_count ?? null,
        online_participants_count: data.chat.online_participants_count ?? null,
      })
      setOwnLastReadMsgId(data.own_last_read_message_id ?? data.last_read_message_id ?? null)
      setPeerLastReadMsgId(data.peer_last_read_message_id ?? null)
      const rev = [...data.messages].reverse()
      setMessages(prev => append ? [...rev, ...prev] : rev)
      setHasMore(data.has_next)
      setCursor(data.next_cursor ?? null)
    } catch (e) { console.error(e) }
    finally {
      if (append) { moreRef.current = false; setLoadingMore(false) }
      else setLoading(false)
    }
  }, [chatId])

  useEffect(() => {
    if (initLoadDoneRef.current) return
    initLoadDoneRef.current = true
    firstLoad.current = true
    lastMarkedRef.current = null
    setMessages([]); setHasMore(false); setCursor(null); setChatInfo(null); setOwnLastReadMsgId(null); setPeerLastReadMsgId(null); setNewBelowCount(0)
    load(false, null)
  }, [chatId, load])

  useEffect(() => {
    if (!loading && firstLoad.current) {
      firstLoad.current = false
      setTimeout(() => {
        if (unreadDividerRef.current) {
          unreadDividerRef.current.scrollIntoView({ block: 'center' })
        } else {
          scrollToBottom(false)
        }
      }, 50)
    }
  }, [loading, scrollToBottom])

  useEffect(() => {
    const onScroll = () => {
      if (!isAtBottom(scrollRef.current)) return
      const latestIncomingId = getLatestIncomingMessageId()
      if (!latestIncomingId || latestIncomingId === ownLastReadMsgId || latestIncomingId === lastMarkedRef.current) return
      lastMarkedRef.current = latestIncomingId
      wsSendRef.current({ event_type: 'message_read', message_id: latestIncomingId })
      setOwnLastReadMsgId(latestIncomingId)
    }

    const el = scrollRef.current
    if (!el) return
    onScroll()
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [getLatestIncomingMessageId, ownLastReadMsgId])

  // Infinite scroll up
  useEffect(() => {
    if (!topRef.current || !hasMore) return
    const obs = new IntersectionObserver(
      e => { if (e[0].isIntersecting && hasMore && !moreRef.current) load(true, cursor) },
      { threshold: 0.1 }
    )
    obs.observe(topRef.current)
    return () => obs.disconnect()
  }, [hasMore, cursor, load])

  const send = () => {
    const c = text.trim()
    if (!c || sending) return
    setSending(true)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    const ok = wsSend({ event_type: 'new_message', content: c })
    if (!ok) setText(c)
    setSending(false)
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const sy = window.scrollY
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
    window.scrollTo({ top: sy })
    const now = Date.now()
    if (now - lastTypingSent.current > 3000) {
      lastTypingSent.current = now
      wsSend({ event_type: 'typing' })
    }
  }

  const editMsg = (id: string, content: string) => {
    wsSend({ event_type: 'edit_message', message_id: id, content })
  }

  const delForMe = (id: string) => {
    wsSend({ event_type: 'delete_for_me', message_id: id })
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  const delForAll = (id: string) => {
    wsSend({ event_type: 'delete_for_all', message_id: id })
  }

  const rendered = () => {
    const items: React.ReactNode[] = []
    const visible = messages.filter(m => !(m.sender?.sender_id === myId && m.is_deleted))

    let unreadInserted = false

    visible.forEach((msg, i) => {
      const prev = visible[i - 1]
      if (!prev || !sameDay(prev.created_at, msg.created_at)) {
        items.push(<DateSeparator key={`d-${msg.id}`} date={msg.created_at} />)
      }

      // Вставляем разделитель перед первым непрочитанным
      // Непрочитанное = сообщение идёт ПОСЛЕ last_read_message_id и не от нас
      if (
        !unreadInserted &&
        !isSystem(msg) &&
        msg.sender?.sender_id !== myId &&
        ownLastReadMsgId &&
        prev &&
        prev.id === ownLastReadMsgId
      ) {
        unreadInserted = true
        items.push(
          <div key="unread-divider" ref={unreadDividerRef}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(139,127,232,0.35)' }} />
            <span style={{
              fontSize: '11.5px', color: 'rgba(169,158,240,0.7)',
              fontFamily: "'Outfit', sans-serif", letterSpacing: '0.04em',
              background: 'rgba(139,127,232,0.1)', border: '1px solid rgba(139,127,232,0.2)',
              borderRadius: '20px', padding: '3px 12px', whiteSpace: 'nowrap',
            }}>
              Непрочитанные сообщения
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(139,127,232,0.35)' }} />
          </div>
        )
      }

      // Если lastReadMsgId нет совсем — значит все сообщения новые, вставляем в начало
      if (!unreadInserted && !ownLastReadMsgId && !isSystem(msg) && msg.sender?.sender_id !== myId && i === 0) {
        unreadInserted = true
        items.push(
          <div key="unread-divider" ref={unreadDividerRef}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(139,127,232,0.35)' }} />
            <span style={{
              fontSize: '11.5px', color: 'rgba(169,158,240,0.7)',
              fontFamily: "'Outfit', sans-serif", letterSpacing: '0.04em',
              background: 'rgba(139,127,232,0.1)', border: '1px solid rgba(139,127,232,0.2)',
              borderRadius: '20px', padding: '3px 12px', whiteSpace: 'nowrap',
            }}>
              Непрочитанные сообщения
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(139,127,232,0.35)' }} />
          </div>
        )
      }

      if (isSystem(msg)) {
        items.push(<SystemMessage key={msg.id} content={msg.content} />)
        return
      }
      const own = msg.sender?.sender_id === myId
      const next = visible[i + 1]
      const showAv = !next || isSystem(next) || next.sender?.sender_id !== msg.sender?.sender_id || !sameDay(msg.created_at, next.created_at)
      const isRead = own ? isOwnMessageRead(msg.id) : false

      items.push(
        <MessageBubble key={msg.id} msg={msg} isOwn={own} showAvatar={showAv} isGroup={isGroup}
          isRead={isRead} onEdit={editMsg} onDeleteForMe={delForMe} onDeleteForAll={delForAll} />
      )
    })
    return items
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
      {/* Header */}
      <div style={{
        height: '60px', display: 'flex', alignItems: 'center',
        padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.015)', gap: '12px', flexShrink: 0,
      }}>
        {isMobile && (
          <button onClick={() => navigate('/chats')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a99ef0', padding: '4px 8px 4px 0', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {chatInfo?.username && !isGroup ? (
          <Link to={`/${chatInfo.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', flex: 1 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Avatar src={avatarUrl(headerAvatar)} name={headerName} size={40} />
            <div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f0f2ff', fontFamily: "'Outfit', sans-serif" }}>
                {headerName}
              </p>
              {typing ? <TypingIndicator /> : <OnlineStatus isOnline={chatInfo.is_online} lastSeen={chatInfo.last_seen} />}
            </div>
          </Link>
        ) : (
          <>
            {isGroup ? (
              <button
                onClick={() => setShowGroupInfo(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', background: 'none',
                  border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '10px',
                  transition: 'background 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Avatar src={avatarUrl(headerAvatar)} name={headerName} size={40} />
                <div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f0f2ff', fontFamily: "'Outfit', sans-serif" }}>
                    {headerName}
                  </p>
                  {typing ? <TypingIndicator /> : (
                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(144,149,184,0.5)', fontFamily: "'Outfit', sans-serif" }}>
                      {chatInfo?.participants_count != null
                        ? `${chatInfo.participants_count} участн.${chatInfo.online_participants_count ? `, ${chatInfo.online_participants_count} онлайн` : ''}`
                        : 'Беседа'
                      }
                    </p>
                  )}
                </div>
              </button>
            ) : (
              <>
                <Avatar src={avatarUrl(headerAvatar)} name={headerName} size={40} />
                <div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f0f2ff', fontFamily: "'Outfit', sans-serif" }}>
                    {headerName}
                  </p>
                  {typing ? <TypingIndicator /> : <OnlineStatus isOnline={chatInfo?.is_online} lastSeen={chatInfo?.last_seen} />}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={() => {
          if (isAtBottom(scrollRef.current)) setNewBelowCount(0)
        }}
        style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', position: 'relative' }}
      >
        <div ref={topRef} style={{ height: '1px' }} />
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
            <p style={{ color: 'rgba(144,149,184,0.4)', fontSize: '15px', fontFamily: "'Outfit', sans-serif", margin: 0 }}>
              Начните переписку
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: 'auto' }}>
            {rendered()}
          </div>
        )}
        <div ref={endRef} style={{ height: '4px' }} />
        {typing && (
          <div style={{
            alignSelf: 'flex-start', marginTop: 8, marginBottom: 4,
            background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px 16px 16px 16px', padding: '8px 14px',
          }}>
            <TypingIndicator />
          </div>
        )}
        <button
          onClick={() => scrollToBottom()}
          style={{
            position: 'sticky',
            alignSelf: 'flex-end',
            bottom: 12,
            marginTop: 'auto',
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: '1px solid rgba(139,127,232,0.26)',
            background: 'rgba(10,14,36,0.92)',
            color: '#a99ef0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
            zIndex: 2,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {newBelowCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              background: '#8b7fe8',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {newBelowCount > 99 ? '99+' : newBelowCount}
            </span>
          )}
        </button>
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex', gap: '10px', alignItems: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(139,147,210,0.16)',
            borderRadius: '16px', padding: '10px 14px',
            transition: 'border-color 0.2s',
          }}
          ref={el => {
            if (el) {
              el.addEventListener('focusin', () => el.style.borderColor = 'rgba(139,127,232,0.4)')
              el.addEventListener('focusout', () => el.style.borderColor = 'rgba(139,147,210,0.16)')
            }
          }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={onTextChange}
            onKeyDown={onKey}
            placeholder="Написать сообщение..."
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              resize: 'none', color: '#e0e4f8', fontSize: '15px',
              fontFamily: "'Outfit', sans-serif", fontWeight: 300,
              lineHeight: '22px', overflow: 'hidden',
              minHeight: '22px', maxHeight: '160px',
              padding: 0, margin: 0, display: 'block',
              verticalAlign: 'middle',
            }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            style={{
              background: text.trim() && !sending ? 'linear-gradient(135deg, #8b7fe8, #7a6dd8)' : 'rgba(139,127,232,0.12)',
              border: 'none', borderRadius: '12px',
              width: '38px', height: '38px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: text.trim() && !sending ? 'pointer' : 'default',
              transition: 'all 0.2s', alignSelf: 'flex-end',
            }}
          >
            {sending ? <Spinner size={15} /> : (
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L2 2l3.5 6L2 14 14 8z" fill={text.trim() ? '#fff' : 'rgba(139,127,232,0.35)'} />
              </svg>
            )}
          </button>
        </div>
        <p style={{ margin: '5px 0 0', fontSize: '11px', color: 'rgba(144,149,184,0.28)', fontFamily: "'Outfit', sans-serif", paddingLeft: '4px' }}>
          Shift+Enter — перенос строки
        </p>
      </div>
      {showGroupInfo && (
        <GroupChatInfoModal
          chatId={chatId}
          chatName={headerName}
          chatAvatar={headerAvatar ?? null}
          participantsCount={chatInfo?.participants_count ?? null}
          participantsRevision={participantsRevision}
          wsSend={wsSend}
          onClose={() => setShowGroupInfo(false)}
          onChatUpdated={(name, avatarUrl) => {
            setChatInfo(prev => prev ? { ...prev, name, avatar_url: avatarUrl } : prev)
          }}
        />
      )}
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 22 }: { size?: number }) {
  return (
    <svg style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
      <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── No chat ──────────────────────────────────────────────────────────────────

function NoChatSelected() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{
        width: '76px', height: '76px', borderRadius: '50%',
        background: 'rgba(139,127,232,0.07)', border: '1px solid rgba(139,127,232,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="32" height="32" viewBox="0 0 30 30" fill="none">
          <path d="M3 4.5h24a1.5 1.5 0 011.5 1.5v15a1.5 1.5 0 01-1.5 1.5H18l-5.5 5.5V22.5H3a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z"
            stroke="rgba(139,127,232,0.35)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 11h12M9 15.5h7" stroke="rgba(139,127,232,0.22)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '16px', color: 'rgba(208,212,240,0.5)', fontFamily: "'Outfit', sans-serif" }}>
          Выберите чат
        </p>
        <p style={{ margin: '5px 0 0', fontSize: '13.5px', color: 'rgba(144,149,184,0.3)', fontFamily: "'Outfit', sans-serif" }}>
          или начните новую переписку
        </p>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ChatsPage() {
  const { chatId } = useParams<{ chatId?: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  useMe()
  const myProfile = useMeStore(s => s.me)

  const [chats, setChats] = useState<ChatResponse[]>([])
  const [loading, setLoading] = useState(true)
  const fetchedOnceRef = useRef(false)
  const chatsRef = useRef<ChatResponse[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchChats = useCallback(async () => {
    try {
      const { data } = await chatApi.getChats()
      chatsRef.current = data.chats
      setChats(data.chats)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    if (fetchedOnceRef.current) return
    fetchedOnceRef.current = true
    fetchChats().finally(() => setLoading(false))
  }, [fetchChats])

  // Refresh sidebar when opening a new chat not yet in list
  useEffect(() => {
    if (!chatId || chatsRef.current.some(c => c.id === chatId)) return
    fetchChats()
  }, [chatId, fetchChats])

  // Sidebar polling (unread counts)
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) fetchChats() }, 10000)
    return () => clearInterval(t)
  }, [fetchChats])

  const activeChat = chats.find(c => c.id === chatId) ?? null
  const showSidebar = !isMobile || !chatId
  const showChat = !isMobile || !!chatId

  return (
    <div style={{ minHeight: '100vh', background: '#06091a', color: '#e8ecf8' }}>
      <Header />
      <div style={{ display: 'flex', height: 'calc(100vh - 58px)' }}>

        {/* Sidebar */}
        {showSidebar && (
          <div style={{
            width: isMobile ? '100%' : '300px', flexShrink: 0,
            borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column',
            background: 'rgba(255,255,255,0.012)', height: '100%', overflow: 'hidden',
          }}>
            <div style={{
              padding: '0 18px', height: '60px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
            }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#e8ecf8', fontFamily: "'Outfit', sans-serif" }}>
                Сообщения
              </span>
              <button
                onClick={() => setShowCreateModal(true)}
                title="Создать беседу"
                style={{ background: 'none', border: '1px solid rgba(139,147,210,0.16)', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(169,158,240,0.7)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#a99ef0'; e.currentTarget.style.borderColor = 'rgba(139,127,232,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(169,158,240,0.7)'; e.currentTarget.style.borderColor = 'rgba(139,147,210,0.16)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>
              ) : chats.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: 'rgba(144,149,184,0.4)', fontFamily: "'Outfit', sans-serif" }}>Нет переписок</p>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(144,149,184,0.28)', fontFamily: "'Outfit', sans-serif" }}>Зайдите на чью-то страницу и напишите</p>
                </div>
              ) : (
                chats.map(c => (
                  <ChatListItem key={c.id} chat={c} active={c.id === chatId}
                    onClick={() => navigate(`/chats/${c.id}`)} myId={myProfile?.id} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat area */}
        {showChat && (
          <div style={{ flex: 1, display: 'flex', minWidth: 0, height: '100%' }}>
            {chatId && myProfile ? (
              <ChatWindow
                key={chatId} chatId={chatId} myId={myProfile.id} isMobile={isMobile}
                chat={activeChat ?? {
                  id: chatId, name: null, avatar_url: null,
                  is_group: false, is_mark_unread: true,
                  last_message: null, unread_count: 0, created_at: '',
                }}
              />
            ) : (
              <NoChatSelected />
            )}
          </div>
        )}
        {showCreateModal && (
          <CreateGroupChatModal
            onClose={() => setShowCreateModal(false)}
            onCreated={(chatId) => {
              setShowCreateModal(false);
              fetchChats();
              navigate(`/chats/${chatId}`);
            }}
          />
        )}
      </div>
    </div>
  )
}