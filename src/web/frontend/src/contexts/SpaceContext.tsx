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
    // During hot module replacement in development, context might be temporarily unavailable
    if (import.meta.env.DEV) {
      console.warn('useSpace called outside SpaceProvider - returning default values')
      return {
        currentSpace: 'default',
        availableSpaces: ['default'],
        spacesInfo: [],
        isLoading: false,
        error: null,
        switchSpace: () => {},
        createSpace: async () => {},
        deleteSpace: async () => {},
        shareUrl: null
      } as SpaceConfig
    }
    throw new Error('useSpace must be used within a SpaceProvider')
  }
  return context
}