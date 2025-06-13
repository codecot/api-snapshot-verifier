// Core API types
export interface ApiEndpoint {
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  auth?: {
    type?: string
    token?: string
    config?: any
  }
  // Phase 1: Universal parameter support
  parameters?: Record<string, string>  // Resolved parameter values: { userId: "123", authToken: "abc" }
}

// Additional frontend-specific types
export interface Snapshot {
  id: string
  endpoint: string
  timestamp: string
  status: 'success' | 'error'
  error?: string
  response?: {
    status: number
    headers: Record<string, string>
    data: any
    duration: number
  }
}

export interface ComparisonResult {
  id: string
  endpoint: string
  baseline: Snapshot
  current: Snapshot
  differences: any[]
  hasChanges: boolean
  timestamp: string
}