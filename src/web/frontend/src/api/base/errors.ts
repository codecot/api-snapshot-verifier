import { ApiError } from './types'

export class ApiException extends Error implements ApiError {
  constructor(
    public status: number,
    public message: string,
    public details?: any,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiException'
    Object.setPrototypeOf(this, ApiException.prototype)
  }

  static fromError(error: any): ApiException {
    if (error instanceof ApiException) {
      return error
    }

    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new ApiException(0, 'Network error - unable to reach server', error)
    }

    // Handle response errors
    if (error.response) {
      const { status, data } = error.response
      return new ApiException(
        status,
        data?.message || data?.error || getDefaultMessage(status),
        data,
        data?.code
      )
    }

    // Handle other errors
    return new ApiException(500, error.message || 'An unexpected error occurred', error)
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }

  get isValidationError(): boolean {
    return this.status === 400 || this.status === 422
  }

  get isServerError(): boolean {
    return this.status >= 500
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }
}

function getDefaultMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Bad request - please check your input',
    401: 'Authentication required',
    403: 'You do not have permission to perform this action',
    404: 'Resource not found',
    409: 'Conflict - the resource already exists',
    422: 'Validation failed',
    429: 'Too many requests - please try again later',
    500: 'Internal server error',
    502: 'Bad gateway - server is temporarily unavailable',
    503: 'Service unavailable',
    504: 'Gateway timeout'
  }
  
  return messages[status] || `Request failed with status ${status}`
}

export function isApiError(error: any): error is ApiException {
  return error instanceof ApiException
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiException) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return 'An unexpected error occurred'
}