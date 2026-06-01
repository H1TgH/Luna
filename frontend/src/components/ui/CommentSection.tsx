import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { commentsApi } from '../../api/comments'
import type { CommentResponse } from '../../types'
import { useMeStore } from '../../store/meStore'

function formatCommentDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)}м`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`
  if (diff < 604800) return `${Math.floor(diff / 86400)}д`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function Avatar({ avatarUrl, firstName, size = 32 }: { avatarUrl: string | null; firstName: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(139,127,232,0.15)',
      border: '1px solid rgba(139,127,232,0.18)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: size * 0.38, fontWeight: 500, color: 'rgba(139,127,232,0.75)', fontFamily: "'Outfit', sans-serif" }}>
          {firstName[0]}
        </span>
      )}
    </div>
  )
}

interface InlineReplyInputProps {
  me: { avatar_url: string | null; first_name: string } | null
  replyToUsername: string | null
  replyToProfileUrl: string | null
  onSubmit: (text: string) => Promise<void>
  onCancel: () => void
}

function InlineReplyInput({ me, replyToUsername, replyToProfileUrl, onSubmit, onCancel }: InlineReplyInputProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(text.trim())
      setText('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      {me && <Avatar avatarUrl={me.avatar_url} firstName={me.first_name} size={26} />}
      <div style={{ flex: 1 }}>
        {replyToUsername && replyToProfileUrl && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            marginBottom: 5, fontSize: 11.5,
            fontFamily: "'Outfit', sans-serif", color: 'rgba(107,114,156,0.5)',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 7V4a2 2 0 012-2h4" stroke="rgba(139,127,232,0.5)" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M6 1l2 1.5L6 4" stroke="rgba(139,127,232,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Ответ</span>
            <Link
              to={replyToProfileUrl}
              style={{ color: 'rgba(139,127,232,0.7)', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#a99ef0')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(139,127,232,0.7)')}
            >
              @{replyToUsername}
            </Link>
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Напишите ответ..."
            style={{
              flex: 1, height: 33, background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(139,127,232,0.25)',
              borderRadius: 16, padding: '0 12px',
              fontSize: 13, fontFamily: "'Outfit', sans-serif",
              color: '#d4d8ef', outline: 'none', transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,127,232,0.5)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(139,127,232,0.25)')}
          />
          {text.trim() && (
            <button type="submit" disabled={submitting} style={{
              background: 'rgba(139,127,232,0.15)', border: '1px solid rgba(139,127,232,0.25)',
              borderRadius: 7, padding: '5px 10px', cursor: submitting ? 'default' : 'pointer',
              color: submitting ? 'rgba(139,127,232,0.35)' : '#a99ef0',
              fontSize: 12, fontFamily: "'Outfit', sans-serif", fontWeight: 500,
              transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {submitting ? '...' : 'Отправить'}
            </button>
          )}
          <button type="button" onClick={onCancel} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(107,114,156,0.4)', padding: 3, display: 'flex',
            flexShrink: 0, transition: 'color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#6b729c')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(107,114,156,0.4)')}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 2l7 7M9 2L2 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

interface ReplyThreadProps {
  rootCommentId: string
  me: { avatar_url: string | null; first_name: string } | null
  postId: string
  onCountChange: (delta: number) => void
}

function ReplyThread({ rootCommentId, me, postId, onCountChange }: ReplyThreadProps) {
  const [replies, setReplies] = useState<CommentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)

  useEffect(() => {
    commentsApi.getReplies(rootCommentId, undefined, 50)
      .then(({ data }) => setReplies(data.comments))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [rootCommentId])

  const handleSubmitReply = async (targetComment: CommentResponse, text: string) => {
    const { data: created } = await commentsApi.create(postId, text, targetComment.id)
    setReplies(prev => [...prev, created])
    setReplyingToId(null)
    onCountChange(1)
  }

  if (loading) return (
    <div style={{ paddingTop: 8 }}>
      <svg style={{ animation: 'spin 0.8s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.3" />
        <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {replies.map(reply => {
        const parentReply = reply.parent_id && reply.parent_id !== rootCommentId
          ? replies.find(r => r.id === reply.parent_id)
          : null

        return (
          <div key={reply.id}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to={`/${reply.author?.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <Avatar avatarUrl={reply.author?.avatar_url ?? null} firstName={reply.author?.first_name ?? '?'} size={26} />
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <Link to={`/${reply.author?.username}`} style={{
                    fontSize: 12.5, fontWeight: 500, color: '#c8cce8',
                    fontFamily: "'Outfit', sans-serif", textDecoration: 'none',
                  }}>
                    {reply.author?.first_name} {reply.author?.last_name}
                  </Link>
                  <span style={{ fontSize: 11, color: 'rgba(107,114,156,0.4)', fontFamily: "'Outfit', sans-serif" }}>
                    {formatCommentDate(reply.created_at)}
                  </span>
                </div>
                <p style={{
                  fontSize: 13.5, color: '#d4d8ef', lineHeight: 1.55,
                  fontFamily: "'Outfit', sans-serif", fontWeight: 300,
                  margin: '3px 0 0', wordBreak: 'break-word',
                }}>
                  {parentReply && (
                    <Link
                      to={`/${parentReply.author?.username}`}
                      style={{ color: 'rgba(139,127,232,0.7)', textDecoration: 'none', marginRight: 4, fontWeight: 400 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#a99ef0')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(139,127,232,0.7)')}
                    >
                      @{parentReply.author?.username}
                    </Link>
                  )}
                  {reply.text}
                </p>
                <button
                  onClick={() => setReplyingToId(replyingToId === reply.id ? null : reply.id)}
                  style={{
                    marginTop: 4, background: 'none', border: 'none', cursor: 'pointer',
                    color: replyingToId === reply.id ? '#8b7fe8' : 'rgba(107,114,156,0.4)',
                    fontSize: 11.5, fontFamily: "'Outfit', sans-serif", padding: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#8b7fe8')}
                  onMouseLeave={e => (e.currentTarget.style.color = replyingToId === reply.id ? '#8b7fe8' : 'rgba(107,114,156,0.4)')}
                >
                  Ответить
                </button>
              </div>
            </div>

            {replyingToId === reply.id && (
              <div style={{ paddingLeft: 34, marginTop: 8 }}>
                <InlineReplyInput
                  me={me}
                  replyToUsername={reply.author?.username ?? null}
                  replyToProfileUrl={`/${reply.author?.username}`}
                  onSubmit={(text) => handleSubmitReply(reply, text)}
                  onCancel={() => setReplyingToId(null)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface RootCommentItemProps {
  comment: CommentResponse
  me: { avatar_url: string | null; first_name: string } | null
  postId: string
  onCountChange: (delta: number) => void
  onRootReplyCountChange: (commentId: string, delta: number) => void
}

function RootCommentItem({ comment, me, postId, onCountChange, onRootReplyCountChange }: RootCommentItemProps) {
  const repliesCount = comment.replies_count ?? 0
  const [showReplies, setShowReplies] = useState(false)
  const [replyingToRoot, setReplyingToRoot] = useState(false)

  const handleSubmitRootReply = async (text: string) => {
    await commentsApi.create(postId, text, comment.id)
    onCountChange(1)
    onRootReplyCountChange(comment.id, 1)
    setReplyingToRoot(false)
    setShowReplies(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Link to={`/${comment.author?.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Avatar avatarUrl={comment.author?.avatar_url ?? null} firstName={comment.author?.first_name ?? '?'} size={32} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
            <Link to={`/${comment.author?.username}`} style={{
              fontSize: 13, fontWeight: 500, color: '#c8cce8',
              fontFamily: "'Outfit', sans-serif", textDecoration: 'none',
            }}>
              {comment.author?.first_name} {comment.author?.last_name}
            </Link>
            <span style={{ fontSize: 11.5, color: 'rgba(107,114,156,0.4)', fontFamily: "'Outfit', sans-serif" }}>
              {formatCommentDate(comment.created_at)}
            </span>
          </div>
          <p style={{
            fontSize: 14, color: '#d4d8ef', lineHeight: 1.6,
            fontFamily: "'Outfit', sans-serif", fontWeight: 300,
            margin: '4px 0 0', wordBreak: 'break-word',
          }}>
            {comment.text}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <button
              onClick={() => { setReplyingToRoot(p => !p); if (showReplies) setShowReplies(false) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: replyingToRoot ? '#8b7fe8' : 'rgba(107,114,156,0.45)',
                fontSize: 12, fontFamily: "'Outfit', sans-serif", padding: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8b7fe8')}
              onMouseLeave={e => (e.currentTarget.style.color = replyingToRoot ? '#8b7fe8' : 'rgba(107,114,156,0.45)')}
            >
              Ответить
            </button>
            {repliesCount > 0 && (
              <button
                onClick={() => { setShowReplies(p => !p); if (replyingToRoot) setReplyingToRoot(false) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: showReplies ? 'rgba(107,114,156,0.5)' : 'rgba(139,127,232,0.65)',
                  fontSize: 12, fontFamily: "'Outfit', sans-serif", padding: 0,
                  display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = showReplies ? '#6b729c' : '#a99ef0')}
                onMouseLeave={e => (e.currentTarget.style.color = showReplies ? 'rgba(107,114,156,0.5)' : 'rgba(139,127,232,0.65)')}
              >
                {showReplies ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 7l4-4 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Свернуть
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {repliesCount} {repliesCount === 1 ? 'ответ' : repliesCount < 5 ? 'ответа' : 'ответов'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {replyingToRoot && (
        <div style={{ paddingLeft: 42, marginTop: 10 }}>
          <InlineReplyInput
            me={me}
            replyToUsername={comment.author?.username ?? null}
            replyToProfileUrl={`/${comment.author?.username}`}
            onSubmit={handleSubmitRootReply}
            onCancel={() => setReplyingToRoot(false)}
          />
        </div>
      )}

      {showReplies && (
        <div style={{ paddingLeft: 42, marginTop: 10 }}>
          <ReplyThread
            rootCommentId={comment.id}
            me={me}
            postId={postId}
            onCountChange={delta => { onCountChange(delta); onRootReplyCountChange(comment.id, delta) }}
          />
        </div>
      )}
    </div>
  )
}

interface CommentSectionProps {
  postId: string
  isOpen: boolean
  commentsCount: number
  onCountChange?: (delta: number) => void
}

export default function CommentSection({ postId, isOpen, onCountChange }: CommentSectionProps) {
  const me = useMeStore(s => s.me)
  const [comments, setComments] = useState<CommentResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [newText, setNewText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || fetched) return
    setLoading(true)
    commentsApi.getForPost(postId, undefined, 30)
      .then(({ data }) => setComments(data.comments))
      .catch(console.error)
      .finally(() => { setLoading(false); setFetched(true) })
  }, [isOpen, postId, fetched])

  const handleRootReplyCountChange = (commentId: string, delta: number) => {
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, replies_count: (c.replies_count ?? 0) + delta } : c
    ))
  }

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim() || !me) return
    setSubmitting(true)
    try {
      const { data: created } = await commentsApi.create(postId, newText.trim(), null)
      setComments(prev => [created, ...prev])
      onCountChange?.(1)
      setNewText('')
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, paddingTop: 16 }}>
      <form onSubmit={handleSubmitNew} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
        {me && <Avatar avatarUrl={me.avatar_url} firstName={me.first_name} size={28} />}
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Добавьте комментарий..."
          style={{
            flex: 1, height: 36, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(139,147,210,0.14)',
            borderRadius: 20, padding: '0 14px',
            fontSize: 13.5, fontFamily: "'Outfit', sans-serif",
            color: '#d4d8ef', outline: 'none', transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,127,232,0.4)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(139,147,210,0.14)')}
        />
        {newText.trim() && (
          <button type="submit" disabled={submitting} style={{
            background: 'rgba(139,127,232,0.15)', border: '1px solid rgba(139,127,232,0.25)',
            borderRadius: 8, padding: '6px 12px', cursor: submitting ? 'default' : 'pointer',
            color: submitting ? 'rgba(139,127,232,0.4)' : '#a99ef0',
            fontSize: 12.5, fontFamily: "'Outfit', sans-serif", fontWeight: 500,
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            {submitting ? '...' : 'Отправить'}
          </button>
        )}
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <svg style={{ animation: 'spin 0.8s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#8b7fe8" strokeWidth="2.5" opacity="0.2" />
              <path d="M4 12a8 8 0 018-8" stroke="#8b7fe8" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {!loading && fetched && comments.length === 0 && (
          <p style={{
            textAlign: 'center', fontSize: 13, color: 'rgba(107,114,156,0.4)',
            fontFamily: "'Outfit', sans-serif", padding: '8px 0', fontWeight: 300,
          }}>
            Пока нет комментариев
          </p>
        )}

        {comments.map(comment => (
          <RootCommentItem
            key={comment.id}
            comment={comment}
            me={me}
            postId={postId}
            onCountChange={delta => onCountChange?.(delta)}
            onRootReplyCountChange={handleRootReplyCountChange}
          />
        ))}
      </div>
    </div>
  )
}