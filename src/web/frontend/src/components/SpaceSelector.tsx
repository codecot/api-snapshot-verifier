import React, { useState } from 'react'
import { ChevronDown, Plus, Settings, Trash2, AlertCircle, Zap, Code2, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSpace } from '@/contexts/SpaceContext'

// Smart environment detection for spaces
function getSpaceEnvironment(space: string): {
  icon: React.ReactNode
  bgColor: string
  hoverBgColor: string
  textColor: string
  borderColor: string
  label: string
  className: string
} {
  const lowerSpace = space.toLowerCase()
  
  // Production variants (red theme)
  if (lowerSpace.includes('prod') || lowerSpace.includes('live') || lowerSpace.includes('release')) {
    return {
      icon: <AlertCircle className="h-3 w-3" />,
      bgColor: 'bg-red-50',
      hoverBgColor: 'hover:bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      label: 'Production',
      className: 'bg-red-50 text-red-700 hover:bg-red-100'
    }
  }
  
  // Staging/QA variants (yellow theme) 
  if (lowerSpace.includes('stag') || lowerSpace.includes('qa') || lowerSpace.includes('test') || lowerSpace.includes('uat') || lowerSpace.includes('sandbox')) {
    return {
      icon: <Zap className="h-3 w-3" />,
      bgColor: 'bg-yellow-50',
      hoverBgColor: 'hover:bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
      label: 'Staging',
      className: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
    }
  }
  
  // Development variants (green theme)
  if (lowerSpace.includes('dev') || lowerSpace.includes('local')) {
    return {
      icon: <Code2 className="h-3 w-3" />,
      bgColor: 'bg-green-50',
      hoverBgColor: 'hover:bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      label: 'Development',
      className: 'bg-green-50 text-green-700 hover:bg-green-100'
    }
  }
  
  // Default/other (blue theme)
  return {
    icon: <Box className="h-3 w-3" />,
    bgColor: 'bg-blue-50',
    hoverBgColor: 'hover:bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    label: 'Default',
    className: 'bg-blue-50 text-blue-700 hover:bg-blue-100'
  }
}

export default function SpaceSelector() {
  const { 
    currentSpace, 
    availableSpaces, 
    spacesInfo,
    isLoading, 
    switchSpace, 
    createSpace, 
    deleteSpace 
  } = useSpace()
  
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) {
      setCreateError('Space name is required')
      return
    }

    if (availableSpaces.includes(newSpaceName.trim())) {
      setCreateError('Space already exists')
      return
    }

    try {
      await createSpace(newSpaceName.trim())
      switchSpace(newSpaceName.trim())
      setNewSpaceName('')
      setIsCreating(false)
      setCreateError(null)
      setIsOpen(false)
    } catch (error: any) {
      setCreateError(error.message)
    }
  }

  const handleDeleteSpace = async (space: string) => {
    if (space === 'default') {
      return // Cannot delete default
    }
    
    if (confirm(`Are you sure you want to delete space "${space}"?`)) {
      try {
        await deleteSpace(space)
      } catch (error) {
        console.error('Failed to delete space:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Loading spaces...</span>
      </div>
    )
  }

  const currentSpaceInfo = spacesInfo.find(s => s.name === currentSpace)
  const currentEndpointCount = currentSpaceInfo?.endpoint_count || 0
  const currentEnv = getSpaceEnvironment(currentSpace)
  
  // No indicators for current space - you're already here
  const currentIndicatorColor = ''
  const currentIndicatorTitle = ''

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 min-w-[180px] justify-between border ${currentEnv.borderColor} ${currentEnv.className}`}
      >
        <div className="flex items-center gap-2 flex-1">
          {currentEnv.icon}
          <span className="capitalize font-medium">{currentSpace}</span>
          <span 
            className={`text-xs px-1.5 py-0.5 rounded ml-auto ${currentEnv.textColor} bg-white/60`}
            title={`${currentEndpointCount} endpoint${currentEndpointCount !== 1 ? 's' : ''}`}
          >
            {currentEndpointCount}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${currentEnv.textColor}`} />
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => {
              setIsOpen(false)
              setIsCreating(false)
              setCreateError(null)
            }}
          />
          <Card className="absolute top-full mt-1 right-0 z-20 min-w-[200px] shadow-lg">
            <CardContent className="p-2">
              <div className="space-y-1">
                {spacesInfo.map((spaceInfo) => {
                  const space = spaceInfo.name
                  const endpointCount = spaceInfo.endpoint_count
                  const env = getSpaceEnvironment(space)
                  
                  // Indicator logic:
                  // - Red dot: Errors that need attention (API failures, auth issues)
                  // - Blue dot: Recent changes in OTHER spaces (not current space)
                  // - No dot: Normal state or you're in this space
                  
                  // For now, only show activity indicators for spaces other than current
                  const isCurrentSpace = space === currentSpace
                  
                  // TODO: These would come from the API with space stats
                  // const hasErrors = spaceInfo.has_errors || false
                  // const hasRecentChanges = spaceInfo.recent_changes || false
                  
                  // Empty space is only a "problem" if it's unintentional
                  // Deleting all endpoints is a valid action, not an error
                  const hasErrors = false // TODO: Real errors from API
                  const hasRecentActivity = false // TODO: Track recent changes
                  
                  let indicatorColor = ''
                  let indicatorTitle = ''
                  
                  // Don't show indicators for current space - you already know what you're doing
                  if (!isCurrentSpace) {
                    if (hasErrors) {
                      indicatorColor = 'bg-red-500'
                      indicatorTitle = 'This space has errors that need attention'
                    } else if (hasRecentActivity) {
                      indicatorColor = 'bg-blue-500'
                      indicatorTitle = 'Recent changes in this space'
                    }
                  }
                  
                  return (
                    <div key={space} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          switchSpace(space)
                          setIsOpen(false)
                        }}
                        className={`flex-1 text-left px-3 py-2 rounded text-sm transition-all ${
                          space === currentSpace 
                            ? `${env.className} font-medium ring-2 ring-offset-1 ${env.borderColor.replace('border', 'ring')}` 
                            : env.className
                        }`}
                        title={`${env.label} environment`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {env.icon}
                            <span className="capitalize">{space}</span>
                            {indicatorColor && (
                              <div 
                                className={`w-1.5 h-1.5 ${indicatorColor} rounded-full ${hasErrors ? 'animate-pulse' : ''}`}
                                title={indicatorTitle}
                              />
                            )}
                          </div>
                          <span 
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              space === currentSpace
                                ? `${env.textColor} bg-white/60`
                                : 'bg-gray-100 text-gray-600'
                            }`}
                            title={`${endpointCount} endpoint${endpointCount !== 1 ? 's' : ''}`}
                          >
                            {endpointCount}
                          </span>
                        </div>
                      </button>
                      {/* Always reserve space for delete button to maintain alignment */}
                      <div className="w-7 h-7 flex items-center justify-center">
                        {space !== 'default' && space !== currentSpace && (
                          <button
                            onClick={() => handleDeleteSpace(space)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                            title={`Delete ${space} space`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t mt-2 pt-2">
                {isCreating ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newSpaceName}
                      onChange={(e) => {
                        setNewSpaceName(e.target.value)
                        setCreateError(null)
                      }}
                      placeholder="Space name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateSpace()
                        } else if (e.key === 'Escape') {
                          setIsCreating(false)
                          setNewSpaceName('')
                          setCreateError(null)
                        }
                      }}
                    />
                    {createError && (
                      <p className="text-xs text-red-600">{createError}</p>
                    )}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={handleCreateSpace}
                        className="flex-1 h-7 text-xs"
                      >
                        Create
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsCreating(false)
                          setNewSpaceName('')
                          setCreateError(null)
                        }}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Plus className="h-4 w-4" />
                    Create Space
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}