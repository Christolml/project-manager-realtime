import { useEffect } from 'react'
import { wsClient } from '../lib/ws'
import { useAuth } from './useAuth'

export function useWebSocket() {
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
    wsClient.connect(token)
    return () => wsClient.disconnect()
  }, [token])

  return wsClient
}
