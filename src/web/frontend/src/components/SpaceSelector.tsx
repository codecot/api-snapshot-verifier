import React, { useState } from 'react'
import { ChevronDown, Plus, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSpace } from '@/contexts/SpaceContext'

// Smart color detection for space environments
function getSpaceColor(space: string): string {
  const lowerSpace = space.toLowerCase()
  
  // Production variants (red)
  if (lowerSpace.includes('prod') || lowerSpace.includes('live') || lowerSpace.includes('release')) {
    return 'bg-red-500'
  }
  
  // Staging/QA variants (yellow) 
  if (lowerSpace.includes('stag') || lowerSpace.includes('qa') || lowerSpace.includes('test') || lowerSpace.includes('uat') || lowerSpace.includes('sandbox')) {
    return 'bg-yellow-500'
  }
  
  // Development variants (green)
  if (lowerSpace.includes('dev') || lowerSpace.includes('local')) {
    return 'bg-green-500'
  }
  
  // Default/other (blue)
  return 'bg-blue-500'
}

export default function SpaceSelector() {
  const { 
    currentSpace, 
    availableSpaces, 
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

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 min-w-[140px] justify-between"
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getSpaceColor(currentSpace)}`} />
          <span className="capitalize">{currentSpace}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                {availableSpaces.map((space) => (
                  <div key={space} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        switchSpace(space)
                        setIsOpen(false)
                      }}
                      className={`flex-1 text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                        space === currentSpace ? 'bg-blue-50 text-blue-600 font-medium' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getSpaceColor(space)}`} />
                        <span className="capitalize">{space}</span>
                      </div>
                    </button>
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
                ))}
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