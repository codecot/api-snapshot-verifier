import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useWebSocket } from '@/contexts/WebSocketContext'
import apiClient from '@/api/client'

export interface SpaceInfo {
  name: string
  endpoint_count: number
}

export interface SpaceConfig {
  currentSpace: string
  availableSpaces: string[]
  spacesInfo: SpaceInfo[]
  isLoading: boolean
  error: string | null
  switchSpace: (space: string) => void
  createSpace: (space: string, config?: any) => Promise<void>
  deleteSpace: (space: string) => Promise<void>
  shareUrl: string
  generateShareUrl: (space?: string) => string
}

const STORAGE_KEY = 'api-snapshot-current-space'

export function useSpaceConfig(): SpaceConfig {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSpace = searchParams.get('space')
  const [currentSpace, setCurrentSpace] = useState(() => {
    // Check URL first, then localStorage
    const storedSpace = localStorage.getItem(STORAGE_KEY)
    const initialSpace = urlSpace || storedSpace || 'default'
    console.log('🔧 SpaceConfig init:', { urlSpace, storedSpace, initialSpace })
    return initialSpace
  })
  const [error, setError] = useState<string | null>(null)
  const { socket } = useWebSocket()
  
  // Update current space when URL changes
  useEffect(() => {
    if (urlSpace && urlSpace !== currentSpace) {
      console.log('🔧 URL space changed:', { urlSpace, currentSpace })
      setCurrentSpace(urlSpace)
    }
  }, [urlSpace, currentSpace])

  // Fetch available spaces
  const { data: spacesResponse, isLoading, refetch } = useQuery({
    queryKey: ['spaces'],
    queryFn: async () => {
      const response = await apiClient.get('/config/spaces')
      return response.data
    },
    retry: 1,
    refetchOnWindowFocus: true, // Auto-refresh on window focus
    refetchInterval: 10000, // Auto-refresh every 10 seconds for more responsive updates
  })

  const spacesInfo: SpaceInfo[] = spacesResponse?.data || []
  const availableSpaces = spacesInfo.map(s => s.name)
  
  // Listen for WebSocket events to refresh spaces
  useEffect(() => {
    if (!socket) return
    
    const handleEndpointChange = () => {
      console.log('🔧 Endpoint changed, refreshing spaces')
      refetch()
    }
    
    // Listen for endpoint events
    socket.on('endpoint:created', handleEndpointChange)
    socket.on('endpoint:updated', handleEndpointChange)
    socket.on('endpoint:deleted', handleEndpointChange)
    
    return () => {
      socket.off('endpoint:created', handleEndpointChange)
      socket.off('endpoint:updated', handleEndpointChange)
      socket.off('endpoint:deleted', handleEndpointChange)
    }
  }, [socket, refetch])

  // Update localStorage when current space changes
  useEffect(() => {
    // Only update localStorage if the space actually exists
    if (availableSpaces.includes(currentSpace) || availableSpaces.length === 0) {
      localStorage.setItem(STORAGE_KEY, currentSpace)
    }
  }, [currentSpace, availableSpaces])

  // Check if current space exists in available spaces
  useEffect(() => {
    if (availableSpaces.length > 0 && !availableSpaces.includes(currentSpace)) {
      console.log('🔧 Space validation:', { currentSpace, availableSpaces, urlSpace })
      // Only reset if there's no URL parameter forcing a specific space
      if (!urlSpace) {
        // Current space doesn't exist, switch to first available or default
        const newSpace = availableSpaces.includes('default') ? 'default' : availableSpaces[0]
        console.log('🔧 Switching to available space:', newSpace)
        setCurrentSpace(newSpace)
      }
    }
  }, [availableSpaces, currentSpace, urlSpace])

  const switchSpace = (space: string) => {
    setCurrentSpace(space)
    setError(null)
    // Update URL parameters
    const newParams = new URLSearchParams(searchParams)
    newParams.set('space', space)
    setSearchParams(newParams, { replace: true })
  }

  const createSpace = async (space: string, config?: any) => {
    try {
      await apiClient.post('/config/spaces', { space, config })
      await refetch() // Refresh spaces list
      setError(null)
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create space'
      setError(message)
      throw new Error(message)
    }
  }

  const deleteSpace = async (space: string) => {
    try {
      await apiClient.delete(`/config/spaces/${space}`)
      await refetch() // Refresh spaces list
      
      // If we deleted the current space, switch to default or first available
      if (space === currentSpace) {
        const remainingSpaces = availableSpaces.filter(s => s !== space)
        const newSpace = remainingSpaces.includes('default') ? 'default' : remainingSpaces[0] || 'default'
        setCurrentSpace(newSpace)
      }
      
      setError(null)
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete space'
      setError(message)
      throw new Error(message)
    }
  }

  const generateShareUrl = (space?: string) => {
    const url = new URL(window.location.href)
    const params = new URLSearchParams()
    
    // Add space parameter
    params.set('space', space || currentSpace)
    
    // Add backend URL if it's different from default
    const backendUrl = localStorage.getItem('api-snapshot-backend-url')
    if (backendUrl && backendUrl !== 'http://localhost:3301') {
      params.set('backend', backendUrl)
    }
    
    url.search = params.toString()
    return url.toString()
  }

  const shareUrl = generateShareUrl()

  return {
    currentSpace,
    availableSpaces,
    spacesInfo,
    isLoading,
    error,
    switchSpace,
    createSpace,
    deleteSpace,
    shareUrl,
    generateShareUrl
  }
}