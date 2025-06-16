import { useState, useEffect } from 'react'
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
  Lock,
  Unlock,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { 
  getCurrentBackendUrl, 
  saveBackendUrl, 
  validateBackendUrl, 
  testBackendConnection,
  type ServerInfo
} from '@/config'
import { toast } from '@/components/ui/toast'
import { PageLayout, PageHeader, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/design-system/components'

interface SavedServer {
  id: string
  url: string
  name: string
  isDefault: boolean
  isLocked?: boolean
  lastConnected?: Date
  serverInfo?: ServerInfo
}

// Server Info Display Component
function ServerInfoCard({ serverInfo }: { serverInfo: ServerInfo }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Version</h4>
          <p className="text-lg font-semibold">{serverInfo.server.version}</p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Platform</h4>
          <p className="text-lg font-semibold">{serverInfo.server.platform}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Database Statistics</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{serverInfo.database.statistics.spaces}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Spaces</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-3 text-center">
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{serverInfo.database.statistics.endpoints}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">Endpoints</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{serverInfo.database.statistics.parameters}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Parameters</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Features</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(serverInfo.features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center gap-2">
              {enabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={enabled ? 'text-foreground' : 'text-muted-foreground'}>
                {feature.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SettingsNew() {
  const [servers, setServers] = useState<SavedServer[]>([])
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [isAddingServer, setIsAddingServer] = useState(false)
  const [newServerUrl, setNewServerUrl] = useState('')
  const [newServerName, setNewServerName] = useState('')
  const [testingServerId, setTestingServerId] = useState<string | null>(null)
  const [loadingServerInfo, setLoadingServerInfo] = useState<string | null>(null)

  // Load saved servers from localStorage
  useEffect(() => {
    const savedServers = JSON.parse(localStorage.getItem('saved_servers') || '[]') as SavedServer[]
    
    // Always include current server
    const currentUrl = getCurrentBackendUrl()
    const currentServer = savedServers.find(s => s.url === currentUrl)
    
    if (!currentServer) {
      const newServer: SavedServer = {
        id: Date.now().toString(),
        url: currentUrl,
        name: new URL(currentUrl).hostname + ':' + new URL(currentUrl).port,
        isDefault: true,
        lastConnected: new Date()
      }
      savedServers.unshift(newServer)
    }
    
    setServers(savedServers)
    
    // Select the default server
    const defaultServer = savedServers.find(s => s.isDefault) || savedServers[0]
    if (defaultServer) {
      setSelectedServerId(defaultServer.id)
      loadServerInfo(defaultServer)
    }
  }, [])

  // Save servers to localStorage whenever they change
  useEffect(() => {
    if (servers.length > 0) {
      localStorage.setItem('saved_servers', JSON.stringify(servers))
    }
  }, [servers])

  const loadServerInfo = async (server: SavedServer) => {
    setLoadingServerInfo(server.id)
    try {
      const result = await testBackendConnection(server.url)
      if (result.success && result.serverInfo) {
        setServers(prev => prev.map(s => 
          s.id === server.id ? { ...s, serverInfo: result.serverInfo } : s
        ))
      }
    } catch (error) {
      console.error('Failed to load server info:', error)
    } finally {
      setLoadingServerInfo(null)
    }
  }

  const handleAddServer = async () => {
    if (!newServerUrl || !validateBackendUrl(newServerUrl).valid) {
      toast.error('Please enter a valid server URL')
      return
    }

    // Test connection first
    const result = await testBackendConnection(newServerUrl)
    if (!result.success) {
      toast.error(`Cannot connect to server: ${result.error}`)
      return
    }

    const url = new URL(newServerUrl)
    const name = newServerName || `${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`
    
    const newServer: SavedServer = {
      id: Date.now().toString(),
      url: newServerUrl,
      name,
      isDefault: false,
      serverInfo: result.serverInfo,
      lastConnected: new Date()
    }

    setServers(prev => [...prev, newServer])
    setSelectedServerId(newServer.id)
    setIsAddingServer(false)
    setNewServerUrl('')
    setNewServerName('')
    
    toast.success('Server added successfully')
  }

  const handleSetDefault = (serverId: string) => {
    const server = servers.find(s => s.id === serverId)
    if (!server) return

    // Update default status
    setServers(prev => prev.map(s => ({
      ...s,
      isDefault: s.id === serverId
    })))

    // Save as current backend URL
    saveBackendUrl(server.url)
    
    toast.success(`Default server changed to ${server.name}`)
    
    // Reload the page to apply changes
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  const handleDeleteServer = (serverId: string) => {
    const server = servers.find(s => s.id === serverId)
    if (!server) return

    if (server.isDefault) {
      toast.error('Cannot delete the default server')
      return
    }

    if (server.isLocked) {
      toast.error('Cannot delete a locked server')
      return
    }

    setServers(prev => prev.filter(s => s.id !== serverId))
    
    // If we deleted the selected server, select the default
    if (selectedServerId === serverId) {
      const defaultServer = servers.find(s => s.isDefault)
      if (defaultServer) {
        setSelectedServerId(defaultServer.id)
      }
    }
    
    toast.success('Server removed')
  }

  const selectedServer = servers.find(s => s.id === selectedServerId)

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Server List */}
      <div className="w-80 border-r bg-muted/30 dark:bg-muted/10 p-4 space-y-2">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-muted-foreground">
          <Server className="h-5 w-5" />
          Servers
        </h2>

        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => setSelectedServerId(server.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              selectedServerId === server.id
                ? "bg-card text-card-foreground border-2 border-primary shadow-sm"
                : "bg-card text-card-foreground border border-border hover:border-muted-foreground/50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{server.name}</span>
                  {server.isDefault && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                  {server.isLocked && (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{server.url}</div>
                {server.serverInfo && (
                  <div className="text-xs text-muted-foreground mt-1">
                    v{server.serverInfo.server.version} •{" "}
                    {server.serverInfo.database.statistics.spaces} spaces
                  </div>
                )}
              </div>
              {server.serverInfo?.websocket.available && (
                <div className="ml-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      server.serverInfo.websocket.enabled
                        ? "bg-green-500"
                        : "bg-gray-300"
                    }`}
                  />
                </div>
              )}
            </div>
          </button>
        ))}

        {/* Add Server Button */}
        {!isAddingServer ? (
          <button
            onClick={() => setIsAddingServer(true)}
            className="w-full p-3 border-2 border-dashed border-muted-foreground/30 rounded-lg text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
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
              className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
              autoFocus
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddServer} className="flex-1">
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingServer(false);
                  setNewServerUrl("");
                  setNewServerName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Right Content - Server Details */}
      <div className="flex-1 overflow-y-auto">
        {selectedServer ? (
          <PageLayout maxWidth="lg">
            <PageHeader
              title={selectedServer.name}
              description={selectedServer.url}
              badge={selectedServer.isDefault && (
                <span className="text-sm font-normal bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded">
                  Default
                </span>
              )}
              actions={

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
                  onClick={() => loadServerInfo(selectedServer)}
                  variant="outline"
                  size="sm"
                  disabled={loadingServerInfo === selectedServer.id}
                >
                  {loadingServerInfo === selectedServer.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
                {!selectedServer.isDefault && !selectedServer.isLocked && (
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
              }
            />

            {/* Server Info */}
            {loadingServerInfo === selectedServer.id ? (
              <Card className="p-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-2 text-muted-foreground">
                    Loading server information...
                  </span>
                </div>
              </Card>
            ) : selectedServer.serverInfo ? (
              <Card className="p-6">
                <ServerInfoCard serverInfo={selectedServer.serverInfo} />
              </Card>
            ) : (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p>No server information available</p>
                  <Button
                    onClick={() => loadServerInfo(selectedServer)}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Load Server Info
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
                    <label className="font-medium">Theme</label>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred theme
                    </p>
                  </div>
                  <select className="px-3 py-1 border rounded bg-background text-foreground">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Auto Refresh</label>
                    <p className="text-sm text-muted-foreground">
                      Automatically refresh data every 30 seconds
                    </p>
                  </div>
                  <input type="checkbox" className="h-4 w-4" />
                </div>
              </div>
            </Card>
          </PageLayout>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a server from the list
          </div>
        )}
      </div>
    </div>
  );
}