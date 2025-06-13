import { useState } from 'react'
import { AlertCircle, RefreshCw, X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FailedOperation {
  id: string
  endpoints: string[]
  failed: string[]
  error?: string
  timestamp: number
}

interface RetryDialogProps {
  operation: FailedOperation
  onRetry: (endpoints: string[]) => void
  onDismiss: () => void
  isRetrying?: boolean
}

export function RetryDialog({ operation, onRetry, onDismiss, isRetrying = false }: RetryDialogProps) {
  const [selectedEndpoints, setSelectedEndpoints] = useState<Set<string>>(new Set(operation.failed))
  
  const toggleEndpoint = (endpoint: string) => {
    setSelectedEndpoints(prev => {
      const newSet = new Set(prev)
      if (newSet.has(endpoint)) {
        newSet.delete(endpoint)
      } else {
        newSet.add(endpoint)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedEndpoints(new Set(operation.failed))
  }

  const clearSelection = () => {
    setSelectedEndpoints(new Set())
  }

  const handleRetry = () => {
    if (selectedEndpoints.size > 0) {
      onRetry(Array.from(selectedEndpoints))
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Operation Failed
            </h3>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Error Summary */}
          <div className="text-sm text-gray-600">
            <p>
              <strong>{operation.failed.length}</strong> of <strong>{operation.endpoints.length}</strong> endpoints 
              failed at {formatTime(operation.timestamp)}
            </p>
            {operation.error && (
              <p className="mt-2 text-red-600 bg-red-50 p-2 rounded">
                {operation.error}
              </p>
            )}
          </div>

          {/* Failed Endpoints List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Failed Endpoints:</h4>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={selectAll}
                  className="text-blue-600 hover:text-blue-800"
                  disabled={selectedEndpoints.size === operation.failed.length}
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-gray-600 hover:text-gray-800"
                  disabled={selectedEndpoints.size === 0}
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded">
              {operation.failed.map((endpoint) => (
                <label
                  key={endpoint}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEndpoints.has(endpoint)}
                    onChange={() => toggleEndpoint(endpoint)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 font-mono">{endpoint}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Success Summary */}
          {operation.endpoints.length > operation.failed.length && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>
                {operation.endpoints.length - operation.failed.length} endpoints succeeded
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            {selectedEndpoints.size} selected for retry
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onDismiss}
              disabled={isRetrying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRetry}
              disabled={selectedEndpoints.size === 0 || isRetrying}
              className="gap-2"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Retry {selectedEndpoints.size > 1 ? `${selectedEndpoints.size} Endpoints` : 'Endpoint'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}