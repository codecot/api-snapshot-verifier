import { useState, useEffect } from 'react'
import { ServerInfo } from '@/config'

export interface LocalServer {
  id: string
  url: string
  name: string
  description?: string
  isDefault: boolean
  lastConnected?: string
  serverInfo?: ServerInfo
  environment?: string
}

export interface ServerTestResult {
  connected: boolean
  responseTime: number
  error?: string
  serverInfo?: ServerInfo
}

const STORAGE_KEY = 'api-snapshot-saved-servers'

export function useLocalServers() {
  const [servers, setServers] = useState<LocalServer[]>([])
  const [loading, setLoading] = useState(true)

  // Load servers from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setServers(parsed)
      } else {
        // Initialize with default server
        const defaultServer: LocalServer = {
          id: 'default-local',
          url: 'http://localhost:3301',
          name: 'Local Development',
          isDefault: true,
          environment: 'development'
        }
        setServers([defaultServer])
        localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultServer]))
      }
    } catch (error) {
      console.error('Failed to load servers from localStorage:', error)
      // Fallback to default
      setServers([{
        id: 'default-local',
        url: 'http://localhost:3301',
        name: 'Local Development',
        isDefault: true,
        environment: 'development'
      }])
    } finally {
      setLoading(false)
    }
  }, [])

  // Save servers to localStorage whenever they change
  const saveServers = (newServers: LocalServer[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newServers))
      setServers(newServers)
    } catch (error) {
      console.error('Failed to save servers:', error)
      throw new Error('Failed to save server configuration')
    }
  }

  // Add a new server
  const addServer = (server: Omit<LocalServer, 'id'>) => {
    const newServer: LocalServer = {
      ...server,
      id: `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isDefault: server.isDefault || false
    }
    
    // If this is set as default, unset other defaults
    let updatedServers = [...servers]
    if (newServer.isDefault) {
      updatedServers = updatedServers.map(s => ({ ...s, isDefault: false }))
    }
    
    saveServers([...updatedServers, newServer])
    return newServer
  }

  // Update a server
  const updateServer = (id: string, updates: Partial<LocalServer>) => {
    const updatedServers = servers.map(server => 
      server.id === id ? { ...server, ...updates } : server
    )
    saveServers(updatedServers)
  }

  // Delete a server
  const deleteServer = (id: string) => {
    const server = servers.find(s => s.id === id)
    if (server?.isDefault) {
      throw new Error('Cannot delete the default server')
    }
    const updatedServers = servers.filter(s => s.id !== id)
    saveServers(updatedServers)
  }

  // Set default server
  const setDefaultServer = (id: string) => {
    const updatedServers = servers.map(server => ({
      ...server,
      isDefault: server.id === id
    }))
    saveServers(updatedServers)
  }

  // Test server connection
  const testServer = async (serverUrl: string): Promise<ServerTestResult> => {
    const startTime = Date.now()
    
    try {
      const cleanUrl = serverUrl.replace(/\/+$/, '')
      const serverInfoUrl = `${cleanUrl}/api/config/server-info`
      
      const response = await fetch(serverInfoUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          return {
            connected: true,
            responseTime,
            serverInfo: data.data
          }
        }
      }

      return {
        connected: false,
        responseTime,
        error: `Server responded with ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            connected: false,
            responseTime,
            error: 'Connection timeout - is the backend running?'
          }
        }
        return {
          connected: false,
          responseTime,
          error: error.message
        }
      }
      
      return {
        connected: false,
        responseTime,
        error: 'Failed to connect to server'
      }
    }
  }

  // Get default server
  const getDefaultServer = () => servers.find(s => s.isDefault)

  // Get server by URL
  const getServerByUrl = (url: string) => servers.find(s => s.url === url)

  return {
    servers,
    loading,
    addServer,
    updateServer,
    deleteServer,
    setDefaultServer,
    testServer,
    getDefaultServer,
    getServerByUrl
  }
}