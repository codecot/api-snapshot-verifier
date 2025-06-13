import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Clock, X } from 'lucide-react'
import { TimeoutWarning } from './TimeoutWarning'

interface ProgressProps {
  total: number
  completed: number
  failed: number
  inProgress: boolean
  onCancel?: () => void
  showDetails?: boolean
  operation?: string
  startTime?: number
}

export function Progress({ 
  total, 
  completed, 
  failed, 
  inProgress, 
  onCancel, 
  showDetails = true,
  operation = 'operation',
  startTime
}: ProgressProps) {
  const [timeElapsed, setTimeElapsed] = useState(0)
  const percentage = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0
  const remaining = total - completed - failed

  // Track elapsed time
  useEffect(() => {
    if (!inProgress) {
      setTimeElapsed(0)
      return
    }

    const startTime = Date.now()
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [inProgress])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getStatusColor = () => {
    if (!inProgress && failed === 0) return 'bg-green-500'
    if (!inProgress && failed > 0) return 'bg-red-500'
    return 'bg-blue-500'
  }

  const getStatusText = () => {
    if (!inProgress && failed === 0) return `All ${total} ${operation}s completed successfully`
    if (!inProgress && failed > 0) return `${completed} succeeded, ${failed} failed`
    if (remaining === 0) return 'Finishing up...'
    return `Processing ${operation}s...`
  }

  return (
    <div className="space-y-4">
      {/* Timeout Warning */}
      {inProgress && startTime && (
        <TimeoutWarning
          startTime={startTime}
          warningThreshold={30}
          criticalThreshold={120}
          operationType={operation}
        />
      )}
      
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {inProgress ? (
            <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
          ) : failed === 0 ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <span className="font-medium text-gray-900">
            {getStatusText()}
          </span>
        </div>
        
        {/* Cancel button */}
        {inProgress && onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Cancel operation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Details */}
      {showDetails && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>{percentage}% complete</span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              {completed}
            </span>
            {failed > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-600" />
                {failed}
              </span>
            )}
            {remaining > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-400" />
                {remaining} remaining
              </span>
            )}
          </div>
          
          {inProgress && timeElapsed > 0 && (
            <span className="text-gray-500">
              {formatTime(timeElapsed)}
            </span>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

// Compact version for inline use
export function ProgressInline({ 
  total, 
  completed, 
  failed, 
  inProgress 
}: Pick<ProgressProps, 'total' | 'completed' | 'failed' | 'inProgress'>) {
  const percentage = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-16 bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            !inProgress && failed === 0 ? 'bg-green-500' :
            !inProgress && failed > 0 ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-gray-600 font-medium">
        {completed + failed}/{total}
      </span>
    </div>
  )
}