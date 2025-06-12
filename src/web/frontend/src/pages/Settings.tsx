import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { 
  getCurrentBackendUrl, 
  saveBackendUrl, 
  validateBackendUrl, 
  testBackendConnection,
  resetToDefaultBackendUrl,
  config 
} from '@/config'
import toast from 'react-hot-toast'

export default function Settings() {
  const [notifications, setNotifications] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [theme, setTheme] = useState('light')
  
  // Backend configuration state
  const [backendUrl, setBackendUrl] = useState('')
  const [timeout, setTimeout] = useState(10000)
  const [isValidUrl, setIsValidUrl] = useState(true)
  const [urlError, setUrlError] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    responseTime?: number;
    error?: string;
  }>({ tested: false, success: false })

  // Load current settings on mount
  useEffect(() => {
    setBackendUrl(getCurrentBackendUrl())
    setTimeout(config.api.timeout)
  }, [])

  // Validate URL as user types
  useEffect(() => {
    if (backendUrl) {
      const validation = validateBackendUrl(backendUrl)
      setIsValidUrl(validation.valid)
      setUrlError(validation.error || '')
      setConnectionStatus({ tested: false, success: false })
    }
  }, [backendUrl])

  const handleSaveConfiguration = async () => {
    if (!isValidUrl) {
      toast.error('Please enter a valid backend URL')
      return
    }

    try {
      // Test connection first
      setIsTestingConnection(true)
      const connectionTest = await testBackendConnection(backendUrl)
      
      if (connectionTest.success) {
        // Save the configuration
        saveBackendUrl(backendUrl)
        
        // Update connection status
        setConnectionStatus({
          tested: true,
          success: true,
          responseTime: connectionTest.responseTime
        })
        
        toast.success(`Configuration saved! Backend connected in ${connectionTest.responseTime}ms`)
      } else {
        setConnectionStatus({
          tested: true,
          success: false,
          error: connectionTest.error
        })
        
        // Still save the URL but warn user
        saveBackendUrl(backendUrl)
        toast.error(`Configuration saved but connection failed: ${connectionTest.error}`)
      }
    } catch (error) {
      toast.error('Failed to save configuration')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleTestConnection = async () => {
    if (!isValidUrl) {
      toast.error('Please enter a valid URL first')
      return
    }

    setIsTestingConnection(true)
    try {
      const result = await testBackendConnection(backendUrl)
      setConnectionStatus({
        tested: true,
        success: result.success,
        responseTime: result.responseTime,
        error: result.error
      })

      if (result.success) {
        toast.success(`Connection successful! Response time: ${result.responseTime}ms`)
      } else {
        toast.error(`Connection failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('Failed to test connection')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleResetToDefault = () => {
    resetToDefaultBackendUrl()
    setBackendUrl(getCurrentBackendUrl())
    setConnectionStatus({ tested: false, success: false })
    toast.success('Reset to default backend URL')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your application preferences and backend configuration</p>
      </div>

      <div className="grid gap-6">
        {/* Backend Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Backend Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Backend URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="https://api.example.com:8080/api-snapshot"
                  className={`flex-1 px-3 py-2 border rounded ${
                    !isValidUrl ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  onClick={handleTestConnection}
                  disabled={!isValidUrl || isTestingConnection}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  {isTestingConnection ? 'Testing...' : 'Test'}
                </button>
              </div>
              
              {!isValidUrl && (
                <p className="text-sm text-red-600 mt-1">{urlError}</p>
              )}
              
              <p className="text-sm text-gray-600 mt-1">
                Full URL including protocol, hostname, port, and path (e.g., https://api.example.com:8080/v1)
              </p>

              {/* Connection Status */}
              {connectionStatus.tested && (
                <div className={`mt-2 p-2 rounded text-sm ${
                  connectionStatus.success 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {connectionStatus.success ? (
                    <span>✅ Connected successfully in {connectionStatus.responseTime}ms</span>
                  ) : (
                    <span>❌ Connection failed: {connectionStatus.error}</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block font-medium mb-2">Request Timeout (ms)</label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeout(Number(e.target.value))}
                min="1000"
                max="60000"
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-sm text-gray-600 mt-1">
                Timeout in milliseconds for API requests (1000-60000)
              </p>
            </div>

            {/* Current Configuration Display */}
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Current Configuration:</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Protocol:</strong> {config.api.protocol}</div>
                <div><strong>Host:</strong> {config.api.host}</div>
                <div><strong>Port:</strong> {config.api.port}</div>
                <div><strong>Path:</strong> {config.api.path || '(none)'}</div>
                <div><strong>Full URL:</strong> {config.api.baseUrl}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <button 
                onClick={handleSaveConfiguration}
                disabled={!isValidUrl || isTestingConnection}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isTestingConnection ? 'Testing & Saving...' : 'Save Configuration'}
              </button>
              <button 
                onClick={handleResetToDefault}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </Card>

        {/* General Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">General</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Enable Notifications</label>
                <p className="text-sm text-gray-600">Get notified when snapshots fail</p>
              </div>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Auto Refresh</label>
                <p className="text-sm text-gray-600">Automatically refresh data every 30 seconds</p>
              </div>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Theme</label>
                <p className="text-sm text-gray-600">Choose your preferred theme</p>
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="px-3 py-1 border rounded"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Examples Card */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Backend URL Examples</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Local Development:</strong> <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3301</code></div>
            <div><strong>Custom Port:</strong> <code className="bg-gray-100 px-2 py-1 rounded">http://192.168.1.100:8080</code></div>
            <div><strong>HTTPS with Path:</strong> <code className="bg-gray-100 px-2 py-1 rounded">https://api.example.com/snapshot-verifier</code></div>
            <div><strong>Docker/Container:</strong> <code className="bg-gray-100 px-2 py-1 rounded">http://api-container:3301</code></div>
            <div><strong>Cloud Service:</strong> <code className="bg-gray-100 px-2 py-1 rounded">https://my-api.herokuapp.com</code></div>
          </div>
        </Card>
      </div>
    </div>
  )
}