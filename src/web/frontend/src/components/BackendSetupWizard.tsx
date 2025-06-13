import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useLocalServers } from '@/hooks/useLocalServers'

interface BackendSetupWizardProps {
  onComplete: (backendUrl: string) => void
  initialUrl?: string
  error?: string
}

export default function BackendSetupWizard({ 
  onComplete, 
  initialUrl = 'http://localhost:3301',
  error 
}: BackendSetupWizardProps) {
  const { testServer, addServer, setDefaultServer } = useLocalServers()
  const [backendUrl, setBackendUrl] = useState(initialUrl)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [serverInfo, setServerInfo] = useState<any>(null)

  const validateBackendUrl = async (url: string) => {
    setIsValidating(true)
    setValidationError(null)
    setIsValid(false)
    setServerInfo(null)

    try {
      const cleanUrl = url.replace(/\/+$/, '')
      const testResult = await testServer(cleanUrl)
      
      if (testResult.connected) {
        setIsValid(true)
        setServerInfo(testResult.serverInfo)
        return true
      } else {
        setValidationError(testResult.error || 'Failed to connect to backend')
        return false
      }
    } catch (error) {
      if (error instanceof Error) {
        setValidationError(`Connection failed: ${error.message}`)
      } else {
        setValidationError('Failed to connect to backend')
      }
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const handleTest = async () => {
    if (!backendUrl.trim()) {
      setValidationError('Please enter a backend URL')
      return
    }
    
    await validateBackendUrl(backendUrl)
  }

  const handleSave = () => {
    if (isValid) {
      const cleanUrl = backendUrl.replace(/\/+$/, '')
      
      // Add server to local storage
      const url = new URL(cleanUrl)
      const name = `${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`
      
      const newServer = addServer({
        url: cleanUrl,
        name,
        serverInfo,
        lastConnected: new Date().toISOString(),
        isDefault: true // Make it default since this is initial setup
      })
      
      setDefaultServer(newServer.id)
      onComplete(cleanUrl)
    }
  }

  const handleUrlChange = (value: string) => {
    setBackendUrl(value)
    setValidationError(null)
    setIsValid(false)
  }

  const getStatusIcon = () => {
    if (isValidating) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    if (isValid) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (validationError) return <AlertCircle className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Setup Backend Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Backend URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={backendUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="http://localhost:3301"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                disabled={isValidating}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getStatusIcon()}
              </div>
            </div>
            
            {validationError && (
              <p className="text-red-600 text-sm mt-1">{validationError}</p>
            )}
            
            {isValid && (
              <p className="text-green-600 text-sm mt-1">✓ Backend connection verified</p>
            )}
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleTest}
              disabled={isValidating || !backendUrl.trim()}
              variant="outline"
              className="w-full"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            <Button 
              onClick={handleSave}
              disabled={!isValid}
              className="w-full"
            >
              Save & Continue
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Make sure your backend is running</p>
            <p>• Default local backend: http://localhost:3301</p>
            <p>• For remote backends, include the full URL with port</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}