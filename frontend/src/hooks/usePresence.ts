import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'

const PING_INTERVAL_MS = 30_000

export function usePresence() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!accessToken) {
      cleanup()
      return
    }

    openConnection(accessToken)

    return () => {
      cleanup()
    }
  }, [accessToken])

  function openConnection(token: string) {
    cleanup()

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    const url = `${proto}://${host}/api/v1/presense/ws?token=${token}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send('ping')

      intervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, PING_INTERVAL_MS)
    }

    ws.onclose = () => {
      cleanup()

      setTimeout(() => {
        const currentToken = useAuthStore.getState().accessToken
        if (currentToken) {
          openConnection(currentToken)
        }
      }, 5_000)
    }

    ws.onerror = () => {
    }
  }

  function cleanup() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
  }
}