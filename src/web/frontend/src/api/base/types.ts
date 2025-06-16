export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  error?: string
  count?: number
}

export interface ApiError {
  status: number
  message: string
  details?: any
  code?: string
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  params?: Record<string, any>
  data?: any
  headers?: Record<string, string>
  timeout?: number
  signal?: AbortSignal
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface FilterParams {
  search?: string
  status?: string
  from?: string
  to?: string
}

export type QueryParams = PaginationParams & FilterParams & Record<string, any>