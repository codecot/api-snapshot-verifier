import { RequestConfig } from './types'
import { ApiException } from './errors'

export abstract class BaseApiClient {
  protected baseURL: string
  protected defaultTimeout: number = 30000
  protected defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  constructor(baseURL?: string) {
    this.baseURL = baseURL || this.getBaseURL()
  }

  private getBaseURL(): string {
    // Check localStorage for backend config
    const backendConfig = localStorage.getItem('api-snapshot-backend-config')
    if (backendConfig) {
      try {
        const config = JSON.parse(backendConfig)
        const activeServer = config.servers?.find((s: any) => s.isActive)
        if (activeServer?.url) {
          // Ensure the URL ends with /api
          const baseUrl = activeServer.url.replace(/\/+$/, '') // Remove trailing slashes
          return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`
        }
      } catch (e) {
        console.error('Failed to parse backend config:', e)
      }
    }
    
    // Fallback to environment or default
    return (import.meta as any).env?.VITE_API_URL || 'http://localhost:3301/api'
  }

  protected async request<T = any>(config: RequestConfig): Promise<T> {
    const url = this.buildUrl(config.url, config.params)
    console.log('API Request:', { baseURL: this.baseURL, endpoint: config.url, fullUrl: url })
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.timeout || this.defaultTimeout
    )

    try {
      const response = await fetch(url, {
        method: config.method,
        headers: {
          ...this.defaultHeaders,
          ...config.headers
        },
        body: config.data ? JSON.stringify(config.data) : undefined,
        signal: config.signal || controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw await this.handleErrorResponse(response)
      }

      return await this.handleSuccessResponse<T>(response)
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiException(0, 'Request timeout', error)
      }
      
      throw ApiException.fromError(error)
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    // Remove leading slash from endpoint to prevent replacing the base path
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const baseUrl = this.baseURL.endsWith('/') ? this.baseURL : `${this.baseURL}/`
    const url = new URL(cleanEndpoint, baseUrl)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }
    
    return url.toString()
  }

  private async handleErrorResponse(response: Response): Promise<ApiException> {
    let errorData: any = {}
    
    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        errorData = await response.json()
      } else {
        errorData = { message: await response.text() }
      }
    } catch {
      // If parsing fails, use status text
      errorData = { message: response.statusText }
    }

    return new ApiException(
      response.status,
      errorData.message || errorData.error || response.statusText,
      errorData,
      errorData.code
    )
  }

  private async handleSuccessResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    
    if (!contentType || !contentType.includes('application/json')) {
      return await response.text() as T
    }

    const data = await response.json()
    return data as T
  }

  // Convenience methods
  protected get<T = any>(url: string, params?: Record<string, any>, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'GET',
      url,
      params
    })
  }

  protected post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'POST',
      url,
      data
    })
  }

  protected put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'PUT',
      url,
      data
    })
  }

  protected delete<T = any>(url: string, params?: Record<string, any>, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'DELETE',
      url,
      params
    })
  }
}