import { useState, useEffect } from 'react'

interface BackendConfig {
  backendUrl: string | null
  isConfigured: boolean
  error: string | null
}

const STORAGE_KEY = 'api-snapshot-backend-config'

export function useBackendConfig() {
  const [config, setConfig] = useState<BackendConfig>({
    backendUrl: null,
    isConfigured: false,
    error: null
  })

  // Load config from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.backendUrl) {
          console.log('🔧 Loading backend URL from localStorage:', parsed.backendUrl)
          setConfig({
            backendUrl: parsed.backendUrl,
            isConfigured: true,
            error: null
          })
          return
        }
      } catch (error) {
        console.error('Failed to parse stored backend config:', error)
        setConfig(prev => ({
          ...prev,
          error: 'Invalid stored configuration'
        }))
      }
    }
    
    // No stored config - user needs to configure
    console.log('🔧 No backend configuration found - setup required')
  }, [])

  // Check if backend URL is available from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sharedBackendUrl = urlParams.get('backend')
    
    console.log('🔍 URL Params check:', { 
      fullUrl: window.location.href,
      searchParams: window.location.search,
      backendParam: sharedBackendUrl,
      configIsConfigured: config.isConfigured
    })
    
    if (sharedBackendUrl && !config.isConfigured) {
      console.log('🔧 Setting backend URL from params:', sharedBackendUrl)
      setConfig({
        backendUrl: sharedBackendUrl,
        isConfigured: false, // Don't auto-save shared URLs
        error: null
      })
      
      // Update the API client immediately
      updateApiClientBaseUrl(sharedBackendUrl)
    }
  }, [config.isConfigured])

  const saveBackendUrl = (backendUrl: string) => {
    const configToSave = { 
      backendUrl,
      timestamp: new Date().toISOString()
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave))
      setConfig({
        backendUrl,
        isConfigured: true,
        error: null
      })
      
      // Update the API client base URL
      updateApiClientBaseUrl(backendUrl)
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        error: 'Failed to save backend configuration'
      }))
    }
  }

  const clearBackendUrl = () => {
    localStorage.removeItem(STORAGE_KEY)
    setConfig({
      backendUrl: null,
      isConfigured: false,
      error: null
    })
  }

  const updateApiClientBaseUrl = (backendUrl: string) => {
    // This function will be called to update the API client
    // We'll implement this when we update the API client
    window.dispatchEvent(new CustomEvent('backend-url-changed', { 
      detail: { backendUrl } 
    }))
  }

  return {
    ...config,
    saveBackendUrl,
    clearBackendUrl,
    needsSetup: !config.isConfigured
  }
}