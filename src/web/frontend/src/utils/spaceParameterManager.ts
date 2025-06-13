// Space-Level Parameter Manager
// Maintains consistent parameter values across all endpoints in a space

import { parseEndpointParameters } from './parameterParser'
import type { ApiEndpoint } from '../../../../types'

export interface SpaceParameterStore {
  spaceId: string
  parameters: Record<string, string>  // { petId: "123", userId: "456" }
  lastUpdated: string
  version: string
}

export interface SpaceParameterManager {
  getParameter(paramName: string): string | undefined
  setParameter(paramName: string, value: string): void
  generateParameter(paramName: string, pattern: string): string
  getAllParameters(): Record<string, string>
  mergeEndpointParameters(endpoint: ApiEndpoint): Record<string, string>
  saveToStorage(): void
  loadFromStorage(): void
  resetParameter(paramName: string): void
  resetAllParameters(): void
}

// Pattern-based generators (same as before but deterministic within space)
const PARAMETER_PATTERNS = {
  id: /.*[Ii]d$/,
  uuid: /.*([Uu]id|[Uu]uid)$/,
  timestamp: /.*([Tt]m|[Tt]imestamp)$/,
  date: /.*[Dd]ate$/,
  time: /.*[Tt]ime$/,
  token: /.*([Tt]oken|[Kk]ey)$/,
  string: /.*([Nn]ame|[Tt]itle|[Tt]ext)$/
}

// Deterministic value generators based on parameter name and space
const generateDeterministicValue = (paramName: string, pattern: string, spaceId: string): string => {
  const cleanName = paramName.replace(/[{}]/g, '')
  
  // Create a simple hash from space + parameter name for consistency
  const seed = hashString(spaceId + cleanName)
  
  switch (pattern) {
    case 'id':
      // Generate consistent ID based on parameter name
      return (100 + (seed % 900)).toString()
      
    case 'uuid':
      // Generate consistent UUID-like string
      const chars = '0123456789abcdef'
      let result = ''
      let currentSeed = seed
      
      const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      for (let i = 0; i < template.length; i++) {
        if (template[i] === 'x') {
          result += chars[currentSeed % 16]
          currentSeed = Math.floor(currentSeed / 16)
        } else if (template[i] === 'y') {
          result += chars[8 + (currentSeed % 4)]
          currentSeed = Math.floor(currentSeed / 4)
        } else {
          result += template[i]
        }
      }
      return result
      
    case 'timestamp':
      // Use a base timestamp + offset for consistency
      const baseTimestamp = 1640995200000 // 2022-01-01
      return (baseTimestamp + (seed % 31536000000)).toString() // +/- 1 year
      
    case 'date':
      // Generate consistent date
      const baseDate = new Date('2024-01-01')
      baseDate.setDate(baseDate.getDate() + (seed % 365))
      return baseDate.toISOString().split('T')[0]
      
    case 'time':
      // Generate consistent time
      const hours = String(seed % 24).padStart(2, '0')
      const minutes = String((seed * 37) % 60).padStart(2, '0')
      const seconds = String((seed * 73) % 60).padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
      
    case 'token':
      // Generate consistent token
      return `tk_${cleanName.toLowerCase()}_${seed.toString(36).substring(0, 8)}`
      
    case 'string':
      // Generate meaningful string based on parameter name
      return `${cleanName.toLowerCase()}_${seed % 100}`
      
    default:
      return `${cleanName}_${seed % 1000}`
  }
}

// Simple string hash function for deterministic generation
const hashString = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Detect parameter pattern based on name
const detectPattern = (paramName: string): string => {
  const cleanName = paramName.replace(/[{}]/g, '')
  
  for (const [pattern, regex] of Object.entries(PARAMETER_PATTERNS)) {
    if (regex.test(cleanName)) {
      return pattern
    }
  }
  
  return 'default'
}

export class SpaceParameterManagerImpl implements SpaceParameterManager {
  private store: SpaceParameterStore
  private storageKey: string

  constructor(spaceId: string) {
    this.storageKey = `space-parameters-${spaceId}`
    this.store = {
      spaceId,
      parameters: {},
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    }
    
    this.loadFromStorage()
  }

  getParameter(paramName: string): string | undefined {
    return this.store.parameters[paramName]
  }

  setParameter(paramName: string, value: string): void {
    this.store.parameters[paramName] = value
    this.store.lastUpdated = new Date().toISOString()
    this.saveToStorage()
  }

  generateParameter(paramName: string, pattern: string): string {
    // Check if we already have this parameter
    const existing = this.getParameter(paramName)
    if (existing) {
      return existing
    }

    // Generate new deterministic value
    const newValue = generateDeterministicValue(paramName, pattern, this.store.spaceId)
    this.setParameter(paramName, newValue)
    
    console.log(`🎯 Generated consistent parameter for space "${this.store.spaceId}": ${paramName} = "${newValue}" (pattern: ${pattern})`)
    
    return newValue
  }

  getAllParameters(): Record<string, string> {
    return { ...this.store.parameters }
  }

  mergeEndpointParameters(endpoint: ApiEndpoint): Record<string, string> {
    // Parse parameters from endpoint
    const endpointParams = parseEndpointParameters({
      url: endpoint.url,
      headers: endpoint.headers,
      body: endpoint.body
    })

    // Start with existing endpoint parameters
    const mergedParams = { ...endpoint.parameters }

    // For each detected parameter, use space-consistent value
    for (const [paramName, paramConfig] of Object.entries(endpointParams.parameters)) {
      const existingValue = this.getParameter(paramName)
      
      if (existingValue) {
        // Use existing space-consistent value
        mergedParams[paramName] = existingValue
      } else {
        // Generate new consistent value for this space
        mergedParams[paramName] = this.generateParameter(paramName, paramConfig.pattern)
      }
    }

    return mergedParams
  }

  saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.store))
    } catch (error) {
      console.warn('Failed to save space parameters to localStorage:', error)
    }
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const loaded = JSON.parse(stored) as SpaceParameterStore
        // Validate structure
        if (loaded.spaceId === this.store.spaceId && loaded.parameters) {
          this.store = {
            ...this.store,
            ...loaded,
            version: '1.0.0' // Ensure version is current
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load space parameters from localStorage:', error)
    }
  }

  resetParameter(paramName: string): void {
    delete this.store.parameters[paramName]
    this.store.lastUpdated = new Date().toISOString()
    this.saveToStorage()
    console.log(`🔄 Reset parameter "${paramName}" for space "${this.store.spaceId}"`)
  }

  resetAllParameters(): void {
    this.store.parameters = {}
    this.store.lastUpdated = new Date().toISOString()
    this.saveToStorage()
    console.log(`🔄 Reset all parameters for space "${this.store.spaceId}"`)
  }

  // Debug utility
  debugParameters(): void {
    console.log(`🔍 Space "${this.store.spaceId}" Parameters:`, {
      count: Object.keys(this.store.parameters).length,
      parameters: this.store.parameters,
      lastUpdated: this.store.lastUpdated
    })
  }
}

// Global managers cache
const spaceManagers = new Map<string, SpaceParameterManagerImpl>()

// Factory function to get or create space parameter manager
export const getSpaceParameterManager = (spaceId: string): SpaceParameterManagerImpl => {
  if (!spaceManagers.has(spaceId)) {
    spaceManagers.set(spaceId, new SpaceParameterManagerImpl(spaceId))
  }
  return spaceManagers.get(spaceId)!
}

// Utility: Clear all space parameter managers (for testing)
export const clearAllSpaceParameters = (): void => {
  spaceManagers.clear()
  console.log('🧹 Cleared all space parameter managers')
}