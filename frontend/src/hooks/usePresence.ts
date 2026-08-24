import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'

const PING_INTERVAL_MS = 30_000

export function usePresence() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    let disposed = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let startTimer: ReturnType<typeof setTimeout> | null = null

    const stopPing = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const cleanupSocket = () => {
      stopPing()
      if (!wsRef.current) return
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onopen = null
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }
      wsRef.current = null
    }

    const openConnection = () => {
      if (disposed) return
      if (!useAuthStore.getState().isAuthenticated) return
      cleanupSocket()

      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const url = `${proto}://${window.location.host}/api/v1/presense/ws`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        ws.send('ping')
        intervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping')
        }, PING_INTERVAL_MS)
      }

      ws.onclose = () => {
        wsRef.current = null
        stopPing()
        if (disposed) return
        reconnectTimer = setTimeout(openConnection, 3_000)
      }

      ws.onerror = () => { }
    }

    startTimer = setTimeout(openConnection, 50)

    return () => {
      disposed = true
      if (startTimer) clearTimeout(startTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      cleanupSocket()
    }
  }, [isAuthenticated])
}
