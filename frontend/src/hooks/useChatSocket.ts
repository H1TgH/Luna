import { useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import type { ChatMessageResponse } from '../types'

type ChatWsHandlers = {
  onMessageCreated?: (msg: ChatMessageResponse) => void
  onMessageUpdated?: (msg: ChatMessageResponse) => void
  onMessageDeleted?: (messageId: string) => void
  onMessageRead?: (messageId: string, readerId?: string) => void
  onUserTyping?: (userId: string) => void
  onChatRenamed?: (name: string) => void
}

export function useChatSocket(chatId: string | null, handlers: ChatWsHandlers = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const chatIdRef = useRef(chatId)
  chatIdRef.current = chatId

  const send = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
      return true
    }
    return false
  }, [])

  useEffect(() => {
    if (!chatId || !isAuthenticated) return

    let disposed = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let startTimer: ReturnType<typeof setTimeout> | null = null

    const cleanupSocket = () => {
      if (!wsRef.current) return
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }
      wsRef.current = null
    }

    const connect = () => {
      if (disposed) return
      if (!useAuthStore.getState().isAuthenticated) return

      const id = chatIdRef.current
      if (!id) return

      cleanupSocket()

      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const url = `${proto}://${window.location.host}/api/v1/chats/ws/${id}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          const h = handlersRef.current
          const { event_type, ...rest } = data

          if (event_type === 'message_created') {
            h.onMessageCreated?.(rest as ChatMessageResponse)
          } else if (event_type === 'message_updated') {
            h.onMessageUpdated?.(rest as ChatMessageResponse)
          } else if (event_type === 'message_deleted_for_all') {
            h.onMessageDeleted?.(data.message_id)
          } else if (event_type === 'message_read') {
            h.onMessageRead?.(data.message_id, data.reader_id)
          } else if (event_type === 'user_typing') {
            h.onUserTyping?.(data.user_id)
          } else if (event_type === 'chat_renamed') {
            h.onChatRenamed?.(data.new_chat_name)
          }
        } catch { }
      }

      ws.onclose = () => {
        wsRef.current = null
        if (disposed) return
        reconnectTimer = setTimeout(connect, 3_000)
      }

      ws.onerror = () => { }
    }

    startTimer = setTimeout(connect, 50)

    return () => {
      disposed = true
      if (startTimer) clearTimeout(startTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      cleanupSocket()
    }
  }, [chatId, isAuthenticated])

  return { send }
}
