import React, { createContext, useContext } from 'react'
import { useSpaceConfig, type SpaceConfig } from '@/hooks/useSpaceConfig'

// Context for space configuration
const SpaceContext = createContext<SpaceConfig | null>(null)

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const spaceConfig = useSpaceConfig()
  return (
    <SpaceContext.Provider value={spaceConfig}>
      {children}
    </SpaceContext.Provider>
  )
}

export function useSpace(): SpaceConfig {
  const context = useContext(SpaceContext)
  if (!context) {
    throw new Error('useSpace must be used within a SpaceProvider')
  }
  return context
}