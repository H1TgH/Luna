import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { profileApi } from '../api/profile'
import { postsApi } from '../api/posts'
import type { ImageItem } from '../api/posts'
import type { ProfileResponse, PostResponse, PostImageResponse } from '../types'
import { useMeStore } from '../store/meStore'
import { useMe } from '../hooks/useMe'
import Header from '../components/layout/Header'

const getPostImageUrl = (key: string) =>
  key.startsWith('http') ? key : `/api/v1/files/${key}`

function formatDate(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

interface LightboxState {
  urls: string[]
  index: number
}

function ImageLightbox({ state, onClose, onNav }: {
  state: LightboxState
  onClose: () => void
  onNav: (dir: 1 | -1) => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNav(1)
      if (e.key === 'ArrowLeft') onNav(-1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onNav])

  const hasMultiple = state.urls.length > 1

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(3,5,15,0.94)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '20px', right: '24px',
          background: 'rgba(255,255,255,0.07)', border: 'none',
          borderRadius: '50%', width: '40px', height: '40px',
          cursor: 'pointer', color: '#e8ecf8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {hasMultiple && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onNav(-1) }}
            style={{
              position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
              width: '44px', height: '44px', cursor: 'pointer', color: '#e8ecf8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s', opacity: state.index === 0 ? 0.3 : 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onNav(1) }}
            style={{
              position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
              width: '44px', height: '44px', cursor: 'pointer', color: '#e8ecf8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s', opacity: state.index === state.urls.length - 1 ? 0.3 : 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      <img
        src={state.urls[state.index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 'min(90vw, 900px)', maxHeight: '88vh',
          objectFit: 'contain', borderRadius: '10px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          userSelect: 'none',
        }}
      />

      {hasMultiple && (
        <div style={{
          position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '6px',
        }}>
          {state.urls.map((_, i) => (
            <div key={i} style={{
              width: i === state.index ? '20px' : '6px', height: '6px',
              borderRadius: '3px',
              background: i === state.index ? '#8b7fe8' : 'rgba(255,255,255,0.25)',
              transition: 'all 0.25s ease',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

function ImageGrid({ images, onImageClick }: {
  images: PostImageResponse[]
  onImageClick: (index: number) => void
}) {
  const sorted = [...images].sort((a, b) => a.order - b.order)
  const count = sorted.length

  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLImageElement>) => (e.currentTarget.style.opacity = '0.88'),
    onMouseLeave: (e: React.MouseEvent<HTMLImageElement>) => (e.currentTarget.style.opacity = '1'),
  }

  if (count === 1) return (
    <div style={{ borderRadius: '12px', overflow: 'hidden', height: '360px' }}>
      <img src={getPostImageUrl(sorted[0].object_key)} alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', cursor: 'pointer', transition: 'opacity 0.15s' }}
        onClick={() => onImageClick(0)} {...hoverHandlers} />
    </div>
  )

  const cell = (src: string, idx: number, extra?: React.ReactNode): React.ReactElement => (
    <div key={idx} style={{ position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <img src={src} alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', cursor: 'pointer', transition: 'opacity 0.15s' }}
        onClick={() => onImageClick(idx)} {...hoverHandlers} />
      {extra}
    </div>
  )

  if (count === 2) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', borderRadius: '12px', overflow: 'hidden', height: '280px' }}>
      {sorted.map((img, i) => cell(getPostImageUrl(img.object_key), i))}
    </div>
  )

  if (count === 3) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '3px', borderRadius: '12px', overflow: 'hidden', height: '320px' }}>
      <div style={{ position: 'relative', overflow: 'hidden', gridRow: '1 / 3' }}>
        <img src={getPostImageUrl(sorted[0].object_key)} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', cursor: 'pointer', transition: 'opacity 0.15s' }}
          onClick={() => onImageClick(0)} {...hoverHandlers} />
      </div>
      {sorted.slice(1).map((img, i) => cell(getPostImageUrl(img.object_key), i + 1))}
    </div>
  )

  const shown = sorted.slice(0, 4)
  const extra = count - 4
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '3px', borderRadius: '12px', overflow: 'hidden', height: '400px' }}>
      {shown.map((img, i) => cell(
        getPostImageUrl(img.object_key),
        i,
        i === 3 && extra > 0 ? (
          <div onClick={() => onImageClick(3)} style={{
            position: 'absolute', inset: 0, background: 'rgba(6,9,26,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '22px', fontWeight: 500, color: '#e8ecf8',
            fontFamily: "'Outfit', sans-serif",
          }}>
            +{extra}
          </div>
        ) : undefined
      ))}
    </div>
  )
}

function PostCard({ post, isOwn, myProfileId, onDelete, onLike, onImageClick }: {
  post: PostResponse
  isOwn: boolean
  myProfileId: string | null
  onDelete: (id: string) => void
  onLike: (id: string, liked: boolean) => void
  onImageClick: (images: PostImageResponse[], index: number) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <article style={{
      background: 'rgba(255,255,255,0.028)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: 'rgba(107,114,156,0.65)', fontFamily: "'Outfit', sans-serif" }}>
          {formatDate(post.created_at)}
        </span>

        {isOwn && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((p) => !p)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(107,114,156,0.5)', padding: '4px 6px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', transition: 'color 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#6b729c'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(107,114,156,0.5)'; e.currentTarget.style.background = 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3.5" r="1.2" fill="currentColor" />
                <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                <circle cx="8" cy="12.5" r="1.2" fill="currentColor" />
              </svg>
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                background: 'rgba(15,19,45,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', minWidth: '140px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 10,
              }}>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(post.id) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', padding: '11px 14px', background: 'none', border: 'none',
                    cursor: 'pointer', color: '#f87171', fontSize: '13.5px',
                    fontFamily: "'Outfit', sans-serif", textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 3.5h9M4.5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5 6v4M8 6v4M3 3.5l.5 7a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.5-7"
                      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Удалить пост
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {post.content && (
        <p style={{
          fontSize: '15px', color: '#d4d8ef', lineHeight: 1.65,
          fontFamily: "'Outfit', sans-serif", fontWeight: 300,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
        }}>
          {post.content}
        </p>
      )}

      {post.images && post.images.length > 0 && (
        <ImageGrid images={post.images} onImageClick={(i) => onImageClick(post.images!, i)} />
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)',
        marginTop: '2px',
      }}>
        <button
          onClick={() => onLike(post.id, post.is_current_user_likes)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none',
            cursor: myProfileId ? 'pointer' : 'default',
            padding: '7px 10px', borderRadius: '8px',
            color: post.is_current_user_likes ? '#f472b6' : 'rgba(107,114,156,0.55)',
            fontSize: '13px', fontFamily: "'Outfit', sans-serif",
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!myProfileId) return
            e.currentTarget.style.background = 'rgba(244,114,182,0.08)'
            e.currentTarget.style.color = '#f472b6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = post.is_current_user_likes ? '#f472b6' : 'rgba(107,114,156,0.55)'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 12.5C7.5 12.5 1.5 9 1.5 5.5a3 3 0 016-0 3 3 0 016 0C13.5 9 7.5 12.5 7.5 12.5z"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
              fill={post.is_current_user_likes ? 'currentColor' : 'none'} />
          </svg>
          {post.likes_count > 0 && <span>{post.likes_count}</span>}
        </button>

        <button disabled title="Комментарии — скоро" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', cursor: 'default',
          padding: '7px 10px', borderRadius: '8px',
          color: 'rgba(107,114,156,0.3)', fontSize: '13px',
          fontFamily: "'Outfit', sans-serif",
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2 2.5h11a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H8L5 13.5v-3H2a.5.5 0 01-.5-.5V3a.5.5 0 01.5-.5z"
              stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </button>

        <button disabled title="Репосты — скоро" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', cursor: 'default',
          padding: '7px 10px', borderRadius: '8px',
          color: 'rgba(107,114,156,0.3)', fontSize: '13px',
          fontFamily: "'Outfit', sans-serif",
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2.5 9.5V11a1 1 0 001 1h8a1 1 0 001-1V7M12.5 5.5V4a1 1 0 00-1-1h-8a1 1 0 00-1 1v3"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 3.5l2.5 2-2.5 2M5 11.5l-2.5-2 2.5-2"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </article>
  )
}

function CreatePost({ onCreated }: { onCreated: (post: PostResponse) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 4 - images.length)
    setImages((p) => [...p, ...newFiles])
    setPreviews((p) => [...p, ...newFiles.map((f) => URL.createObjectURL(f))])
  }

  const removeImage = (i: number) => {
    URL.revokeObjectURL(previews[i])
    setImages((p) => p.filter((_, idx) => idx !== i))
    setPreviews((p) => p.filter((_, idx) => idx !== i))
  }

  const reset = () => {
    setContent('')
    setImages([])
    previews.forEach((u) => URL.revokeObjectURL(u))
    setPreviews([])
    setExpanded(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return
    setIsLoading(true)
    try {
      const { data: created } = await postsApi.create({ content: content.trim() || undefined, images })
      if (created && created.id) {
        onCreated(created)
      }
      reset()
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(139,127,232,0.04)',
      border: '1px solid rgba(139,127,232,0.14)',
      borderRadius: '16px', padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: '0',
      transition: 'border-color 0.2s',
    }}>
      <textarea
        ref={textareaRef}
        placeholder="Что у вас нового?"
        value={content}
        onFocus={() => setExpanded(true)}
        onChange={handleTextareaChange}
        style={{
          width: '100%', background: 'none', border: 'none', outline: 'none',
          resize: 'none', color: '#d4d8ef', fontSize: '15px',
          fontFamily: "'Outfit', sans-serif", fontWeight: 300,
          lineHeight: 1.65, overflow: 'hidden', minHeight: '24px',
        }}
      />

      {previews.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
          {previews.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: '76px', height: '76px' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: "cover", objectPosition: "center", borderRadius: '8px', display: 'block' }} />
              <button onClick={() => removeImage(i)} style={{
                position: 'absolute', top: '-6px', right: '-6px',
                background: 'rgba(15,19,45,0.92)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer',
                color: '#e8ecf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', paddingTop: '12px',
        }}>
          <div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={images.length >= 4}
              style={{
                background: 'none', border: 'none',
                cursor: images.length >= 4 ? 'default' : 'pointer',
                color: images.length >= 4 ? 'rgba(107,114,156,0.22)' : 'rgba(107,114,156,0.55)',
                padding: '5px', borderRadius: '7px', display: 'flex', alignItems: 'center',
                transition: 'color 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (images.length >= 4) return
                e.currentTarget.style.color = '#8b7fe8'
                e.currentTarget.style.background = 'rgba(139,127,232,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = images.length >= 4 ? 'rgba(107,114,156,0.22)' : 'rgba(107,114,156,0.55)'
                e.currentTarget.style.background = 'none'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="6" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1.5 12l4-4 3 3 2.5-2.5 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={reset}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(107,114,156,0.45)', fontSize: '13px',
                fontFamily: "'Outfit', sans-serif", padding: '6px 10px', borderRadius: '7px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#6b729c')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(107,114,156,0.45)')}
            >
              Отмена
            </button>

            <button
              onClick={handleSubmit}
              disabled={(!content.trim() && images.length === 0) || isLoading}
              style={{
                background: (content.trim() || images.length > 0) && !isLoading
                  ? 'linear-gradient(135deg, #8b7fe8 0%, #7a6dd8 100%)'
                  : 'rgba(139,127,232,0.12)',
                border: 'none', borderRadius: '8px', padding: '7px 18px',
                cursor: (content.trim() || images.length > 0) && !isLoading ? 'pointer' : 'default',
                color: (content.trim() || images.length > 0) && !isLoading ? '#fff' : 'rgba(139,127,232,0.3)',
                fontSize: '13.5px', fontFamily: "'Outfit', sans-serif", fontWeight: 500,
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {isLoading ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <>
                  Опубликовать
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1.5 6.5h10M8 3l3 3.5-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()

  useMe()
  const myProfile = useMeStore((s) => s.me)
  const setMyProfileInStore = useMeStore((s) => s.setMe)

  const [viewedProfile, setViewedProfile] = useState<ProfileResponse | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [posts, setPosts] = useState<PostResponse[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasNext, setHasNext] = useState(true)

  const [lightbox, setLightbox] = useState<LightboxState | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'photos'>('posts')
  const [photos, setPhotos] = useState<ImageItem[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [photosCursor, setPhotosCursor] = useState<string | undefined>(undefined)
  const [photosHasNext, setPhotosHasNext] = useState(true)
  const photosSentinelRef = useRef<HTMLDivElement>(null)
  const photosLoadingRef = useRef(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const isOwnProfile = !!(viewedProfile && myProfile && viewedProfile.id === myProfile.id)
  const profileFetchRef = useRef(false)

  useEffect(() => {
    if (!username) return
    if (profileFetchRef.current) return
    profileFetchRef.current = true

    setProfileLoading(true)
    setProfileError(null)
    setViewedProfile(null)
    setPosts([])
    setCursor(undefined)
    setHasNext(true)

    profileApi.getByUsername(username)
      .then(({ data }) => setViewedProfile(data))
      .catch((err) => {
        if (err?.response?.status === 404) setProfileError('Пользователь не найден')
        else setProfileError('Не удалось загрузить профиль')
      })
      .finally(() => setProfileLoading(false))

    return () => { profileFetchRef.current = false }
  }, [username])

  const loadPosts = useCallback(async (profileId: string, nextCursor?: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setPostsLoading(true)
    try {
      const { data } = await postsApi.getByUser(profileId, nextCursor)
      setPosts((p) => nextCursor ? [...p, ...data.posts] : data.posts)
      setCursor(data.next_cursor ?? undefined)
      setHasNext(data.has_next)
    } catch {
    } finally {
      setPostsLoading(false)
      loadingRef.current = false
    }
  }, [])

  const loadPhotos = useCallback(async (profileId: string, nextCursor?: string) => {
    if (photosLoadingRef.current) return
    photosLoadingRef.current = true
    setPhotosLoading(true)
    try {
      const { data } = await postsApi.getUserImages(profileId, nextCursor)
      const items = Array.isArray(data) ? data : []
      setPhotos((p) => nextCursor ? [...p, ...items] : items)
      if (items.length < 25) {
        setPhotosHasNext(false)
        setPhotosCursor(undefined)
      } else {
        setPhotosHasNext(true)
        setPhotosCursor(items[items.length - 1]?.created_at)
      }
    } catch {
    } finally {
      setPhotosLoading(false)
      photosLoadingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (viewedProfile) loadPosts(viewedProfile.id)
  }, [viewedProfile, loadPosts])

  useEffect(() => {
    if (viewedProfile && activeTab === 'photos' && photos.length === 0) {
      loadPhotos(viewedProfile.id)
    }
  }, [viewedProfile, activeTab, loadPhotos])

  useEffect(() => {
    if (!sentinelRef.current || !viewedProfile) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !loadingRef.current) {
          loadPosts(viewedProfile.id, cursor)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [viewedProfile, cursor, hasNext, loadPosts])

  useEffect(() => {
    if (!photosSentinelRef.current || !viewedProfile || activeTab !== 'photos') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && photosHasNext && !photosLoadingRef.current) {
          loadPhotos(viewedProfile.id, photosCursor)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(photosSentinelRef.current)
    return () => observer.disconnect()
  }, [viewedProfile, photosCursor, photosHasNext, activeTab, loadPhotos])

  const handleLike = async (postId: string, liked: boolean) => {
    if (!myProfile) return
    setPosts((prev) => prev.map((p) => p.id === postId
      ? { ...p, is_current_user_likes: !liked, likes_count: liked ? p.likes_count - 1 : p.likes_count + 1 }
      : p
    ))
    try {
      if (liked) await postsApi.unlike(postId)
      else await postsApi.like(postId)
    } catch {
      setPosts((prev) => prev.map((p) => p.id === postId
        ? { ...p, is_current_user_likes: liked, likes_count: liked ? p.likes_count + 1 : p.likes_count - 1 }
        : p
      ))
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      await postsApi.delete(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch {
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      await profileApi.uploadAvatar(file)
      const { data } = await profileApi.getMe()
      setMyProfileInStore(data)
      if (isOwnProfile) setViewedProfile(data)
    } catch {
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const openLightbox = (images: PostImageResponse[], index: number) => {
    const urls = [...images].sort((a, b) => a.order - b.order).map((img) => getPostImageUrl(img.object_key))
    setLightbox({ urls, index })
  }

  const navLightbox = useCallback((dir: 1 | -1) => {
    setLightbox((prev) => {
      if (!prev) return null
      const next = prev.index + dir
      if (next < 0 || next >= prev.urls.length) return prev
      return { ...prev, index: next }
    })
  }, [])

  if (profileLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#06091a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
          <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (profileError || !viewedProfile) {
    return (
      <div style={{ minHeight: '100vh', background: '#06091a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ color: '#6b729c', fontSize: '16px', fontFamily: "'Outfit', sans-serif" }}>
          {profileError ?? 'Профиль не найден'}
        </p>
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#8b7fe8', fontSize: '14px', fontFamily: "'Outfit', sans-serif",
        }}>
          ← Назад
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06091a', color: '#e8ecf8' }}>
      <Header />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '36px 24px 80px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '22px',
          marginBottom: '32px', paddingBottom: '28px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => isOwnProfile && avatarInputRef.current?.click()}
              style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(139,127,232,0.28), rgba(99,80,220,0.12))',
                border: '2px solid rgba(139,127,232,0.18)',
                overflow: 'hidden', cursor: isOwnProfile ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}
            >
              {viewedProfile.avatar_url ? (
                <img src={viewedProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: "cover", objectPosition: "center" }} />
              ) : (
                <span style={{
                  fontSize: '30px', fontWeight: 500, color: 'rgba(139,127,232,0.65)',
                  fontFamily: "'Outfit', sans-serif", userSelect: 'none',
                }}>
                  {viewedProfile.first_name[0]}
                </span>
              )}

              {isOwnProfile && (
                <div
                  style={{
                    position: 'absolute', inset: 0, background: 'rgba(6,9,26,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: avatarUploading ? 1 : 0, transition: 'opacity 0.2s',
                    borderRadius: '50%',
                  }}
                  onMouseEnter={(e) => { if (!avatarUploading) e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { if (!avatarUploading) e.currentTarget.style.opacity = '0' }}
                >
                  {avatarUploading ? (
                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.3" />
                      <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 2v9M5.5 5.5L9 2l3.5 3.5" stroke="#e8ecf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 13v2a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-2" stroke="#e8ecf8" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              )}
            </div>

            <div style={{
              position: 'absolute', bottom: '4px', right: '4px',
              width: '14px', height: '14px', borderRadius: '50%',
              background: '#22c55e', border: '2.5px solid #06091a',
            }} />

            {isOwnProfile && (
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: '4px' }}>
            <h1 style={{
              fontSize: '21px', fontWeight: 600, color: '#e8ecf8',
              fontFamily: "'Outfit', sans-serif", margin: 0, lineHeight: 1.2,
            }}>
              {viewedProfile.first_name} {viewedProfile.last_name}
            </h1>
            <p style={{
              fontSize: '14px', color: 'rgba(107,114,156,0.7)',
              fontFamily: "'Outfit', sans-serif", margin: '3px 0 0',
            }}>
              @{viewedProfile.username}
            </p>

            {viewedProfile.status && (
              <p style={{
                fontSize: '14px', color: '#9095b8', fontFamily: "'Outfit', sans-serif",
                margin: '10px 0 0', fontWeight: 300, lineHeight: 1.55,
              }}>
                {viewedProfile.status}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#e8ecf8', fontFamily: "'Outfit', sans-serif" }}>
                  {posts.length}{hasNext ? '+' : ''}
                </span>
                <span style={{ fontSize: '12.5px', color: 'rgba(107,114,156,0.55)', fontFamily: "'Outfit', sans-serif", marginLeft: '5px' }}>
                  {posts.length === 1 ? 'пост' : posts.length >= 2 && posts.length <= 4 ? 'поста' : 'постов'}
                </span>
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => setEditOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'transparent', border: '1px solid rgba(139,147,210,0.18)',
                    borderRadius: '8px', padding: '5px 12px', cursor: 'pointer',
                    color: '#6b729c', fontSize: '12.5px', fontFamily: "'Outfit', sans-serif",
                    transition: 'color 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#a99ef0'
                    e.currentTarget.style.borderColor = 'rgba(139,127,232,0.35)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#6b729c'
                    e.currentTarget.style.borderColor = 'rgba(139,147,210,0.18)'
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Редактировать
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '20px' }}>
          {(['posts', 'photos'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '12px 0', background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === tab ? '#8b7fe8' : 'transparent'}`,
                marginBottom: '-1px', cursor: 'pointer',
                color: activeTab === tab ? '#a99ef0' : 'rgba(107,114,156,0.5)',
                fontSize: '13.5px', fontFamily: "'Outfit', sans-serif",
                fontWeight: activeTab === tab ? 500 : 400,
                letterSpacing: '0.02em', transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              {tab === 'posts' ? 'Публикации' : 'Фотографии'}
            </button>
          ))}
        </div>

        {activeTab === 'posts' && (
          <>
            {isOwnProfile && (
              <div style={{ marginBottom: '16px' }}>
                <CreatePost onCreated={(post) => setPosts((p) => [post, ...p])} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isOwn={isOwnProfile}
                  myProfileId={myProfile?.id ?? null}
                  onDelete={handleDelete}
                  onLike={handleLike}
                  onImageClick={openLightbox}
                />
              ))}

              {!postsLoading && posts.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '56px 0',
                  color: 'rgba(107,114,156,0.4)', fontFamily: "'Outfit', sans-serif",
                  fontSize: '15px', fontWeight: 300,
                }}>
                  {isOwnProfile ? 'Поделитесь чем-нибудь первым ✨' : 'Пока нет постов'}
                </div>
              )}

              <div ref={sentinelRef} style={{ height: '1px' }} />

              {postsLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
                    <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'photos' && (
          <>
            {!photosLoading && photos.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '56px 0',
                color: 'rgba(107,114,156,0.4)', fontFamily: "'Outfit', sans-serif",
                fontSize: '15px', fontWeight: 300,
              }}>
                Нет фотографий
              </div>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '3px', borderRadius: '12px', overflow: 'hidden',
              }}>
                {photos.map((img, i) => (
                  <div
                    key={img.object_key + i}
                    style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => setLightbox({ urls: photos.map((p) => getPostImageUrl(p.object_key)), index: i })}
                  >
                    <img
                      src={getPostImageUrl(img.object_key)}
                      alt=""
                      style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover', objectPosition: 'center',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    />
                  </div>
                ))}
              </div>
            )}

            <div ref={photosSentinelRef} style={{ height: '1px' }} />

            {photosLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
                  <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && (
        <ImageLightbox state={lightbox} onClose={() => setLightbox(null)} onNav={navLightbox} />
      )}

      {editOpen && viewedProfile && (
        <EditProfileModal
          profile={viewedProfile}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setViewedProfile(updated)
            setMyProfileInStore(updated)
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}

function EditProfileModal({ profile, onClose, onSaved }: {
  profile: ProfileResponse
  onClose: () => void
  onSaved: (updated: ProfileResponse) => void
}) {
  const [firstName, setFirstName] = useState(profile.first_name)
  const [lastName, setLastName] = useState(profile.last_name)
  const [birthDate, setBirthDate] = useState(profile.birth_date ?? '')
  const [gender, setGender] = useState<'Male' | 'Female'>(profile.gender)
  const [status, setStatus] = useState(profile.status ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const canSave = firstName.trim() && lastName.trim() && birthDate && gender && !isLoading

  const handleSave = async () => {
    if (!canSave) return
    setIsLoading(true)
    setError(null)
    try {
      await profileApi.update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: birthDate,
        gender,
        status: status.trim() || undefined,
      } as Parameters<typeof profileApi.update>[0])
      const { data } = await profileApi.getMe()
      onSaved(data)
    } catch {
      setError('Не удалось сохранить изменения')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(3,5,15,0.78)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(12,16,38,0.99)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '18px', padding: '28px', width: '100%', maxWidth: '420px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#e8ecf8', fontFamily: "'Outfit', sans-serif" }}>
            Редактировать профиль
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(107,114,156,0.55)', padding: '4px', display: 'flex', borderRadius: '6px',
            transition: 'color 0.2s',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#6b729c')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(107,114,156,0.55)')}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 2l11 11M13 2L2 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error && (
          <div style={{
            marginBottom: '16px', padding: '11px 14px', borderRadius: '9px',
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            color: '#f87171', fontSize: '13.5px', fontFamily: "'Outfit', sans-serif",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <EditField label="Имя" value={firstName} onChange={setFirstName} />
          <EditField label="Фамилия" value={lastName} onChange={setLastName} />
          <EditField label="Дата рождения" value={birthDate} onChange={setBirthDate} type="date" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{
              fontSize: '11.5px', fontWeight: 500, color: '#6b729c',
              textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'Outfit', sans-serif",
            }}>
              Пол
            </label>
            <EditSelectGender value={gender} onChange={setGender} />
          </div>

          <EditField label="Статус" value={status} onChange={setStatus} placeholder="Расскажите о себе..." />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' }}>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid rgba(139,147,210,0.18)', borderRadius: '8px',
            padding: '8px 16px', cursor: 'pointer', color: '#6b729c',
            fontSize: '13.5px', fontFamily: "'Outfit', sans-serif",
            transition: 'color 0.2s, border-color 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#9095b8'; e.currentTarget.style.borderColor = 'rgba(139,147,210,0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b729c'; e.currentTarget.style.borderColor = 'rgba(139,147,210,0.18)' }}
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              background: canSave ? 'linear-gradient(135deg, #8b7fe8 0%, #7a6dd8 100%)' : 'rgba(139,127,232,0.13)',
              border: 'none', borderRadius: '8px', padding: '8px 20px',
              cursor: canSave ? 'pointer' : 'default',
              color: canSave ? '#fff' : 'rgba(139,127,232,0.35)',
              fontSize: '13.5px', fontFamily: "'Outfit', sans-serif", fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? (
              <svg style={{ animation: 'spin 1s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{
        fontSize: '11.5px', fontWeight: 500, color: '#6b729c',
        textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'Outfit', sans-serif",
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          height: '40px', borderRadius: '9px', padding: '0 13px',
          fontSize: '14px', fontFamily: "'Outfit', sans-serif",
          background: 'rgba(17,22,54,0.7)',
          border: `1px solid ${focused ? 'rgba(139,127,232,0.55)' : 'rgba(139,147,210,0.18)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(139,127,232,0.1)' : 'none',
          color: '#e8ecf8', outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      />
    </div>
  )
}

function EditSelectGender({ value, onChange }: {
  value: 'Male' | 'Female'
  onChange: (v: 'Male' | 'Female') => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as 'Male' | 'Female')}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          height: '40px', borderRadius: '9px', padding: '0 36px 0 13px',
          fontSize: '14px', fontFamily: "'Outfit', sans-serif",
          appearance: 'none', WebkitAppearance: 'none',
          background: 'rgba(17,22,54,0.7)',
          border: `1px solid ${focused ? 'rgba(139,127,232,0.55)' : 'rgba(139,147,210,0.18)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(139,127,232,0.1)' : 'none',
          color: '#e8ecf8', outline: 'none', cursor: 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <option value="Male" style={{ background: 'rgb(17,22,54)' }}>Мужской</option>
        <option value="Female" style={{ background: 'rgb(17,22,54)' }}>Женский</option>
      </select>
      <div style={{
        pointerEvents: 'none', position: 'absolute',
        right: '13px', top: '50%', transform: 'translateY(-50%)',
        color: 'rgba(107,114,156,0.5)',
      }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}