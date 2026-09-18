import { useState, useEffect, useRef, useCallback, type CSSProperties, type ChangeEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useMeStore } from '../store/meStore'
import { useMe } from '../hooks/useMe'
import { useChatSocket } from '../hooks/useChatSocket'
import Header from '../components/layout/Header'
import { chatApi } from '../api/chat'
import type { ChatMessageResponse, ChatResponse, MessageSenderChatResponse } from '../types'
import CreateGroupChatModal from "../components/ui/CreateGroupChatModal";
import GroupChatInfoModal from '../components/ui/GroupChatInfoModal'
import ForwardModal from '../components/chat/ForwardModal'

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

const UUID_RE =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g

function isSystem(msg: ChatMessageResponse) {
  return msg.type === 'System'
}

function avatarUrl(key: string | null | undefined): string | null {
  if (!key) return null
  return key.startsWith('http') ? key : null
}

function profileFullName(p: MessageSenderChatResponse) {
  return `${p.first_name} ${p.last_name}`.trim() || p.username
}

type ProfilesMap = Record<string, MessageSenderChatResponse>

function mergeProfiles(prev: ProfilesMap, list: MessageSenderChatResponse[]): ProfilesMap {
  if (!list.length) return prev
  const next = { ...prev }
  for (const p of list) {
    if (p.sender_id) next[p.sender_id] = p
  }
  return next
}

function getSenderId(msg: ChatMessageResponse): string | null {
  if (msg.sender == null) return null
  if (typeof msg.sender === 'string') return msg.sender
  return msg.sender.sender_id
}

function resolveSender(msg: ChatMessageResponse, profiles: ProfilesMap): MessageSenderChatResponse | null {
  if (msg.sender == null) return null
  if (typeof msg.sender === 'string') return profiles[msg.sender] ?? null
  return msg.sender
}

function contentHasUuid(content: string) {
  return new RegExp(UUID_RE.source).test(content)
}

function chatPreviewText(msg: ChatMessageResponse | null | undefined): string | null {
  if (!msg) return null
  if (isSystem(msg) && contentHasUuid(msg.content)) return 'Событие в беседе'
  return msg.content
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

const NAME_COLORS = [
  '#e17076', '#eda86c', '#a695e7', '#7bc862', '#6ec9cb',
  '#65aadd', '#ee7aae', '#e4ae5d', '#b48bf2', '#5cbfb0',
]

function nameColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return NAME_COLORS[h % NAME_COLORS.length]
}

function Avatar({ src, name, size = 36, to }: {
  src?: string | null; name: string; size?: number; to?: string | null
}) {
  const body = (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(139,127,232,0.3), rgba(99,80,220,0.14))',
      border: '1.5px solid rgba(139,127,232,0.22)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.12s',
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.4, fontWeight: 600, color: 'rgba(169,158,240,0.9)', fontFamily: "'Outfit', sans-serif" }}>
            {name?.[0]?.toUpperCase() ?? '?'}
          </span>
      }
    </div>
  )

  if (!to) return body
  return (
    <Link
      to={to}
      title={name}
      style={{ display: 'block', flexShrink: 0, borderRadius: '50%', lineHeight: 0 }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >
      {body}
    </Link>
  )
}

// ─── System message ───────────────────────────────────────────────────────────

function SystemMessage({ content, profiles }: { content: string; profiles: ProfilesMap }) {
  const nodes: ReactNode[] = []
  const re = new RegExp(UUID_RE.source, 'g')
  let last = 0
  let m: RegExpExecArray | null
  let i = 0

  while ((m = re.exec(content)) !== null) {
    if (m.index > last) nodes.push(content.slice(last, m.index))
    const id = m[0]
    const profile = profiles[id]
    if (profile) {
      nodes.push(
        <Link
          key={`u-${i++}`}
          to={`/${profile.username}`}
          style={{
            color: 'rgba(169,158,240,0.95)',
            textDecoration: 'none',
            fontStyle: 'normal',
            fontWeight: 500,
          }}
          onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
        >
          {profileFullName(profile)}
        </Link>,
      )
    } else {
      nodes.push(<span key={`u-${i++}`}>{id}</span>)
    }
    last = m.index + id.length
  }
  if (last < content.length) nodes.push(content.slice(last))

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px', padding: '5px 16px',
        fontSize: '12.5px', color: 'rgba(144,149,184,0.7)',
        fontFamily: "'Outfit', sans-serif", fontStyle: 'italic',
        maxWidth: '75%', textAlign: 'center', lineHeight: 1.5,
      }}>
        {nodes}
      </div>
    </div>
  )
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
      <span style={{
        fontSize: '12.5px', color: 'rgba(200,206,232,0.75)', fontFamily: "'Outfit', sans-serif",
        background: 'rgba(8,12,28,0.55)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px', padding: '4px 12px', backdropFilter: 'blur(8px)',
      }}>
        {formatDateSep(date)}
      </span>
    </div>
  )
}

function bubbleRadius(isOwn: boolean, isFirst: boolean, isLast: boolean): string {
  const r = 16
  const tip = 4
  if (isOwn) {
    const topRight = isFirst ? r : tip
    const bottomRight = isFirst && isLast ? tip : isLast ? r : tip
    return `${r}px ${topRight}px ${bottomRight}px ${r}px`
  }
  const topLeft = isFirst ? r : tip
  const bottomLeft = isFirst && isLast ? tip : isLast ? r : tip
  return `${topLeft}px ${r}px ${r}px ${bottomLeft}px`
}

function metaSpacerWidth(isOwn: boolean, isEdited: boolean) {
  // время ~34px + «изм.» ~28px + галочки ~16px + зазоры
  return (isEdited ? 30 : 0) + 36 + (isOwn ? 18 : 0) + 6
}

type CtxMenuState = { x: number; y: number; msgId: string } | null

function ContextMenu({
  x, y, isOwn, onClose, onReply, onForward, onSelect, onEdit, onDeleteForMe, onDeleteForAll,
}: {
  x: number; y: number; isOwn: boolean
  onClose: () => void
  onReply: () => void
  onForward: () => void
  onSelect: () => void
  onEdit: () => void
  onDeleteForMe: () => void
  onDeleteForAll: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({
      left: Math.min(x, window.innerWidth - rect.width - 8),
      top: Math.min(y, window.innerHeight - rect.height - 8),
    })
  }, [x, y])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  const items: { label: string; onClick: () => void; danger?: boolean; hide?: boolean }[] = [
    { label: 'Ответить', onClick: onReply },
    { label: 'Переслать', onClick: onForward },
    { label: 'Выбрать', onClick: onSelect },
    { label: 'Изменить', onClick: onEdit, hide: !isOwn },
    { label: 'Удалить у меня', onClick: onDeleteForMe },
    { label: 'Удалить у всех', onClick: onDeleteForAll, danger: true, hide: !isOwn },
  ]

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', left: pos.left, top: pos.top, zIndex: 300,
        minWidth: 188,
        background: 'rgba(14,18,40,0.98)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        padding: '4px 0',
      }}
    >
      {items.filter(i => !i.hide).map((item, idx) => (
        <button
          key={item.label}
          onClick={() => { item.onClick(); onClose() }}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '11px 16px', border: 'none', cursor: 'pointer',
            background: 'transparent',
            color: item.danger ? '#f87171' : '#e0e4f8',
            fontSize: 14.5, fontFamily: "'Outfit', sans-serif",
            borderTop: idx > 0 && item.danger ? '1px solid rgba(255,255,255,0.06)' : undefined,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = item.danger ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.05)'
          }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function QuoteBlock({
  title, text, accent, onClick,
}: {
  title: string; text: string; accent: string; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick?.() }}
      style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
        background: 'rgba(0,0,0,0.14)', border: 'none', borderLeft: `3px solid ${accent}`,
        borderRadius: '0 8px 8px 0', padding: '5px 8px 5px 9px', marginBottom: 5,
      }}
    >
      <span style={{
        display: 'block', fontSize: 12.5, fontWeight: 600, color: accent,
        fontFamily: "'Outfit', sans-serif", marginBottom: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {title}
      </span>
      <span style={{
        display: 'block', fontSize: 13, color: 'rgba(200,206,232,0.72)',
        fontFamily: "'Outfit', sans-serif",
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {text}
      </span>
    </button>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg, sender, parentMsg, forwardedMsg, parentSender, forwardedSender,
  isOwn, showAvatar, showName, isFirst, isLast, isGroup, isRead,
  selected, selectionMode,
  onToggleSelect, onEnterSelect, onReply, onForward, onEdit, onDeleteForMe, onDeleteForAll,
}: {
  msg: ChatMessageResponse
  sender: MessageSenderChatResponse | null
  parentMsg: ChatMessageResponse | null
  forwardedMsg: ChatMessageResponse | null
  parentSender: MessageSenderChatResponse | null
  forwardedSender: MessageSenderChatResponse | null
  isOwn: boolean
  showAvatar: boolean
  showName: boolean
  isFirst: boolean
  isLast: boolean
  isGroup: boolean
  isRead: boolean
  selected: boolean
  selectionMode: boolean
  onToggleSelect: () => void
  onEnterSelect: () => void
  onReply: () => void
  onForward: () => void
  onEdit: (id: string, content: string) => void
  onDeleteForMe: (id: string) => void
  onDeleteForAll: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(msg.content)
  const [menu, setMenu] = useState<CtxMenuState>(null)

  useEffect(() => {
    if (!editing) setEditText(msg.content)
  }, [msg.content, editing])

  const saveEdit = () => {
    if (!editText.trim()) return
    onEdit(msg.id, editText.trim())
    setEditing(false)
  }

  const senderName = sender ? profileFullName(sender) : ''
  const profileTo = sender?.username ? `/${sender.username}` : null
  const src = avatarUrl(sender?.avatar_key)
  const accent = sender ? nameColor(sender.username || sender.sender_id || senderName) : '#a99ef0'
  const fwdAccent = forwardedSender
    ? nameColor(forwardedSender.username || forwardedSender.sender_id || '')
    : accent
  const parentAccent = parentSender
    ? nameColor(parentSender.username || parentSender.sender_id || '')
    : '#a99ef0'

  const openMenu = (e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, msgId: msg.id })
  }

  const onRowClick = (e: ReactMouseEvent) => {
    if (editing) return
    // клик по ссылкам внутри не выбирает
    const t = e.target as HTMLElement
    if (t.closest('a,button,textarea')) return
    if (selectionMode) {
      onToggleSelect()
      return
    }
  }

  const onSideClick = (e: ReactMouseEvent) => {
    e.stopPropagation()
    if (selectionMode) onToggleSelect()
    else onEnterSelect()
  }

  return (
    <div
      onClick={onRowClick}
      onContextMenu={openMenu}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        paddingTop: isFirst ? 6 : 1,
        paddingBottom: isLast ? 2 : 1,
        background: selected ? 'rgba(139,127,232,0.12)' : 'transparent',
        borderRadius: 10,
        margin: '0 -6px',
        paddingLeft: 6,
        paddingRight: 6,
        transition: 'background 0.12s',
        cursor: selectionMode ? 'pointer' : 'default',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {selectionMode && (
        <div style={{
          width: 22, flexShrink: 0, alignSelf: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: selected ? 'none' : '1.5px solid rgba(144,149,184,0.4)',
            background: selected ? '#8b7fe8' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {selected && (
              <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.2 2.2L8 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8,
        minWidth: 0,
      }}>
        {!isOwn && isGroup && (
          <div style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {showAvatar
              ? <Avatar src={src} name={senderName} size={36} to={selectionMode ? null : profileTo} />
              : <div style={{ width: 36, height: 1 }} />
            }
          </div>
        )}

        <div style={{
          maxWidth: isGroup ? '72%' : '78%',
          minWidth: 0,
          flexShrink: 1,
        }}>
          <div style={{
            background: isOwn
              ? 'linear-gradient(160deg, rgba(139,127,232,0.32), rgba(99,80,220,0.18))'
              : 'rgba(255,255,255,0.07)',
            border: isOwn ? '1px solid rgba(139,127,232,0.28)' : '1px solid rgba(255,255,255,0.07)',
            borderRadius: bubbleRadius(isOwn, isFirst, isLast),
            padding: showName || forwardedMsg || msg.forwarded_from ? '7px 10px 5px 11px' : '7px 10px 5px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
            minWidth: 72,
            maxWidth: '100%',
          }}>
            {showName && senderName && !(forwardedMsg || msg.forwarded_from) && (
              profileTo && !selectionMode ? (
                <Link
                  to={profileTo}
                  style={{
                    display: 'block', fontSize: 13.5, fontWeight: 600, color: accent,
                    fontFamily: "'Outfit', sans-serif", textDecoration: 'none', marginBottom: 2,
                    lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {senderName}
                </Link>
              ) : (
                <span style={{
                  display: 'block', fontSize: 13.5, fontWeight: 600, color: accent,
                  fontFamily: "'Outfit', sans-serif", marginBottom: 2, lineHeight: 1.25,
                }}>
                  {senderName}
                </span>
              )
            )}

            {(forwardedMsg || msg.forwarded_from) && (
              <div style={{ marginBottom: 4 }}>
                <span style={{
                  display: 'block', fontSize: 12, fontWeight: 600, color: fwdAccent,
                  fontFamily: "'Outfit', sans-serif", marginBottom: 2, letterSpacing: '0.01em',
                }}>
                  Переслано
                  {forwardedSender ? ` от ${profileFullName(forwardedSender)}` : ''}
                </span>
              </div>
            )}

            {parentMsg && !(forwardedMsg || msg.forwarded_from) && (
              <QuoteBlock
                title={parentSender ? profileFullName(parentSender) : 'Сообщение'}
                text={parentMsg.content}
                accent={parentAccent}
              />
            )}

            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 220 }}>
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
                    borderRadius: 8, padding: '7px 10px', color: '#e0e4f8',
                    fontSize: 14.5, fontFamily: "'Outfit', sans-serif",
                    resize: 'none', outline: 'none', lineHeight: 1.55, minHeight: 64,
                  }}
                />
                <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setEditing(false); setEditText(msg.content) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(144,149,184,0.6)', fontSize: 13, fontFamily: "'Outfit', sans-serif", padding: '4px 8px' }}>
                    Отмена
                  </button>
                  <button onClick={saveEdit} disabled={!editText.trim()}
                    style={{ background: 'rgba(139,127,232,0.2)', border: '1px solid rgba(139,127,232,0.35)', borderRadius: 7, padding: '4px 12px', cursor: 'pointer', color: '#a99ef0', fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
                    Сохранить
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <p style={{
                  fontSize: 15, color: '#e8eaf8', lineHeight: 1.45,
                  fontFamily: "'Outfit', sans-serif", fontWeight: 400, margin: 0,
                  wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: metaSpacerWidth(isOwn, msg.is_edited),
                      height: 1,
                      verticalAlign: 'baseline',
                    }}
                  />
                </p>
                <span style={{
                  position: 'absolute', right: 0, bottom: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  pointerEvents: 'none', userSelect: 'none', lineHeight: 1, paddingTop: 4,
                }}>
                  {msg.is_edited && (
                    <span style={{
                      fontSize: 11,
                      color: isOwn ? 'rgba(200,190,255,0.55)' : 'rgba(144,149,184,0.5)',
                      fontFamily: "'Outfit', sans-serif",
                    }}>
                      изм.
                    </span>
                  )}
                  <span style={{
                    fontSize: 11,
                    color: isOwn ? 'rgba(200,190,255,0.65)' : 'rgba(144,149,184,0.55)',
                    fontFamily: "'Outfit', sans-serif",
                  }}>
                    {formatMsgTime(msg.created_at)}
                  </span>
                  {isOwn && <Ticks read={isRead} />}
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          onClick={onSideClick}
          onContextMenu={openMenu}
          style={{ flex: 1, minWidth: 16, alignSelf: 'stretch', minHeight: 28, cursor: 'pointer' }}
        />
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          isOwn={isOwn}
          onClose={() => setMenu(null)}
          onReply={onReply}
          onForward={onForward}
          onSelect={onEnterSelect}
          onEdit={() => setEditing(true)}
          onDeleteForMe={() => onDeleteForMe(msg.id)}
          onDeleteForAll={() => onDeleteForAll(msg.id)}
        />
      )}
    </div>
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
  const preview = chatPreviewText(last)

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
              {myId && getSenderId(last) === myId && (
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
  const location = useLocation()
  const [messages, setMessages] = useState<ChatMessageResponse[]>([])
  const [profiles, setProfiles] = useState<ProfilesMap>({})
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
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [replyTo, setReplyTo] = useState<ChatMessageResponse | null>(null)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [forwardPickerMsgs, setForwardPickerMsgs] = useState<ChatMessageResponse[]>([])
  const [pendingForward, setPendingForward] = useState<ChatMessageResponse[]>([])

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
      if (!isSystem(msg) && getSenderId(msg) !== myId) return msg.id
    }
    return null
  }, [messages, myId])

  const { send: wsSend } = useChatSocket(chatId, {
    onMessageCreated: (msg) => {
      if (msg.profiles?.length) {
        setProfiles(prev => mergeProfiles(prev, msg.profiles!))
      } else if (msg.sender && typeof msg.sender === 'object' && msg.sender.sender_id) {
        const senderObj = msg.sender
        setProfiles(prev => mergeProfiles(prev, [senderObj]))
      }

      const nearBottom = isAtBottom(scrollRef.current)
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      if (getSenderId(msg) !== myId) {
        setTyping(false)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        if (nearBottom) setTimeout(() => scrollToBottom(), 50)
        else setNewBelowCount(prev => prev + 1)
      } else {
        setTimeout(() => scrollToBottom(), 50)
      }
    },
    onMessageUpdated: (msg) => {
      if (msg.sender && typeof msg.sender === 'object' && msg.sender.sender_id) {
        const senderObj = msg.sender
        setProfiles(prev => mergeProfiles(prev, [senderObj]))
      }
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
      setProfiles(prev => append ? mergeProfiles(prev, data.profiles ?? []) : mergeProfiles({}, data.profiles ?? []))
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
    setMessages([]); setProfiles({}); setHasMore(false); setCursor(null); setChatInfo(null); setOwnLastReadMsgId(null); setPeerLastReadMsgId(null); setNewBelowCount(0)
    setSelectionMode(false); setSelectedIds([]); setReplyTo(null); setForwardOpen(false); setForwardPickerMsgs([]); setPendingForward([])
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

  const exitSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds([])
  }, [])

  useEffect(() => {
    if (!selectionMode) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') exitSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectionMode, exitSelection])

  const messagesById = useCallback((id: string | null | undefined) => {
    if (!id) return null
    return messages.find(m => m.id === id) ?? null
  }, [messages])

  const resolveRefMsg = useCallback((msg: ChatMessageResponse, kind: 'parent' | 'forward') => {
    if (kind === 'parent') {
      return msg.parent_msg ?? messagesById(msg.parent_id) ?? null
    }
    return msg.forwarded_msg ?? messagesById(msg.forwarded_from) ?? null
  }, [messagesById])

  const enterSelect = (msgId: string) => {
    setReplyTo(null)
    setSelectionMode(true)
    setSelectedIds(prev => prev.includes(msgId) ? prev : [...prev, msgId])
  }

  const toggleSelect = (msgId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(msgId)) {
        const next = prev.filter(id => id !== msgId)
        if (next.length === 0) setSelectionMode(false)
        return next
      }
      return [...prev, msgId]
    })
  }

  const selectedMessages = selectedIds
    .map(id => messages.find(m => m.id === id))
    .filter((m): m is ChatMessageResponse => !!m && !isSystem(m))

  const startReply = (msg: ChatMessageResponse) => {
    exitSelection()
    setPendingForward([])
    setReplyTo(msg)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const startForward = (msgs: ChatMessageResponse[]) => {
    const list = msgs.filter(m => !isSystem(m))
    if (!list.length) return
    setForwardPickerMsgs(list)
    setForwardOpen(true)
  }

  const armPendingForward = (msgs: ChatMessageResponse[]) => {
    const ordered = [...msgs]
      .filter(m => !isSystem(m))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (!ordered.length) return
    setReplyTo(null)
    setPendingForward(ordered)
    exitSelection()
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const forwardHere = () => {
    if (!selectedMessages.length) return
    armPendingForward(selectedMessages)
  }

  const pickForwardChat = (targetChatId: string) => {
    const ordered = [...forwardPickerMsgs]
      .filter(m => !isSystem(m))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    setForwardOpen(false)
    setForwardPickerMsgs([])
    exitSelection()
    if (targetChatId === chatId) {
      armPendingForward(ordered)
      return
    }
    navigate(`/chats/${targetChatId}`, { state: { pendingForward: ordered } })
  }

  // Telegram-flow: пришли из другого чата с пачкой на пересылку
  useEffect(() => {
    const state = location.state as { pendingForward?: ChatMessageResponse[] } | null
    const pending = state?.pendingForward
    if (!pending?.length) return
    setPendingForward(
      [...pending].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    )
    setReplyTo(null)
    navigate(location.pathname, { replace: true, state: {} })
    setTimeout(() => textareaRef.current?.focus(), 80)
  }, [chatId, location.state, location.pathname, navigate])

  const send = () => {
    const c = text.trim()
    const hasForward = pendingForward.length > 0
    if ((!c && !hasForward) || sending) return
    setSending(true)
    const savedText = c
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    let ok = true
    if (c) {
      const payload: Record<string, unknown> = { event_type: 'new_message', content: c }
      if (replyTo && !hasForward) payload.parent_id = replyTo.id
      ok = wsSend(payload)
    }
    if (ok && hasForward) {
      for (const m of pendingForward) {
        ok = wsSend({
          event_type: 'new_message',
          content: m.content,
          forwarded_from: m.id,
        })
        if (!ok) break
      }
    }

    if (!ok) {
      setText(savedText)
    } else {
      setReplyTo(null)
      setPendingForward([])
    }
    setSending(false)
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      if (pendingForward.length) { e.preventDefault(); setPendingForward([]); return }
      if (replyTo) { e.preventDefault(); setReplyTo(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const onTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
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
    setSelectedIds(prev => prev.filter(x => x !== id))
  }

  const delForAll = (id: string) => {
    wsSend({ event_type: 'delete_for_all', message_id: id })
  }

  const rendered = () => {
    const items: ReactNode[] = []
    const visible = messages.filter(m => !(getSenderId(m) === myId && m.is_deleted))

    let unreadInserted = false

    visible.forEach((msg, i) => {
      const prev = visible[i - 1]
      if (!prev || !sameDay(prev.created_at, msg.created_at)) {
        items.push(<DateSeparator key={`d-${msg.id}`} date={msg.created_at} />)
      }

      if (
        !unreadInserted &&
        !isSystem(msg) &&
        getSenderId(msg) !== myId &&
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

      if (!unreadInserted && !ownLastReadMsgId && !isSystem(msg) && getSenderId(msg) !== myId && i === 0) {
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
        items.push(<SystemMessage key={msg.id} content={msg.content} profiles={profiles} />)
        return
      }
      const sender = resolveSender(msg, profiles)
      const parentMsg = resolveRefMsg(msg, 'parent')
      const forwardedMsg = resolveRefMsg(msg, 'forward')
      const parentSender = parentMsg ? resolveSender(parentMsg, profiles) : null
      const forwardedSender = forwardedMsg ? resolveSender(forwardedMsg, profiles) : null
      const own = getSenderId(msg) === myId
      const next = visible[i + 1]
      const sameAuthor = (a: ChatMessageResponse, b: ChatMessageResponse) =>
        !isSystem(a) && !isSystem(b) && getSenderId(a) === getSenderId(b) && sameDay(a.created_at, b.created_at)
      const isFirst = !prev || !sameAuthor(prev, msg)
      const isLast = !next || !sameAuthor(msg, next)
      const showName = isGroup && !own && isFirst
      const showAv = isGroup && !own && isLast
      const isRead = own ? isOwnMessageRead(msg.id) : false

      items.push(
        <MessageBubble
          key={msg.id}
          msg={msg}
          sender={sender}
          parentMsg={parentMsg}
          forwardedMsg={forwardedMsg}
          parentSender={parentSender}
          forwardedSender={forwardedSender}
          isOwn={own}
          showAvatar={showAv}
          showName={showName}
          isFirst={isFirst}
          isLast={isLast}
          isGroup={isGroup}
          isRead={isRead}
          selected={selectedIds.includes(msg.id)}
          selectionMode={selectionMode}
          onToggleSelect={() => toggleSelect(msg.id)}
          onEnterSelect={() => enterSelect(msg.id)}
          onReply={() => startReply(msg)}
          onForward={() => startForward([msg])}
          onEdit={editMsg}
          onDeleteForMe={delForMe}
          onDeleteForAll={delForAll}
        />,
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
        {selectionMode ? (
          <>
            <button onClick={exitSelection} title="Отмена (Esc)"
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, width: 36, height: 36, cursor: 'pointer', color: '#a99ef0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <p style={{ margin: 0, flex: 1, fontSize: 16, fontWeight: 600, color: '#f0f2ff', fontFamily: "'Outfit', sans-serif" }}>
              Выбрано: {selectedIds.length}
            </p>
            {selectedMessages.length === 1 && (
              <button
                onClick={() => startReply(selectedMessages[0])}
                style={selActionBtn}
              >
                Ответить
              </button>
            )}
            {selectedMessages.length > 1 && (
              <button onClick={forwardHere} style={selActionBtn}>
                Переслать сюда
              </button>
            )}
            {selectedMessages.length >= 1 && (
              <button
                onClick={() => startForward(selectedMessages)}
                style={{ ...selActionBtn, background: 'rgba(139,127,232,0.22)', borderColor: 'rgba(139,127,232,0.35)' }}
              >
                Переслать
              </button>
            )}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={() => {
          if (isAtBottom(scrollRef.current)) setNewBelowCount(0)
        }}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', position: 'relative' }}
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
      {!selectionMode && (
        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)', flexShrink: 0 }}>
          {pendingForward.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10,
              background: 'rgba(139,127,232,0.08)', border: '1px solid rgba(139,127,232,0.18)',
              borderRadius: 12, padding: '8px 10px 8px 12px',
            }}>
              <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: '#8b7fe8', flexShrink: 0, minHeight: 28 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: '#a99ef0', fontFamily: "'Outfit', sans-serif" }}>
                  Переслать {pendingForward.length} сообщ.
                </p>
                <p style={{
                  margin: '2px 0 0', fontSize: 13, color: 'rgba(144,149,184,0.65)',
                  fontFamily: "'Outfit', sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {pendingForward[0].content}
                  {pendingForward.length > 1 ? ` · +${pendingForward.length - 1}` : ''}
                </p>
              </div>
              <button onClick={() => setPendingForward([])} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(144,149,184,0.55)',
                fontSize: 20, lineHeight: 1, padding: 4,
              }}>×</button>
            </div>
          )}
          {replyTo && !pendingForward.length && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
              background: 'rgba(139,127,232,0.08)', border: '1px solid rgba(139,127,232,0.18)',
              borderRadius: 12, padding: '8px 10px 8px 12px',
            }}>
              <div style={{
                width: 3, alignSelf: 'stretch', borderRadius: 2,
                background: nameColor(
                  (resolveSender(replyTo, profiles)?.username)
                  || getSenderId(replyTo)
                  || 'x',
                ),
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: '#a99ef0', fontFamily: "'Outfit', sans-serif" }}>
                  В ответ {resolveSender(replyTo, profiles) ? profileFullName(resolveSender(replyTo, profiles)!) : ''}
                </p>
                <p style={{
                  margin: '2px 0 0', fontSize: 13, color: 'rgba(144,149,184,0.65)',
                  fontFamily: "'Outfit', sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {replyTo.content}
                </p>
              </div>
              <button onClick={() => setReplyTo(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(144,149,184,0.55)',
                fontSize: 20, lineHeight: 1, padding: 4,
              }}>×</button>
            </div>
          )}
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
              placeholder={
                pendingForward.length
                  ? 'Добавить сообщение (необязательно)...'
                  : replyTo
                    ? 'Ваш ответ...'
                    : 'Написать сообщение...'
              }
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
              disabled={(!text.trim() && !pendingForward.length) || sending}
              style={{
                background: (text.trim() || pendingForward.length) && !sending
                  ? 'linear-gradient(135deg, #8b7fe8, #7a6dd8)'
                  : 'rgba(139,127,232,0.12)',
                border: 'none', borderRadius: '12px',
                width: '38px', height: '38px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: (text.trim() || pendingForward.length) && !sending ? 'pointer' : 'default',
                transition: 'all 0.2s', alignSelf: 'flex-end',
              }}
            >
              {sending ? <Spinner size={15} /> : (
                <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8L2 2l3.5 6L2 14 14 8z" fill={(text.trim() || pendingForward.length) ? '#fff' : 'rgba(139,127,232,0.35)'} />
                </svg>
              )}
            </button>
          </div>
          <p style={{ margin: '5px 0 0', fontSize: '11px', color: 'rgba(144,149,184,0.28)', fontFamily: "'Outfit', sans-serif", paddingLeft: '4px' }}>
            {pendingForward.length
              ? 'Enter — переслать · Esc — отменить'
              : `Shift+Enter — перенос строки${replyTo ? ' · Esc — отменить ответ' : ''}`}
          </p>
        </div>
      )}
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
      {forwardOpen && (
        <ForwardModal
          messages={forwardPickerMsgs}
          currentChatId={chatId}
          onClose={() => { setForwardOpen(false); setForwardPickerMsgs([]) }}
          onPickChat={pickForwardChat}
        />
      )}
    </div>
  )
}

const selActionBtn: CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '8px 12px',
  cursor: 'pointer',
  color: '#e0e4f8',
  fontSize: 13.5,
  fontWeight: 500,
  fontFamily: "'Outfit', sans-serif",
  whiteSpace: 'nowrap',
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