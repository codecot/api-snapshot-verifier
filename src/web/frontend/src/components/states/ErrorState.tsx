import React from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiException } from '@/api/base/errors'
import { cn } from '@/utils/cn'

export interface ErrorStateProps {
  error: Error | ApiException | string
  onRetry?: () => void
  onGoHome?: () => void
  className?: string
  showDetails?: boolean
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  onGoHome,
  className,
  showDetails = false
}) => {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error instanceof ApiException 
      ? error.message 
      : error.message || 'An unexpected error occurred'

  const errorDetails = error instanceof ApiException ? error.details : undefined
  const isNetworkError = error instanceof ApiException && error.isNetworkError
  const isAuthError = error instanceof ApiException && error.isAuthError

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      
      <h3 className="text-xl font-semibold mb-2">
        {isNetworkError ? 'Connection Error' : isAuthError ? 'Authentication Error' : 'Error'}
      </h3>
      
      <p className="text-muted-foreground max-w-md mb-6">
        {errorMessage}
      </p>

      {showDetails && errorDetails && (
        <details className="mb-6 text-left max-w-md w-full">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Show details
          </summary>
          <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
            {JSON.stringify(errorDetails, null, 2)}
          </pre>
        </details>
      )}

      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        
        {onGoHome && (
          <Button onClick={onGoHome} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        )}
      </div>
    </div>
  )
}

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorState
          error={this.state.error || new Error('Unknown error')}
          onRetry={() => this.setState({ hasError: false, error: undefined })}
        />
      )
    }

    return this.props.children
  }
}