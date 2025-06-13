import React, { createContext, useContext, useState, useCallback } from 'react'

interface CaptureOperation {
  id: string
  space: string
  type: 'single' | 'bulk'
  endpoints: string[]
  total: number
  completed: number
  failed: number
  startTime: number
  isActive: boolean
  timeoutId?: number
}

interface CaptureProgressContextType {
  operations: Record<string, CaptureOperation>
  startOperation: (operation: Omit<CaptureOperation, 'id' | 'startTime' | 'isActive'>) => string
  updateProgress: (id: string, updates: Partial<Pick<CaptureOperation, 'completed' | 'failed'>>) => void
  completeOperation: (id: string) => void
  cancelOperation: (id: string) => void
  getActiveOperation: (space: string) => CaptureOperation | undefined
  getOperationTimeout: (id: string) => number // seconds elapsed
}

const CaptureProgressContext = createContext<CaptureProgressContextType | undefined>(undefined)

const OPERATION_TIMEOUT = 300000 // 5 minutes

export function CaptureProgressProvider({ children }: { children: React.ReactNode }) {
  const [operations, setOperations] = useState<Record<string, CaptureOperation>>({})

  const startOperation = useCallback((operation: Omit<CaptureOperation, 'id' | 'startTime' | 'isActive'>) => {
    const id = `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()
    
    // Set timeout for operation
    const timeoutId = window.setTimeout(() => {
      setOperations(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          isActive: false
        }
      }))
    }, OPERATION_TIMEOUT)

    const newOperation: CaptureOperation = {
      ...operation,
      id,
      startTime,
      isActive: true,
      timeoutId
    }

    setOperations(prev => ({ ...prev, [id]: newOperation }))
    return id
  }, [])

  const updateProgress = useCallback((id: string, updates: Partial<Pick<CaptureOperation, 'completed' | 'failed'>>) => {
    setOperations(prev => {
      const operation = prev[id]
      if (!operation) return prev
      
      return {
        ...prev,
        [id]: {
          ...operation,
          ...updates
        }
      }
    })
  }, [])

  const completeOperation = useCallback((id: string) => {
    setOperations(prev => {
      const operation = prev[id]
      if (!operation) return prev
      
      // Clear timeout
      if (operation.timeoutId) {
        clearTimeout(operation.timeoutId)
      }
      
      return {
        ...prev,
        [id]: {
          ...operation,
          isActive: false
        }
      }
    })

    // Remove completed operations after 5 seconds
    setTimeout(() => {
      setOperations(prev => {
        const { [id]: removed, ...rest } = prev
        return rest
      })
    }, 5000)
  }, [])

  const cancelOperation = useCallback((id: string) => {
    setOperations(prev => {
      const operation = prev[id]
      if (!operation) return prev
      
      // Clear timeout
      if (operation.timeoutId) {
        clearTimeout(operation.timeoutId)
      }
      
      // Remove immediately
      const { [id]: removed, ...rest } = prev
      return rest
    })
  }, [])

  const getActiveOperation = useCallback((space: string) => {
    return Object.values(operations).find(op => op.space === space && op.isActive)
  }, [operations])

  const getOperationTimeout = useCallback((id: string) => {
    const operation = operations[id]
    if (!operation) return 0
    return Math.floor((Date.now() - operation.startTime) / 1000)
  }, [operations])

  const value: CaptureProgressContextType = {
    operations,
    startOperation,
    updateProgress,
    completeOperation,
    cancelOperation,
    getActiveOperation,
    getOperationTimeout
  }

  return (
    <CaptureProgressContext.Provider value={value}>
      {children}
    </CaptureProgressContext.Provider>
  )
}

export function useCaptureProgress() {
  const context = useContext(CaptureProgressContext)
  if (context === undefined) {
    throw new Error('useCaptureProgress must be used within a CaptureProgressProvider')
  }
  return context
}