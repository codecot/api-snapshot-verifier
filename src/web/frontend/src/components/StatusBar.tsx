import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface StatusBarProps {
  isActive: boolean
  progress?: number // 0-100
  status?: 'loading' | 'success' | 'error' | 'idle'
  message?: string
  showProgress?: boolean
}

export function StatusBar({ 
  isActive, 
  progress = 0, 
  status = 'idle', 
  message,
  showProgress = true 
}: StatusBarProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isActive) {
      setVisible(true)
    } else {
      // Keep visible briefly after completion to show success/error
      const timer = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  if (!visible && status === 'idle') return null

  const getStatusColor = () => {
    switch (status) {
      case 'loading': return 'bg-blue-500'
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-300'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading': return <Loader2 className="h-3 w-3 animate-spin" />
      case 'success': return <CheckCircle className="h-3 w-3" />
      case 'error': return <AlertCircle className="h-3 w-3" />
      default: return null
    }
  }

  return (
    <div className={`h-1 w-full relative overflow-hidden transition-all duration-300 ${
      visible ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gray-200" />
      
      {/* Progress Bar */}
      {showProgress && (
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${getStatusColor()}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      )}
      
      {/* Indeterminate loading bar */}
      {isActive && !showProgress && (
        <div className={`absolute inset-y-0 w-1/3 ${getStatusColor()} animate-pulse`} />
      )}

      {/* Status Message */}
      {message && (
        <div className="absolute top-1 left-2 flex items-center gap-1 text-xs text-white bg-black/50 px-2 py-1 rounded">
          {getStatusIcon()}
          <span>{message}</span>
        </div>
      )}
      
    </div>
  )
}

// Thin status bar for page headers - Fixed position to prevent layout jumps
export function ThinStatusBar({ isActive, status, message }: Pick<StatusBarProps, 'isActive' | 'status' | 'message'>) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isActive) {
      setVisible(true)
    } else {
      // Hide immediately when action completes - no delay
      setVisible(false)
    }
  }, [isActive])

  const getStatusColor = () => {
    switch (status) {
      case 'loading': return 'bg-blue-500'
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-300'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading': return <Loader2 className="h-3 w-3 animate-spin" />
      case 'success': return <CheckCircle className="h-3 w-3" />
      case 'error': return <AlertCircle className="h-3 w-3" />
      default: return null
    }
  }

  if (!visible && status === 'idle') return null

  return (
    <div className={`fixed top-16 left-0 right-0 h-1 z-40 transition-all duration-300 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
    }`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gray-200" />
      
      {/* Indeterminate loading bar - Sliding animation with bright blue colors */}
      {isActive && (
        <div className="absolute inset-y-0 overflow-hidden">
          <div 
            className="h-full w-1/2 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 shadow-sm"
            style={{
              animation: 'slide 1.8s ease-in-out infinite, blueShift 2.5s ease-in-out infinite',
              transform: 'translateX(-100%)'
            }}
          />
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slide {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(200%); }
            100% { transform: translateX(-100%); }
          }
          @keyframes blueShift {
            0% { 
              background: linear-gradient(90deg, #60a5fa, #3b82f6, #2563eb);
              filter: brightness(1) saturate(1);
            }
            25% { 
              background: linear-gradient(90deg, #3b82f6, #2563eb, #1d4ed8);
              filter: brightness(1.2) saturate(1.2);
            }
            50% { 
              background: linear-gradient(90deg, #2563eb, #1d4ed8, #1e40af);
              filter: brightness(1) saturate(1);
            }
            75% { 
              background: linear-gradient(90deg, #1d4ed8, #1e40af, #2563eb);
              filter: brightness(1.2) saturate(1.2);
            }
            100% { 
              background: linear-gradient(90deg, #60a5fa, #3b82f6, #2563eb);
              filter: brightness(1) saturate(1);
            }
          }
        `
      }} />

      {/* Status Message - Positioned below the bar */}
      {message && (
        <div className="absolute top-1 left-4 flex items-center gap-1 text-xs text-white bg-black/70 px-2 py-1 rounded shadow-sm">
          {getStatusIcon()}
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}