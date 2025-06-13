import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Server, 
  Database, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Settings as SettingsIcon,
  Trash2,
  Star,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react'
import { useLocalServers } from '@/hooks/useLocalServers'
import { useBackendConfig } from '@/hooks/useBackendConfig'
import toast from 'react-hot-toast'

// Server Info Display Component
function ServerInfoCard({ serverInfo }: { serverInfo: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Version</h4>
          <p className="text-lg font-semibold">{serverInfo.server.version}</p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Platform</h4>
          <p className="text-lg font-semibold">{serverInfo.server.platform}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-600">Database Statistics</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{serverInfo.database.statistics.spaces}</p>
            <p className="text-xs text-blue-600">Spaces</p>
          </div>
          <div className="bg-purple-50 rounded p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{serverInfo.database.statistics.endpoints}</p>
            <p className="text-xs text-purple-600">Endpoints</p>
          </div>
          <div className="bg-green-50 rounded p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{serverInfo.database.statistics.parameters}</p>
            <p className="text-xs text-green-600">Parameters</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-600">Features</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(serverInfo.features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center gap-2">
              {enabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className={enabled ? 'text-gray-700' : 'text-gray-400'}>
                {feature.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
          ))}
        </div>
        {serverInfo.websocket.available && (
          <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1">
              {serverInfo.websocket.enabled ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-gray-400" />
              )}
              WebSocket {serverInfo.websocket.enabled ? 'enabled' : 'disabled'}
            </span>
            <span>{serverInfo.websocket.connectedClients} active connection(s)</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsLocal() {
  const { 
    servers, 
    loading: loadingServers, 
    addServer, 
    updateServer, 
    deleteServer, 
    setDefaultServer, 
    testServer,
    getDefaultServer
  } = useLocalServers()
  
  const { backendUrl, saveBackendUrl } = useBackendConfig()
  
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [isAddingServer, setIsAddingServer] = useState(false)
  const [newServerUrl, setNewServerUrl] = useState('')
  const [newServerName, setNewServerName] = useState('')
  const [testingServerId, setTestingServerId] = useState<string | null>(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  
  // WebSocket preference
  const [useWebSocket, setUseWebSocket] = useState(false)

  // Load WebSocket preference (default to true for new users)
  useEffect(() => {
    const savedPref = localStorage.getItem('useWebSocket')
    if (savedPref === null) {
      // First time user - enable WebSocket by default
      setUseWebSocket(true)
      localStorage.setItem('useWebSocket', 'true')
    } else {
      setUseWebSocket(savedPref === 'true')
    }
  }, [])

  // Select current server on load
  useEffect(() => {
    if (!loadingServers && servers.length > 0 && !selectedServerId) {
      // Find server matching current backend URL
      const currentServer = servers.find(s => s.url === backendUrl)
      if (currentServer) {
        setSelectedServerId(currentServer.id)
      } else {
        // Select default server
        const defaultServer = getDefaultServer()
        if (defaultServer) {
          setSelectedServerId(defaultServer.id)
        }
      }
    }
  }, [servers, loadingServers, selectedServerId, backendUrl, getDefaultServer])

  // Auto-fetch server info for current server when page loads
  useEffect(() => {
    const fetchCurrentServerInfo = async () => {
      if (!loadingServers && servers.length > 0 && backendUrl) {
        const currentServer = servers.find(s => s.url === backendUrl)
        if (currentServer && !currentServer.serverInfo && !testingServerId) {
          setTestingServerId(currentServer.id)
          try {
            const testResult = await testServer(currentServer.url)
            
            if (testResult.connected) {
              // Update server with latest info
              updateServer(currentServer.id, {
                serverInfo: testResult.serverInfo,
                lastConnected: new Date().toISOString()
              })
            }
          } catch (error) {
            console.error('Failed to fetch current server info:', error)
          } finally {
            setTestingServerId(null)
          }
        }
      }
    }
    
    fetchCurrentServerInfo()
  }, [loadingServers, servers.length, backendUrl])

  const handleAddServer = async () => {
    if (!newServerUrl || !newServerUrl.startsWith('http')) {
      toast.error('Please enter a valid server URL')
      return
    }

    setIsTestingConnection(true)
    try {
      // Test connection first
      const testResult = await testServer(newServerUrl)
      
      if (!testResult.connected) {
        toast.error(`Connection failed: ${testResult.error}`)
        return
      }

      // Add server with test results
      const url = new URL(newServerUrl)
      const name = newServerName || `${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`
      
      const newServer = addServer({
        url: newServerUrl.replace(/\/+$/, ''),
        name,
        serverInfo: testResult.serverInfo,
        lastConnected: new Date().toISOString()
      })
      
      setSelectedServerId(newServer.id)
      setIsAddingServer(false)
      setNewServerUrl('')
      setNewServerName('')
      
      toast.success(`Connected to ${name} in ${testResult.responseTime}ms`)
    } catch (error) {
      toast.error('Failed to add server')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleTestConnection = async (serverId: string) => {
    const server = servers.find(s => s.id === serverId)
    if (!server) return

    setTestingServerId(serverId)
    try {
      const testResult = await testServer(server.url)
      
      if (testResult.connected) {
        // Update server with latest info
        updateServer(serverId, {
          serverInfo: testResult.serverInfo,
          lastConnected: new Date().toISOString()
        })
        toast.success(`Connected in ${testResult.responseTime}ms`)
      } else {
        toast.error(`Connection failed: ${testResult.error}`)
      }
    } catch (error) {
      toast.error('Failed to test connection')
    } finally {
      setTestingServerId(null)
    }
  }

  const handleSetDefault = (serverId: string) => {
    const server = servers.find(s => s.id === serverId)
    if (!server) return

    setDefaultServer(serverId)
    saveBackendUrl(server.url)
    toast.success('Default server updated. Reloading...')
    
    // Reload page to apply new default
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  const handleDeleteServer = (serverId: string) => {
    try {
      deleteServer(serverId)
      
      // Select default server after deletion
      const defaultServer = getDefaultServer()
      if (defaultServer) {
        setSelectedServerId(defaultServer.id)
      }
      
      toast.success('Server removed')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete server')
    }
  }

  const handleWebSocketToggle = (enabled: boolean) => {
    setUseWebSocket(enabled)
    localStorage.setItem('useWebSocket', String(enabled))
    
    toast.success(enabled ? 'Real-time updates enabled' : 'Real-time updates disabled')
    
    // Emit event for other components
    window.dispatchEvent(new CustomEvent('websocket-preference-changed', { 
      detail: { enabled, available: true } 
    }))
  }

  const selectedServer = servers.find(s => s.id === selectedServerId)

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Server List */}
      <div className="w-80 border-r bg-gray-50 dark:bg-gray-900 p-4 space-y-2">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Backend Servers
        </h2>
        
        {loadingServers ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {servers.map(server => (
              <button
                key={server.id}
                onClick={() => setSelectedServerId(server.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedServerId === server.id
                    ? 'bg-white dark:bg-gray-800 border-2 border-blue-500 shadow-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{server.name}</span>
                      {server.isDefault && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {server.url === backendUrl && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{server.url}</div>
                    {server.serverInfo && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        v{server.serverInfo.server.version} • {server.serverInfo.database.statistics.spaces} spaces
                      </div>
                    )}
                  </div>
                  {server.serverInfo?.websocket.available && (
                    <div className="ml-2">
                      <div className={`w-2 h-2 rounded-full ${
                        server.serverInfo.websocket.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    </div>
                  )}
                </div>
              </button>
            ))}
            
            {/* Add Server Button */}
            {!isAddingServer ? (
              <button
                onClick={() => setIsAddingServer(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Server
              </button>
            ) : (
              <Card className="p-3 space-y-3">
                <input
                  type="text"
                  placeholder="Server URL"
                  value={newServerUrl}
                  onChange={(e) => setNewServerUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-800"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-800"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddServer}
                    disabled={isTestingConnection}
                    className="flex-1"
                  >
                    {isTestingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingServer(false)
                      setNewServerUrl('')
                      setNewServerName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Right Content - Server Details */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedServer ? (
          <div className="max-w-4xl space-y-6">
            {/* Server Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {selectedServer.name}
                  {selectedServer.isDefault && (
                    <span className="text-sm font-normal bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                  {selectedServer.url === backendUrl && (
                    <span className="text-sm font-normal bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                      Active
                    </span>
                  )}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedServer.url}</p>
              </div>
              
              <div className="flex gap-2">
                {!selectedServer.isDefault && (
                  <Button
                    onClick={() => handleSetDefault(selectedServer.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Set as Default
                  </Button>
                )}
                <Button
                  onClick={() => handleTestConnection(selectedServer.id)}
                  variant="outline"
                  size="sm"
                  disabled={testingServerId === selectedServer.id}
                >
                  {testingServerId === selectedServer.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Test
                </Button>
                {servers.length > 1 && (
                  <Button
                    onClick={() => handleDeleteServer(selectedServer.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Server Info */}
            {selectedServer.serverInfo ? (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Server Information
                  </h3>
                  {selectedServer.lastConnected && (
                    <span className="text-xs text-gray-500">
                      Last updated: {new Date(selectedServer.lastConnected).toLocaleString()}
                    </span>
                  )}
                </div>
                <ServerInfoCard serverInfo={selectedServer.serverInfo} />
              </Card>
            ) : testingServerId === selectedServer.id ? (
              <Card className="p-8">
                <div className="text-center text-gray-500">
                  <Loader2 className="h-12 w-12 mx-auto mb-2 text-gray-400 animate-spin" />
                  <p>Fetching server information...</p>
                </div>
              </Card>
            ) : (
              <Card className="p-8">
                <div className="text-center text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No server information available</p>
                  <Button
                    onClick={() => handleTestConnection(selectedServer.id)}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Fetch Server Info
                  </Button>
                </div>
              </Card>
            )}

            {/* General Settings */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                General Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Real-time Updates</label>
                    <p className="text-sm text-gray-600">Use WebSocket for instant updates when available</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={useWebSocket}
                    onChange={(e) => handleWebSocketToggle(e.target.checked)}
                    className="h-4 w-4"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Theme</label>
                    <p className="text-sm text-gray-600">Choose your preferred theme</p>
                  </div>
                  <select className="px-3 py-1 border rounded dark:bg-gray-800">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {loadingServers ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              'Select a server from the list'
            )}
          </div>
        )}
      </div>
    </div>
  )
}