import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useBackendConfig } from '@/hooks/useBackendConfig'
import toast from '@/components/ui/toast'

interface CaptureStartedEvent {
  space: string
  endpoints: string[]
  timestamp: string
}

interface CaptureProgressEvent {
  space: string
  endpoint: string
  status: 'started' | 'completed' | 'failed'
  total: number
  completed: number
  failed: number
  timestamp: string
}

interface CaptureCompleteEvent {
  space: string
  results: Array<{
    endpoint: string
    success: boolean
    snapshotId?: string
    timestamp?: string
    error?: string
  }>
  successful: number
  failed: number
  timestamp: string
}

interface CaptureErrorEvent {
  space: string
  error: string
  timestamp: string
}

interface WebSocketContextType {
  socket: Socket | null
  isConnected: boolean
  isReconnecting: boolean
  reconnectAttempts: number
  maxReconnectAttempts: number
  captureEvents: {
    onCaptureStarted: (callback: (event: CaptureStartedEvent) => void) => void
    onCaptureProgress: (callback: (event: CaptureProgressEvent) => void) => void
    onCaptureComplete: (callback: (event: CaptureCompleteEvent) => void) => void
    onCaptureError: (callback: (event: CaptureErrorEvent) => void) => void
    offCaptureStarted: (callback: (event: CaptureStartedEvent) => void) => void
    offCaptureProgress: (callback: (event: CaptureProgressEvent) => void) => void
    offCaptureComplete: (callback: (event: CaptureCompleteEvent) => void) => void
    offCaptureError: (callback: (event: CaptureErrorEvent) => void) => void
  }
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
  manualReconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [webSocketEnabled, setWebSocketEnabled] = useState(false)
  const maxReconnectAttempts = 10
  const { backendUrl } = useBackendConfig()
  
  // Check if WebSocket is enabled by user preference
  useEffect(() => {
    const checkPreference = () => {
      const savedPref = localStorage.getItem('useWebSocket')
      if (savedPref === null) {
        // First time user - enable WebSocket by default
        setWebSocketEnabled(true)
        localStorage.setItem('useWebSocket', 'true')
      } else {
        setWebSocketEnabled(savedPref === 'true')
      }
    }
    
    checkPreference()
    
    // Listen for preference changes
    const handlePreferenceChange = (event: CustomEvent) => {
      setWebSocketEnabled(event.detail.enabled)
    }
    
    window.addEventListener('websocket-preference-changed' as any, handlePreferenceChange)
    return () => {
      window.removeEventListener('websocket-preference-changed' as any, handlePreferenceChange)
    }
  }, [])
  
  // Debug backend config
  console.log('🔍 WebSocket Provider - Backend Config:', { 
    backendUrl,
    webSocketEnabled,
    currentPageOrigin: window.location.origin,
    shouldMatch: 'These should be the same for no CORS issues'
  })

  useEffect(() => {
    if (!backendUrl) {
      console.log('🔍 WebSocket: No backend URL available yet')
      return
    }

    if (!webSocketEnabled) {
      console.log('🔍 WebSocket: Disabled by user preference')
      // Clean up any existing connection
      if (socket) {
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    console.log('🔍 WebSocket: Attempting to connect to:', backendUrl)

    // Run connection diagnostics
    const runDiagnostics = async () => {
      console.log('🔍 Running WebSocket diagnostics...')
      
      // Test if the HTTP server is reachable
      try {
        const response = await fetch(`${backendUrl}/health`, { 
          method: 'GET',
          mode: 'cors'
        })
        console.log('✅ HTTP server reachable:', response.status, response.statusText)
      } catch (httpError) {
        console.error('❌ HTTP server not reachable:', httpError)
      }
      
      // Check Socket.IO endpoint
      try {
        const socketResponse = await fetch(`${backendUrl}/socket.io/`, {
          method: 'GET',
          mode: 'cors'
        })
        console.log('✅ Socket.IO endpoint reachable:', socketResponse.status)
      } catch (socketError) {
        console.error('❌ Socket.IO endpoint not reachable:', socketError)
      }
    }
    
    runDiagnostics()

    // Create socket connection with enhanced reconnection
    const newSocket = io(backendUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Never stop trying
      timeout: 20000,
      forceNew: true,
      // Suppress internal Socket.IO error logging
      logger: false
    })

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('🔗 WebSocket connected:', newSocket.id)
      setIsConnected(true)
      setIsReconnecting(false)
      setReconnectAttempts(0)
      
      // Join relevant rooms for real-time updates
      newSocket.emit('join:snapshots')
      newSocket.emit('join:comparisons')
      
      // Dismiss any pending reconnection toasts
      toast.dismiss('manual-reconnect')
      toast.dismiss('reconnecting')
      
      // Show success message if this was a reconnection
      if (reconnectAttempts > 0) {
        toast.success('🔗 Connection restored!')
      }
    })

    // Debug all incoming events
    newSocket.onAny((eventName, ...args) => {
      console.log('📡 WebSocket event:', eventName, args)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason)
      setIsConnected(false)
      
      // Show user-friendly disconnect message
      if (reason === 'io server disconnect') {
        toast.error('📡 Server disconnected - attempting to reconnect...')
      } else if (reason === 'transport close') {
        toast.error('📡 Connection lost - attempting to reconnect...')
      }
    })

    newSocket.on('connect_error', (error) => {
      // Suppress the verbose error, just log our clean version
      console.group('🚫 WebSocket Connection Failed')
      
      // Isolate specific error types
      let errorType = 'Unknown'
      let userMessage = 'Connection failed'
      
      if (error.message?.includes('xhr poll error')) {
        errorType = 'Server Unreachable'
        userMessage = 'Cannot connect to server - server may be down'
        
        console.error('🎯 Issue: Server is not responding')
        console.error('🔍 Details:', {
          trying: backendUrl,
          currentPage: window.location.origin,
          sameOrigin: backendUrl === window.location.origin
        })
        console.error('💡 Solution: Check if server is running on the correct port')
      } else if (error.message?.includes('timeout')) {
        errorType = 'Timeout'
        userMessage = 'Server took too long to respond'
        console.error('🎯 Issue: Connection timeout')
      } else if (error.message?.includes('refused')) {
        errorType = 'Connection Refused'
        userMessage = 'Server refused connection'
        console.error('🎯 Issue: Server actively refused connection')
      } else {
        console.error('🎯 Raw error:', error.message)
      }
      
      console.error(`📋 Summary: ${errorType} - ${userMessage}`)
      console.groupEnd()
      
      setIsConnected(false)
      setIsReconnecting(false)
    })

    newSocket.on('reconnecting', (attemptNumber) => {
      console.log('🔄 Attempting to reconnect... (attempt', attemptNumber, ')')
      setIsReconnecting(true)
      setReconnectAttempts(attemptNumber)
      
      if (attemptNumber === 1) {
        toast.loading('🔄 Reconnecting...', { id: 'reconnecting' })
      }
    })

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
      setIsReconnecting(false)
      setReconnectAttempts(0)
      toast.dismiss('reconnecting')
      toast.success('🔗 Connection restored!')
    })

    newSocket.on('reconnect_error', (error) => {
      console.error('🔄❌ WebSocket reconnection failed:', error)
      // Don't show error for each attempt, just log it
    })

    newSocket.on('reconnect_failed', () => {
      console.error('🔄💀 WebSocket reconnection failed permanently')
      setIsReconnecting(false)
      toast.dismiss('reconnecting')
      toast.error('❌ Connection lost permanently. Please refresh the page.', {
        duration: 0, // Don't auto-dismiss
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload()
        }
      })
    })

    setSocket(newSocket)

    // Periodic connection check - try to reconnect if disconnected
    const connectionCheck = setInterval(() => {
      if (!newSocket.connected && !newSocket.connecting) {
        console.log('🔄 Periodic reconnection check - attempting to reconnect...')
        newSocket.connect()
      }
    }, 10000) // Check every 10 seconds

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket connection')
      clearInterval(connectionCheck)
      newSocket.disconnect()
    }
  }, [backendUrl, webSocketEnabled])

  // Event listener helpers
  const captureEvents = {
    onCaptureStarted: useCallback((callback: (event: CaptureStartedEvent) => void) => {
      socket?.on('capture:started', callback)
    }, [socket]),

    onCaptureProgress: useCallback((callback: (event: CaptureProgressEvent) => void) => {
      socket?.on('capture:progress', callback)
    }, [socket]),

    onCaptureComplete: useCallback((callback: (event: CaptureCompleteEvent) => void) => {
      socket?.on('capture:complete', callback)
    }, [socket]),

    onCaptureError: useCallback((callback: (event: CaptureErrorEvent) => void) => {
      socket?.on('capture:error', callback)
    }, [socket]),

    offCaptureStarted: useCallback((callback: (event: CaptureStartedEvent) => void) => {
      socket?.off('capture:started', callback)
    }, [socket]),

    offCaptureProgress: useCallback((callback: (event: CaptureProgressEvent) => void) => {
      socket?.off('capture:progress', callback)
    }, [socket]),

    offCaptureComplete: useCallback((callback: (event: CaptureCompleteEvent) => void) => {
      socket?.off('capture:complete', callback)
    }, [socket]),

    offCaptureError: useCallback((callback: (event: CaptureErrorEvent) => void) => {
      socket?.off('capture:error', callback)
    }, [socket]),
  }

  const joinRoom = useCallback((room: string) => {
    socket?.emit(`join:${room}`)
  }, [socket])

  const leaveRoom = useCallback((room: string) => {
    socket?.emit(`leave:${room}`)
  }, [socket])

  const manualReconnect = useCallback(() => {
    console.log('🔄 Manual reconnection initiated...', {
      socketExists: !!socket,
      socketConnected: socket?.connected,
      socketId: socket?.id,
      backendUrl
    })
    
    if (!socket) {
      console.error('❌ No socket instance available for manual reconnect')
      return
    }
    
    if (socket.connected) {
      console.log('✅ Socket already connected, no reconnection needed')
      return
    }
    
    setIsReconnecting(true)
    toast.loading('🔄 Attempting to reconnect...', { id: 'manual-reconnect' })
    
    // Force a fresh connection attempt
    console.log('🔄 Forcing socket disconnect and reconnect...')
    socket.disconnect()
    
    setTimeout(() => {
      console.log('🔄 Initiating socket connect...')
      socket.connect()
    }, 500)
  }, [socket, backendUrl])

  const value: WebSocketContextType = {
    socket,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    captureEvents,
    joinRoom,
    leaveRoom,
    manualReconnect,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

// Specific hooks for easier usage
export function useCaptureEvents() {
  const { captureEvents, isConnected, isReconnecting, reconnectAttempts, manualReconnect } = useWebSocket()
  return { ...captureEvents, isConnected, isReconnecting, reconnectAttempts, manualReconnect }
}