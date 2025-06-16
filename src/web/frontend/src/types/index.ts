export interface ApiEndpoint {
  name: string
  url: string
  method: string
  headers?: Record<string, string>
  body?: any
  auth?: {
    type: 'bearer' | 'api-key' | 'basic'
    credentials: Record<string, string>
  }
}

export interface Snapshot {
  id: string
  filename?: string // Filename without .json extension
  endpoint: string
  timestamp: string
  status: 'success' | 'error' | 'pending'
  url: string
  method: string
  responseStatus?: number
  error?: string
  duration?: number
}

export interface ComparisonResult {
  id: string
  snapshot1Id: string
  snapshot2Id: string
  timestamp: string
  differences: Difference[]
  summary: {
    added: number
    removed: number
    modified: number
  }
}

export interface Difference {
  path: string
  type: 'added' | 'removed' | 'modified'
  oldValue?: any
  newValue?: any
}

export interface Plugin {
  id: string
  name: string
  type: 'auth' | 'storage' | 'diff' | 'formatter' | 'validator'
  enabled: boolean
  version: string
  config?: Record<string, any>
}

export interface Config {
  endpoints: ApiEndpoint[]
  snapshotDir: string
  baselineDir: string
  environment: string
  plugins: {
    auth: { providers: string[] }
    formatters: { default: string }
    storage: { provider: string }
    diff: { engine: string }
  }
  rules: Array<{
    path: string
    ignore?: boolean
    transform?: string
  }>
}