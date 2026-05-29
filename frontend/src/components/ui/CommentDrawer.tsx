import { useState, useEffect } from 'react'
import { commentsApi } from '../../api/comments'
import type { CommentResponse } from '../../types'
import { useMeStore } from '../../store/meStore'

interface CommentDrawerProps {
  postId: string | null
  isOpen: boolean
  onClose: () => void
  commentsCount: number
}

export default function CommentDrawer({ postId, isOpen, onClose, commentsCount }: CommentDrawerProps) {
  const me = useMeStore((s) => s.me)

  const [comments, setComments] = useState<CommentResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [replyTo, setReplyTo] = useState<CommentResponse | null>(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [expandedThreads, setExpandedThreads] = useState<Record<string, CommentResponse[]>>({})

  const loadRootComments = async () => {
    if (!postId) return
    setLoading(true)
    try {
      const { data } = await commentsApi.getForPost(postId)
      setComments(data.comments)
      setExpandedThreads({})
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadReplies = async (commentId: string) => {
    try {
      const { data } = await commentsApi.getReplies(commentId)
      setExpandedThreads(prev => ({
        ...prev,
        [commentId]: data.comments
      }))
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim() || !postId) return

    try {
      const { data: created } = await commentsApi.create(
        postId,
        newCommentText.trim(),
        replyTo?.id || null
      )
      setComments(prev => [created, ...prev])
      setNewCommentText('')
      setReplyTo(null)
    } catch (e: any) {
      console.error(e)
      alert(e?.response?.data?.detail?.[0]?.msg || 'Не удалось отправить комментарий')
    }
  }

  useEffect(() => {
    if (isOpen && postId) {
      loadRootComments()
    }
  }, [isOpen, postId])

  if (!isOpen || !postId) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end" onClick={onClose}>
      <div 
        className="bg-[#0a0d1a] w-full max-w-lg mx-auto rounded-t-3xl overflow-hidden flex flex-col h-[88vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0a0d1a] sticky top-0 z-10">
          <h3 className="text-lg font-semibold">Комментарии • {commentsCount}</h3>
          <button onClick={onClose} className="text-2xl text-white/60 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {comments.map(comment => (
            <div key={comment.id}>
              {/* Основной комментарий */}
              <div className="flex gap-3">
                <img src={comment.author.avatar_url || '/default-avatar.png'} className="w-9 h-9 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{comment.author.first_name} {comment.author.last_name}</span>
                    <span className="text-xs text-white/50">@{comment.author.username}</span>
                  </div>

                  <p className="text-[15px] leading-relaxed mt-1 text-[#e8ecf8]">{comment.text}</p>

                  <div className="flex items-center gap-5 mt-2 text-xs text-white/50">
                    <button className="flex items-center gap-1 hover:text-white transition-colors">
                      <span>❤️</span> 
                    </button>
                    <button onClick={() => setReplyTo(comment)} className="hover:text-white">Ответить</button>

                    {comment.has_replies && comment.reply_count > 0 && !expandedThreads[comment.id] && (
                      <button 
                        onClick={() => loadReplies(comment.id)}
                        className="text-[#8b7fe8] hover:underline font-medium"
                      >
                        Показать {comment.reply_count} ответов
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Ответы (с отступом) */}
              {expandedThreads[comment.id] && (
                <div className="ml-12 mt-4 space-y-5 border-l border-white/10 pl-4">
                  {expandedThreads[comment.id].map(reply => (
                    <div key={reply.id} className="flex gap-3">
                      <img src={reply.author.avatar_url || '/default-avatar.png'} className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{reply.author.first_name} {reply.author.last_name}</span>
                          <span className="text-xs text-white/50">@{reply.author.username}</span>
                        </div>
                        <p className="text-[15px] leading-relaxed mt-0.5">{reply.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Поле ввода */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-[#0a0d1a] sticky bottom-0">
          {replyTo && (
            <div className="mb-2 text-[#8b7fe8] text-sm">
              Ответ на @{replyTo.author.username}
              <button type="button" onClick={() => setReplyTo(null)} className="ml-2 underline text-xs">отменить</button>
            </div>
          )}

          <div className="flex gap-3">
            <img src={me?.avatar_url || ''} className="w-8 h-8 rounded-full" />
            <input
              value={newCommentText}
              onChange={e => setNewCommentText(e.target.value)}
              placeholder={replyTo ? "Напишите ответ..." : "Напишите комментарий..."}
              className="flex-1 bg-[#121827] border border-white/10 rounded-2xl px-4 py-3 focus:border-[#8b7fe8] outline-none text-[15px]"
            />
            <button 
              type="submit" 
              disabled={!newCommentText.trim()}
              className="bg-[#8b7fe8] hover:bg-[#7a6ed9] disabled:opacity-50 px-6 rounded-2xl font-medium"
            >
              Отпр.
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}