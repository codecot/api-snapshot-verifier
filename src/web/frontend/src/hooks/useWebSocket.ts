import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getCurrentBackendUrl } from '@/config'

export interface WebSocketConfig {
  enabled: boolean
  available: boolean
}

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [config, setConfig] = useState<WebSocketConfig>({
    enabled: false,
    available: false
  })

  // Load config from localStorage and check availability
  useEffect(() => {
    const loadConfig = () => {
      const savedPref = localStorage.getItem('useWebSocket')
      const enabled = savedPref === 'true'
      
      // For now, we'll assume it's available if enabled
      // The Settings page will handle the actual availability check
      setConfig({
        enabled,
        available: enabled
      })
    }

    loadConfig()

    // Listen for preference changes
    const handlePreferenceChange = (event: CustomEvent) => {
      setConfig({
        enabled: event.detail.enabled,
        available: event.detail.available
      })
    }

    window.addEventListener('websocket-preference-changed' as any, handlePreferenceChange)
    return () => {
      window.removeEventListener('websocket-preference-changed' as any, handlePreferenceChange)
    }
  }, [])

  // Connect/disconnect based on config
  useEffect(() => {
    if (config.enabled && config.available) {
      // Connect to WebSocket
      const socketUrl = getCurrentBackendUrl()
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      })

      newSocket.on('connect', () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      })

      newSocket.on('disconnect', () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
        setSocket(null)
        setIsConnected(false)
      }
    } else {
      // Ensure disconnected
      if (socket) {
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [config.enabled, config.available])

  const joinRoom = useCallback((room: string) => {
    if (socket && isConnected) {
      socket.emit(`join:${room}`)
    }
  }, [socket, isConnected])

  const leaveRoom = useCallback((room: string) => {
    if (socket && isConnected) {
      socket.emit(`leave:${room}`)
    }
  }, [socket, isConnected])

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, handler)
      return () => {
        socket.off(event, handler)
      }
    }
    return () => {}
  }, [socket])

  return {
    socket,
    isConnected,
    isEnabled: config.enabled && config.available,
    joinRoom,
    leaveRoom,
    on
  }
}