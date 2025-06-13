import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, X } from 'lucide-react'

interface TimeoutWarningProps {
  startTime: number
  warningThreshold?: number // seconds
  criticalThreshold?: number // seconds
  onDismiss?: () => void
  operationType?: string
}

export function TimeoutWarning({ 
  startTime, 
  warningThreshold = 30,
  criticalThreshold = 120,
  onDismiss,
  operationType = 'operation'
}: TimeoutWarningProps) {
  const [elapsed, setElapsed] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  // Don't show if dismissed or not reached warning threshold
  if (dismissed || elapsed < warningThreshold) {
    return null
  }

  const isCritical = elapsed >= criticalThreshold
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getMessage = () => {
    if (isCritical) {
      return `${operationType} is taking longer than expected (${formatTime(elapsed)}). This might indicate a connectivity issue or server overload.`
    }
    return `${operationType} is taking a bit longer than usual (${formatTime(elapsed)}). Please wait while we process your request.`
  }

  return (
    <div className={`rounded-lg p-4 border-l-4 ${
      isCritical 
        ? 'bg-red-50 border-red-400 text-red-800' 
        : 'bg-yellow-50 border-yellow-400 text-yellow-800'
    }`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isCritical ? (
            <AlertTriangle className="h-5 w-5 text-red-400" />
          ) : (
            <Clock className="h-5 w-5 text-yellow-400" />
          )}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">
            {isCritical ? 'Operation Taking Longer Than Expected' : 'Please Wait'}
          </p>
          <p className="text-sm mt-1">
            {getMessage()}
          </p>
          {isCritical && (
            <div className="mt-3 text-sm">
              <p className="font-medium">Possible solutions:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Check your network connection</li>
                <li>Try refreshing the page and retry</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
          )}
        </div>
        <div className="ml-4">
          <button
            onClick={handleDismiss}
            className="text-yellow-600 hover:text-yellow-800 transition-colors"
            title="Dismiss warning"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}