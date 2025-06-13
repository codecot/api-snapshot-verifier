import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit3, Trash2, Globe, RefreshCw, Camera, Clock, Copy, Play, Loader2, MoreVertical, CheckSquare, X, Home, AlertTriangle, FileDown, ChevronDown, ChevronRight, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { endpointsApi } from '@/api/endpoints'
import { snapshotsApi } from '@/api/snapshots'
import { useSpace } from '@/contexts/SpaceContext'
import { useCaptureEvents } from '@/contexts/WebSocketContext'
import { useCaptureProgress } from '@/contexts/CaptureProgressContext'
// import { Progress } from '@/components/Progress' // Removed - not used
import { ThinStatusBar } from '@/components/StatusBar'
import toast from 'react-hot-toast'
import { queuedToast } from '@/utils/toastQueue'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ApiEndpoint } from '@/types'
import { formatRelativeTime } from '@/utils/dateUtils'
// import { useBackendConfig } from '@/hooks/useBackendConfig' // Removed - not used
import OpenAPIImport from '@/components/OpenAPIImport'
import { parseEndpointParameters, getParameterSummary, type EndpointParameters } from '@/utils/parameterParser'
import { resolveEndpointParameters, hasUnresolvedParameters } from '@/utils/parameterSubstitution'
import { getSpaceParameterManager } from '@/utils/spaceParameterManager'

export default function Endpoints() {
  const { currentSpace } = useSpace()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const captureEvents = useCaptureEvents()
  const captureProgress = useCaptureProgress()
  
  const [isCreating, setIsCreating] = useState(false)
  const [editingEndpoint, setEditingEndpoint] = useState<ApiEndpoint | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [snapshotting, setSnapshotting] = useState<Set<string>>(new Set())
  const [selectedEndpoints, setSelectedEndpoints] = useState<Set<string>>(new Set())
  const [bulkSnapshotting, setBulkSnapshotting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteSnapshots, setDeleteSnapshots] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk', endpoint?: ApiEndpoint }>({ type: 'bulk' })
  const [showOpenAPIImport, setShowOpenAPIImport] = useState(false)
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set())

  const { data: endpointsResponse, isLoading, refetch } = useQuery({
    queryKey: ['endpoints', currentSpace],
    queryFn: () => endpointsApi.getAll(currentSpace),
    refetchOnWindowFocus: true, // Auto-refresh on window focus
  })

  const { data: snapshotsResponse, refetch: refetchSnapshots } = useQuery({
    queryKey: ['snapshots', currentSpace],
    queryFn: () => snapshotsApi.getAll(currentSpace),
    refetchOnWindowFocus: true,
    staleTime: 5000, // Reduced to 5 seconds for faster stats updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: true, // Enable refetch on mount to get fresh data
    refetchOnReconnect: 'always', // Refetch when connection restored
  })

  const endpoints = Array.isArray(endpointsResponse) ? endpointsResponse : []
  const snapshots = Array.isArray(snapshotsResponse) ? snapshotsResponse : []
  
  // Debug logging to see what data we're getting
  // console.log('🔍 Endpoints Debug:', {
  //   endpointsCount: endpoints.length,
  //   snapshotsCount: snapshots.length,
  //   snapshotsResponse,
  //   endpointsResponse,
  //   currentSpace,
  //   sampleEndpoint: endpoints[0],
  //   sampleSnapshot: snapshots[0]
  // })

  // Helper function to get snapshot stats for an endpoint
  const getEndpointStats = (endpointName: string) => {
    // Backend transforms snapshots: s.endpoint is already a STRING (endpoint name), not an object
    const endpointSnapshots = snapshots.filter((s: any) => {
      // The backend returns s.endpoint as the endpoint name string
      return s.endpoint === endpointName
    })
    
    const successful = endpointSnapshots.filter((s: any) => {
      // Check multiple possible success indicators
      return s.status === 'success' || 
             s.status === 'completed' || 
             // Check HTTP status codes directly - any 2xx is success
             (s.responseStatus >= 200 && s.responseStatus < 300) ||
             // Fallback: if we have response data and no error
             (!s.error && s.responseStatus)
    }).length
    const failed = endpointSnapshots.length - successful
    const lastSnapshot = endpointSnapshots.length > 0 
      ? new Date(Math.max(...endpointSnapshots.map((s: any) => new Date(s.timestamp).getTime())))
      : null

    // Debug logging for specific endpoint
    // if (endpointName && snapshots.length > 0) {
    //   console.log(`📊 Stats for ${endpointName}:`, {
    //     lookingFor: endpointName,
    //     allSnapshots: snapshots.length,
    //     allSnapshotEndpoints: snapshots.map(s => s.endpoint),
    //     endpointSnapshots: endpointSnapshots.length,
    //     endpointSnapshotsData: endpointSnapshots,
    //     sampleSnapshot: snapshots[0], // Show structure of first snapshot
    //     // Enhanced status debugging
    //     statusValues: endpointSnapshots.map(s => ({
    //       status: s.status,
    //       responseStatus: s.responseStatus, // Direct field from backend
    //       hasResponse: !!s.response,
    //       responseStatusNested: s.response?.status, // Nested field (if exists)
    //       hasError: !!s.error,
    //       errorValue: s.error,
    //       url: s.url,
    //       method: s.method
    //     })),
    //     successful,
    //     failed,
    //     lastSnapshot
    //   })
    // }

    return {
      total: endpointSnapshots.length,
      successful,
      failed,
      lastSnapshot,
      successRate: endpointSnapshots.length > 0 ? Math.round((successful / endpointSnapshots.length) * 100) : 0
    }
  }

  // Handle highlight parameter from URL
  useEffect(() => {
    const highlightEndpoint = searchParams.get('highlight')
    if (highlightEndpoint && endpoints.length > 0) {
      // Find the endpoint by name
      const endpoint = endpoints.find(e => e.name === highlightEndpoint)
      if (endpoint) {
        // Expand/highlight the endpoint
        setExpandedEndpoints(new Set([endpoint.name]))
        // Scroll to the endpoint after a short delay
        setTimeout(() => {
          const element = document.getElementById(`endpoint-${endpoint.name}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Add temporary highlight effect
            element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
            }, 3000)
          }
        }, 100)
      }
    }
  }, [searchParams, endpoints])

  // Auto-refresh timer - more frequent when WebSocket is disconnected
  useEffect(() => {
    // 60s when connected (WebSocket handles real-time), 15s when disconnected
    const refreshInterval = captureEvents.isConnected ? 60000 : 15000
    
    const interval = setInterval(async () => {
      await handleRefresh(false) // Silent refresh
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [currentSpace, captureEvents.isConnected])

  // WebSocket event listeners for real-time capture updates
  useEffect(() => {
    const handleCaptureStarted = (event: any) => {
      if (!event || event.space !== currentSpace) {
        console.log('🚀 Capture started event ignored:', { event, currentSpace })
        return
      }
      
      console.log('🚀 Capture started:', event)
      
      // Set loading state for affected endpoints
      const endpointNames = event.endpoints || []
      if (endpointNames.length > 0) {
        setSnapshotting(prev => {
          const newSet = new Set(prev)
          endpointNames.forEach((name: string) => newSet.add(name))
          return newSet
        })
      } else {
        // Bulk capture - set loading for all
        setBulkSnapshotting(true)
      }
      
      // Removed start toasts to prevent visual noise - progress bar provides sufficient feedback
    }

    const handleCaptureComplete = (event: any) => {
      if (event.space !== currentSpace) return
      
      console.log('✅ Capture completed:', event)
      
      // Clear loading states
      setSnapshotting(new Set())
      setBulkSnapshotting(false)
      
      // Show success notification via queue to prevent spam
      const { successful, failed } = event
      if (failed > 0) {
        queuedToast.error(`📸 Capture completed: ${successful} successful, ${failed} failed`)
      } else {
        queuedToast.success(`📸 All ${successful} snapshots captured successfully!`)
      }
      
      // Optimistic update: immediately update the last refresh time
      setLastRefresh(new Date())
      
      // Immediate fresh data fetch after capture
      setTimeout(async () => {
        console.log('🔄 Force refreshing snapshots after capture complete...')
        
        // Invalidate and refetch snapshots data to ensure fresh stats
        queryClient.invalidateQueries({ queryKey: ['snapshots', currentSpace] })
        await refetchSnapshots()
        console.log('✅ Fresh snapshots data loaded')
      }, 1000)
    }

    const handleCaptureError = (event: any) => {
      if (event.space !== currentSpace) return
      
      console.error('❌ Capture error:', event)
      
      // Clear loading states
      setSnapshotting(new Set())
      setBulkSnapshotting(false)
      
      queuedToast.error(`❌ Capture failed: ${event.error}`)
    }

    // Register event listeners
    captureEvents.onCaptureStarted(handleCaptureStarted)
    captureEvents.onCaptureComplete(handleCaptureComplete)
    captureEvents.onCaptureError(handleCaptureError)

    // Cleanup event listeners
    return () => {
      captureEvents.offCaptureStarted(handleCaptureStarted)
      captureEvents.offCaptureComplete(handleCaptureComplete)
      captureEvents.offCaptureError(handleCaptureError)
    }
  }, [currentSpace, captureEvents, queryClient, refetchSnapshots])

  // Smart refresh that adapts to WebSocket connectivity
  const handleRefresh = async (showLoading = true, force = false) => {
    if (showLoading) setIsRefreshing(true)
    
    try {
      // If WebSocket is disconnected and not reconnecting, try to reconnect first
      if (!captureEvents.isConnected && !captureEvents.isReconnecting && force) {
        console.log('🔄 Manual refresh triggered - attempting WebSocket reconnection...', {
          isConnected: captureEvents.isConnected,
          isReconnecting: captureEvents.isReconnecting,
          manualReconnectExists: typeof captureEvents.manualReconnect === 'function'
        })
        
        if (typeof captureEvents.manualReconnect === 'function') {
          captureEvents.manualReconnect()
          
          // Give the reconnection a moment to start
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          console.error('❌ manualReconnect function not available')
        }
      }
      
      // Removed refresh toast to prevent visual noise - spinning refresh button provides sufficient feedback
      
      await Promise.all([
        refetch(),
        refetchSnapshots()
      ])
      setLastRefresh(new Date())
      
      // Removed refresh success toasts to prevent visual noise - last updated timestamp provides feedback
    } catch (error) {
      console.error('Failed to refresh data:', error)
      toast.error('Failed to refresh data. Check your connection.')
    } finally {
      if (showLoading) setIsRefreshing(false)
    }
  }

  const createMutation = useMutation({
    mutationFn: (endpoint: ApiEndpoint) => endpointsApi.create(currentSpace, endpoint),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', currentSpace] })
      toast.success('ApiEndpoint created successfully')
      setIsCreating(false)
      setEditingEndpoint(null) // Also close when duplicating
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create endpoint')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ name, endpoint }: { name: string, endpoint: ApiEndpoint }) => 
      endpointsApi.update(currentSpace, name, endpoint),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', currentSpace] })
      toast.success('ApiEndpoint updated successfully')
      setEditingEndpoint(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update endpoint')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: ({ name, deleteSnapshots }: { name: string, deleteSnapshots?: boolean }) => 
      endpointsApi.delete(currentSpace, name, deleteSnapshots),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', currentSpace] })
      const snapshotMessage = variables.deleteSnapshots ? ' (snapshots also deleted)' : ''
      toast.success(`Endpoint deleted successfully${snapshotMessage}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete endpoint')
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ endpointNames, deleteSnapshots }: { endpointNames: string[], deleteSnapshots: boolean }) => {
      // Delete endpoints one by one
      const results = []
      for (const name of endpointNames) {
        try {
          await endpointsApi.delete(currentSpace, name, deleteSnapshots)
          results.push({ name, success: true })
        } catch (error) {
          results.push({ name, success: false, error })
        }
      }
      return results
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      queryClient.invalidateQueries({ queryKey: ['endpoints', currentSpace] })
      
      if (failed === 0) {
        const snapshotMessage = deleteSnapshots ? ' (snapshots also deleted)' : ''
        toast.success(`Successfully deleted ${successful} endpoint(s)${snapshotMessage}`)
      } else {
        toast.error(`Deleted ${successful} endpoint(s), ${failed} failed`)
      }
      
      // Clear selection and exit selection mode
      setSelectedEndpoints(new Set())
      setSelectionMode(false)
    },
    onError: (error: any) => {
      toast.error('Failed to delete endpoints')
    }
  })

  const importOpenAPIMutation = useMutation({
    mutationFn: ({ schema, options }: { schema: any, options: any }) => 
      endpointsApi.importOpenAPI(currentSpace, schema, options),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', currentSpace] })
      toast.success(result.message || 'OpenAPI schema imported successfully')
      setShowOpenAPIImport(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import OpenAPI schema')
    }
  })

  const handleDelete = (endpoint: ApiEndpoint) => {
    setDeleteTarget({ type: 'single', endpoint })
    setDeleteSnapshots(false) // Reset checkbox state
    setShowDeleteConfirm(true)
  }

  const handleBulkDelete = () => {
    if (selectedEndpoints.size === 0) return
    setDeleteTarget({ type: 'bulk' })
    setDeleteSnapshots(false) // Reset checkbox state
    setShowDeleteConfirm(true)
  }

  const confirmBulkDelete = () => {
    if (deleteTarget.type === 'single' && deleteTarget.endpoint) {
      // Single endpoint deletion
      deleteMutation.mutate({ name: deleteTarget.endpoint.name, deleteSnapshots })
    } else {
      // Bulk deletion
      const endpointNames = Array.from(selectedEndpoints)
      setBulkDeleting(true)
      bulkDeleteMutation.mutate({ endpointNames, deleteSnapshots })
      setBulkDeleting(false)
    }
    setShowDeleteConfirm(false)
  }

  const handleDuplicate = (endpoint: ApiEndpoint) => {
    const duplicatedEndpoint = {
      ...endpoint,
      name: `${endpoint.name} - Copy`,
      // Keep same URL/method/headers for easy modification
    }
    setEditingEndpoint(duplicatedEndpoint)
  }

  const handleSnapshot = async (endpointName: string) => {
    // Start progress tracking
    const operationId = captureProgress.startOperation({
      space: currentSpace,
      type: 'single',
      endpoints: [endpointName],
      total: 1,
      completed: 0,
      failed: 0
    })
    
    setSnapshotting(prev => new Set(prev).add(endpointName))
    
    try {
      // Call snapshot API with space and specific endpoint
      await snapshotsApi.capture(currentSpace, [endpointName])
      
      // Update progress on success
      captureProgress.updateProgress(operationId, { completed: 1 })
      captureProgress.completeOperation(operationId)
      
      // Removed individual snapshot toast to prevent flickering - progress bar provides enough feedback
      
      // Optimistic update: immediately update the last refresh time for instant feedback
      setLastRefresh(new Date())
      
      // Force fresh data after individual snapshot
      setTimeout(async () => {
        console.log('🔄 Force refreshing after individual snapshot...')
        queryClient.invalidateQueries({ queryKey: ['snapshots', currentSpace] })
        await refetchSnapshots()
        console.log('✅ Individual snapshot refresh completed')
      }, 1000)
    } catch (error: any) {
      // Update progress on failure
      captureProgress.updateProgress(operationId, { failed: 1 })
      captureProgress.completeOperation(operationId)
      
      queuedToast.error(error.response?.data?.message || `Failed to create snapshot for ${endpointName}`)
    } finally {
      setSnapshotting(prev => {
        const newSet = new Set(prev)
        newSet.delete(endpointName)
        return newSet
      })
    }
  }

  const handleBulkSnapshot = async (endpointNames?: string[]) => {
    const targets = endpointNames || endpoints.map((e: ApiEndpoint) => e.name)
    
    // Start progress tracking for bulk operation
    const operationId = captureProgress.startOperation({
      space: currentSpace,
      type: 'bulk',
      endpoints: targets,
      total: targets.length,
      completed: 0,
      failed: 0
    })
    
    setBulkSnapshotting(true)
    
    try {
      // Call bulk snapshot API
      await snapshotsApi.capture(currentSpace, targets)
      
      // Note: Progress will be updated via WebSocket events
      // For now, mark as completed 
      captureProgress.updateProgress(operationId, { completed: targets.length })
      captureProgress.completeOperation(operationId)
      
      // Removed bulk success toast to prevent flickering - completion will be shown via WebSocket event
      
      // Optimistic update: immediately update the last refresh time for instant feedback
      setLastRefresh(new Date())
      
      // Force fresh data after bulk snapshot
      setTimeout(async () => {
        console.log('🔄 Force refreshing after bulk snapshot...')
        queryClient.invalidateQueries({ queryKey: ['snapshots', currentSpace] })
        await refetchSnapshots()
        console.log('✅ Bulk snapshot refresh completed')
      }, 1500)
    } catch (error: any) {
      // Mark all as failed on API error
      captureProgress.updateProgress(operationId, { failed: targets.length })
      captureProgress.completeOperation(operationId)
      
      queuedToast.error(error.response?.data?.message || 'Failed to create bulk snapshots')
    } finally {
      setBulkSnapshotting(false)
    }
  }

  const toggleEndpointSelection = (endpointName: string) => {
    setSelectedEndpoints(prev => {
      const newSet = new Set(prev)
      if (newSet.has(endpointName)) {
        newSet.delete(endpointName)
      } else {
        newSet.add(endpointName)
      }
      return newSet
    })
  }

  const selectAllEndpoints = () => {
    setSelectedEndpoints(new Set(endpoints.map((e: ApiEndpoint) => e.name)))
  }

  const clearSelection = () => {
    setSelectedEndpoints(new Set())
  }

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    setShowActionsMenu(false) // Close menu when toggling
    if (!selectionMode) {
      // Entering selection mode - clear any existing selections
      setSelectedEndpoints(new Set())
    } else {
      // Exiting selection mode - clear selections
      setSelectedEndpoints(new Set())
    }
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedEndpoints(new Set())
  }

  const allSelected = selectedEndpoints.size === endpoints.length && endpoints.length > 0

  // Handle smart snapshot button logic
  const getSnapshotButtonText = () => {
    if (selectedEndpoints.size === 0) {
      return `Snapshot All (${endpoints.length})`
    } else if (allSelected) {
      return `Snapshot All (${endpoints.length})`
    } else {
      return `Snapshot Selected (${selectedEndpoints.size})`
    }
  }

  const handleSmartSnapshot = () => {
    if (selectedEndpoints.size === 0 || allSelected) {
      // No selection or all selected - snapshot all
      handleBulkSnapshot()
    } else {
      // Some selected - snapshot only selected
      handleBulkSnapshot(Array.from(selectedEndpoints))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Endpoints</h1>
          <p className="text-muted-foreground">Loading endpoints...</p>
        </div>
      </div>
    )
  }

  // Get active operation status for status bar
  const activeOperation = captureProgress.getActiveOperation(currentSpace)
  const isCapturing = activeOperation?.isActive || bulkSnapshotting || snapshotting.size > 0

  return (
    <>
      {/* Thin Progress Line - Fixed behind header border */}
      <ThinStatusBar 
        isActive={isCapturing}
        status={isCapturing ? 'loading' : 'idle'}
      />
    
      <div className="space-y-6">
      
      <div className="flex items-center justify-between gap-2 lg:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="p-1 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Go back to the main dashboard overview"
          >
            <Home className="h-4 w-4" />
          </button>
          <span className="text-lg text-muted-foreground shrink-0">/</span>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-1 lg:gap-2 min-w-0">
            <span className="truncate">Endpoints</span>
            {isCapturing && <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin text-blue-600 shrink-0" />}
            {/* Mobile connection indicator */}
            <div 
              className={`w-2 h-2 rounded-full shrink-0 sm:hidden ${
                captureEvents.isConnected ? 'bg-green-500' :
                captureEvents.isReconnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`}
              title={`Connection: ${
                captureEvents.isConnected ? 'Live connection active' :
                captureEvents.isReconnecting ? `Reconnecting (attempt ${captureEvents.reconnectAttempts}/10)` : 
                'Offline - no real-time updates'
              }`}
            />
          </h1>
          <div className="flex items-center gap-2 shrink-0 hidden sm:block">
            <div 
              className="text-muted-foreground text-xs lg:text-sm px-2 py-1 bg-gray-100 rounded cursor-help flex items-center gap-2"
              title={`Space: ${currentSpace} - Manage your API endpoints for this environment`}
            >
              <span>{currentSpace}</span>
              <div 
                className={`w-2 h-2 rounded-full ${
                  captureEvents.isConnected ? 'bg-green-500' :
                  captureEvents.isReconnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                }`}
                title={`Connection: ${
                  captureEvents.isConnected ? 'Live connection active' :
                  captureEvents.isReconnecting ? `Reconnecting (attempt ${captureEvents.reconnectAttempts}/10)` : 
                  'Offline - no real-time updates'
                }`}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 lg:gap-2 shrink-0">
          {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh(true, true)}
              disabled={isRefreshing || isCapturing}
              className={`h-8 w-8 lg:h-9 lg:w-auto lg:px-3 p-0 lg:gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                !captureEvents.isConnected && !captureEvents.isReconnecting 
                  ? 'border-orange-300 text-orange-600 hover:bg-orange-50' 
                  : captureEvents.isReconnecting 
                    ? 'border-yellow-300 text-yellow-600 hover:bg-yellow-50' 
                    : ''
              }`}
              title={
                isCapturing 
                  ? 'Please wait for current operations to complete'
                  : captureEvents.isReconnecting 
                    ? 'Reconnecting to server...'
                    : !captureEvents.isConnected 
                      ? 'WebSocket disconnected - click to refresh data and reconnect'
                      : 'Refresh data (auto-refresh is active)'
              }
            >
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 lg:h-4 lg:w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 lg:h-4 lg:w-4" />
              )}
              <span className="hidden lg:inline text-xs">
                {isRefreshing ? 'Refreshing...' : 
                 isCapturing ? 'Wait...' :
                 captureEvents.isReconnecting ? 'Reconnecting...' :
                 !captureEvents.isConnected ? 'Offline' : 'Refresh'}
              </span>
            </Button>
            
            <Button 
              onClick={() => setIsCreating(true)} 
              size="sm"
              disabled={isCapturing}
              className="h-8 w-8 lg:h-9 lg:w-auto lg:px-3 p-0 lg:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isCapturing ? "Please wait for current operations to complete" : "Create a new API endpoint to monitor"}
            >
              <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden lg:inline text-xs">Add</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOpenAPIImport(true)}
              disabled={isCapturing}
              className="h-8 w-8 lg:h-9 lg:w-auto lg:px-3 p-0 lg:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isCapturing ? "Please wait for current operations to complete" : "Import endpoints from OpenAPI/Swagger schema file"}
            >
              <FileDown className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden lg:inline text-xs">Import</span>
            </Button>
            
            {/* Three Dots Menu */}
            {endpoints.length > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="h-8 w-8 lg:h-9 lg:w-9 p-0"
                  title="More actions: Enable selection mode for bulk operations"
                >
                  <MoreVertical className="h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
              
              {/* Dropdown Menu */}
              {showActionsMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <button
                    onClick={toggleSelectionMode}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    {selectionMode ? (
                      <>
                        <X className="h-4 w-4" />
                        Exit Selection Mode
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4" />
                        Selection Mode
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {/* Close menu when clicking outside */}
              {showActionsMenu && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowActionsMenu(false)}
                />
              )}
              </div>
            )}
        </div>
      </div>

      {/* Bulk Actions - Only show when in selection mode */}
      {selectionMode && endpoints.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => e.target.checked ? selectAllEndpoints() : clearSelection()}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span 
                    className="text-sm font-medium text-blue-800 cursor-pointer hover:text-blue-900"
                    onClick={() => allSelected ? clearSelection() : selectAllEndpoints()}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                    {selectedEndpoints.size > 0 && ` (${selectedEndpoints.size}/${endpoints.length})`}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSmartSnapshot}
                  disabled={bulkSnapshotting || selectedEndpoints.size === 0 || isCapturing}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="sm"
                  title={
                    isCapturing 
                      ? "Please wait for current operations to complete"
                      : selectedEndpoints.size === 0 || selectedEndpoints.size === endpoints.length
                        ? `Capture snapshots for all ${endpoints.length} endpoints`
                        : `Capture snapshots for the ${selectedEndpoints.size} selected endpoints`
                  }
                >
                  {bulkSnapshotting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {getSnapshotButtonText()}
                </Button>
                
                {/* Bulk Delete Button */}
                <Button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending || selectedEndpoints.size === 0 || isCapturing}
                  variant="outline"
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="sm"
                  title={
                    isCapturing 
                      ? "Please wait for current operations to complete"
                      : `Permanently delete the ${selectedEndpoints.size} selected endpoints (you can choose whether to also delete their snapshots)`
                  }
                >
                  {bulkDeleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {allSelected ? `Delete All (${endpoints.length})` : `Delete Selected (${selectedEndpoints.size})`}
                </Button>
                
                {/* Close Selection Mode */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exitSelectionMode}
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                  title="Exit selection mode and return to normal view"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endpoints List */}
      <div className="grid gap-4">
        {endpoints.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No endpoints configured</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first API endpoint to start monitoring
              </p>
              <Button onClick={() => setIsCreating(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add ApiEndpoint
              </Button>
            </CardContent>
          </Card>
        ) : (
          endpoints.map((endpoint: ApiEndpoint) => {
            const stats = getEndpointStats(endpoint.name)
            return (
              <Card 
                key={endpoint.name} 
                id={`endpoint-${endpoint.name}`}
                className="transition-all duration-300 hover:shadow-md"
              >
                <CardHeader className="pb-3 min-h-[80px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Only show checkbox in selection mode */}
                      {selectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedEndpoints.has(endpoint.name)}
                          onChange={() => toggleEndpointSelection(endpoint.name)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      )}
                      <CardTitle className="text-lg">{String(endpoint.name || 'Unnamed Endpoint')}</CardTitle>
                      
                      {/* Snapshot button next to title */}
                      <button
                        onClick={() => handleSnapshot(endpoint.name)}
                        disabled={snapshotting.has(endpoint.name)}
                        className={`h-8 w-8 flex items-center justify-center rounded-full border transition-colors ${
                          snapshotting.has(endpoint.name)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                        title={snapshotting.has(endpoint.name) 
                          ? 'Creating a new snapshot of this endpoint...' 
                          : 'Click to capture a snapshot of this endpoint\'s current response'
                        }
                      >
                        {snapshotting.has(endpoint.name) ? (
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 text-gray-600 hover:text-blue-600" />
                        )}
                      </button>
                      
                      <div className="flex items-center gap-3 text-sm transition-all duration-300">
                        <div className="flex items-center gap-1 transition-colors duration-300" title={`${stats.successful} successful snapshots out of ${stats.total} total${stats.total > 0 ? ` (${stats.successRate}% success rate)` : ''}`}>
                          <Camera className="h-3 w-3 text-gray-400" />
                          <span className={`font-medium transition-colors duration-300 ${
                            stats.total === 0 ? 'text-gray-400' :
                            stats.successRate === 100 ? 'text-green-600' :
                            stats.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {stats.successful}/{stats.total}
                          </span>
                        </div>
                        {stats.lastSnapshot && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground transition-all duration-300">
                            <button
                              onClick={async () => {
                                const fullTimestamp = stats.lastSnapshot!.toLocaleString()
                                try {
                                  await navigator.clipboard.writeText(fullTimestamp)
                                  toast.success(`Copied: ${fullTimestamp}`, { duration: 2000 })
                                } catch (error) {
                                  toast.error('Failed to copy timestamp')
                                }
                              }}
                              title={`Last snapshot: ${stats.lastSnapshot.toLocaleString()}\n\nClick to copy full timestamp to clipboard`}
                              className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer p-0.5 rounded hover:bg-blue-50"
                            >
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatRelativeTime(stats.lastSnapshot)}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(endpoint)}
                        disabled={isCapturing}
                        className="h-8 w-8 lg:w-auto lg:px-3 p-0 lg:gap-2 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isCapturing ? "Please wait for current operations to complete" : "Create a copy of this endpoint with the same configuration for testing variations"}
                      >
                        <Copy className="h-3 w-3" />
                        <span className="hidden lg:inline text-xs">Duplicate</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEndpoint(endpoint)}
                        disabled={isCapturing}
                        className="h-8 w-8 lg:w-auto lg:px-3 p-0 lg:gap-2 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isCapturing ? "Please wait for current operations to complete" : "Edit this endpoint's URL, method, headers, and other settings"}
                      >
                        <Edit3 className="h-3 w-3" />
                        <span className="hidden lg:inline text-xs">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(endpoint)}
                        disabled={isCapturing}
                        className="h-8 w-8 lg:w-auto lg:px-3 p-0 lg:gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isCapturing ? "Please wait for current operations to complete" : "Delete this endpoint permanently (you can choose whether to also delete snapshots)"}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="hidden lg:inline text-xs">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Main URL and Method */}
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                        endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                        endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                        endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                        endpoint.method === 'PATCH' ? 'bg-purple-100 text-purple-800' :
                        endpoint.method === 'HEAD' ? 'bg-gray-100 text-gray-800' :
                        endpoint.method === 'OPTIONS' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {String(endpoint.method || 'GET')}
                      </span>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1">
                        {String(endpoint.url || '')}
                      </code>
                      {/* Inline Auth Badge */}
                      {endpoint.auth && (endpoint.auth.type || endpoint.auth.token) && (
                        <span 
                          className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                          title={`Authentication method: ${endpoint.auth.type || 'Custom'}\n${endpoint.auth.type === 'bearer' ? 'Uses Bearer token authentication' : endpoint.auth.type === 'basic' ? 'Uses Basic authentication' : endpoint.auth.type === 'api-key' ? 'Uses API key authentication' : 'Custom authentication setup'}`}
                        >
                          Auth: {String(endpoint.auth.type || 'Custom')}
                        </span>
                      )}
                    </div>


                    {/* Request Body */}
                    {endpoint.body && (
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="text-xs font-medium text-blue-600 mb-1">Request Body:</div>
                        <div className="text-xs font-mono text-blue-700 max-h-20 overflow-y-auto">
                          {typeof endpoint.body === 'object' ? JSON.stringify(endpoint.body) : String(endpoint.body || '')}
                        </div>
                      </div>
                    )}

                    {/* Headers - More Compact */}
                    {endpoint.headers && Object.keys(endpoint.headers).length > 0 && (
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs font-medium text-gray-600 mb-1">Headers:</div>
                        <div className="grid grid-cols-1 gap-1 text-xs">
                          {Object.entries(endpoint.headers).map(([key, value]) => (
                            <div key={key} className="font-mono text-gray-700">
                              <span className="text-gray-500">{key}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingEndpoint) && (
        <EndpointForm
          endpoint={editingEndpoint}
          endpoints={endpoints}
          onSave={(endpoint) => {
            // If it's a duplicate (name contains "- Copy"), treat as new creation
            const isDuplicate = editingEndpoint?.name?.includes(' - Copy')
            
            if (editingEndpoint && !isDuplicate) {
              // True edit of existing endpoint
              updateMutation.mutate({ name: editingEndpoint.name, endpoint })
            } else {
              // New endpoint creation (including duplicates)
              createMutation.mutate(endpoint)
            }
          }}
          onCancel={() => {
            setIsCreating(false)
            setEditingEndpoint(null)
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                {deleteTarget.type === 'single' ? 'Confirm Deletion' : 'Confirm Bulk Deletion'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {deleteTarget.type === 'single' && deleteTarget.endpoint ? (
                    <>Are you sure you want to delete endpoint <strong>"{deleteTarget.endpoint.name}"</strong>?</>
                  ) : (
                    <>Are you sure you want to delete <strong>{selectedEndpoints.size}</strong> selected endpoint(s)?</>
                  )}
                </p>
                
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="text-xs text-red-700 font-medium mb-2">
                    {deleteTarget.type === 'single' ? 'Endpoint to be deleted:' : 'Endpoints to be deleted:'}
                  </p>
                  <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {deleteTarget.type === 'single' && deleteTarget.endpoint ? (
                      <li className="flex items-center gap-1">
                        <Trash2 className="h-3 w-3" />
                        {deleteTarget.endpoint.name}
                      </li>
                    ) : (
                      Array.from(selectedEndpoints).map(name => (
                        <li key={name} className="flex items-center gap-1">
                          <Trash2 className="h-3 w-3" />
                          {name}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <input
                    type="checkbox"
                    id="deleteSnapshots"
                    checked={deleteSnapshots}
                    onChange={(e) => setDeleteSnapshots(e.target.checked)}
                    className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 mt-0.5"
                  />
                  <div>
                    <label htmlFor="deleteSnapshots" className="text-sm font-medium text-yellow-800 cursor-pointer">
                      {deleteTarget.type === 'single' 
                        ? 'Also delete all snapshots for this endpoint'
                        : 'Also delete all snapshots for these endpoints'
                      }
                    </label>
                    <p className="text-xs text-yellow-700 mt-1">
                      {deleteTarget.type === 'single'
                        ? 'If checked, all snapshot files associated with this endpoint will be permanently deleted from storage.'
                        : 'If checked, all snapshot files associated with these endpoints will be permanently deleted from storage.'
                      }
                    </p>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500">
                  ⚠️ This action cannot be undone.
                </p>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={confirmBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {bulkDeleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {deleteTarget.type === 'single' && deleteTarget.endpoint
                      ? `Delete "${deleteTarget.endpoint.name}"`
                      : `Delete ${selectedEndpoints.size} Endpoint(s)`
                    }
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={bulkDeleteMutation.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* OpenAPI Import Modal */}
      {showOpenAPIImport && (
        <OpenAPIImport
          onImport={(schema, options) => {
            importOpenAPIMutation.mutate({ 
              schema, 
              options
            })
          }}
          onClose={() => setShowOpenAPIImport(false)}
          existingEndpoints={endpoints}
          currentSpace={currentSpace}
        />
      )}
      </div>
    </>
  )
}

// ApiEndpoint Form Component
interface EndpointFormProps {
  endpoint?: ApiEndpoint | null
  endpoints: ApiEndpoint[]
  onSave: (endpoint: ApiEndpoint) => void
  onCancel: () => void
  isLoading: boolean
}

function EndpointForm({ endpoint, endpoints, onSave, onCancel, isLoading }: EndpointFormProps) {
  const { currentSpace } = useSpace()
  const spaceParameterManager = getSpaceParameterManager(currentSpace)
  
  const [formData, setFormData] = useState<ApiEndpoint>({
    name: endpoint?.name || '',
    url: endpoint?.url || '',
    method: endpoint?.method || 'GET',
    headers: endpoint?.headers || {},
    body: endpoint?.body || '',
    auth: endpoint?.auth || {},
    parameters: endpoint?.parameters || {}
  })

  // Focus on name field for duplicated endpoints
  const isDuplicated = endpoint?.name?.includes(' - Copy')

  const [newHeaderKey, setNewHeaderKey] = useState('')
  const [newHeaderValue, setNewHeaderValue] = useState('')
  const [isCustomHeader, setIsCustomHeader] = useState(false)
  const [isCustomValue, setIsCustomValue] = useState(false)
  const [preservedBody, setPreservedBody] = useState(endpoint?.body || '')
  
  // Parameter management state
  const [showParameters, setShowParameters] = useState(false)
  const [endpointParams, setEndpointParams] = useState<EndpointParameters | null>(null)

  // Common HTTP headers with their typical values
  const commonHeaders = {
    'Authorization': ['Bearer YOUR_TOKEN_HERE', 'Basic YOUR_CREDENTIALS_HERE', 'API-Key YOUR_KEY_HERE'],
    'Content-Type': ['application/json', 'application/xml', 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data'],
    'Accept': ['application/json', 'application/xml', 'text/html', 'text/plain', '*/*'],
    'Accept-Language': ['en-US', 'en', 'es', 'fr', 'de'],
    'Accept-Encoding': ['gzip, deflate, br', 'gzip, deflate', 'identity'],
    'Cache-Control': ['no-cache', 'no-store', 'max-age=3600', 'public', 'private'],
    'User-Agent': ['MyApp/1.0', 'Mozilla/5.0 (compatible)', 'Custom-Client/1.0'],
    'X-API-Key': ['YOUR_API_KEY_HERE'],
    'X-Requested-With': ['XMLHttpRequest'],
    'Origin': ['https://example.com'],
    'Referer': ['https://example.com/page'],
    'If-Modified-Since': ['Wed, 21 Oct 2015 07:28:00 GMT'],
    'Custom': []
  }

  const handleHeaderKeyChange = (value: string) => {
    if (value === 'Custom') {
      setNewHeaderKey('')
      setIsCustomHeader(true)
      setIsCustomValue(false)
      setNewHeaderValue('')
    } else {
      setNewHeaderKey(value)
      setIsCustomHeader(false)
      setIsCustomValue(false)
      
      // Auto-suggest first common value for selected header
      if (commonHeaders[value as keyof typeof commonHeaders]) {
        const suggestions = commonHeaders[value as keyof typeof commonHeaders]
        if (suggestions.length > 0) {
          setNewHeaderValue(suggestions[0])
        }
      } else {
        setNewHeaderValue('')
      }
    }
  }

  const handleHeaderValueChange = (value: string) => {
    if (value === '__CUSTOM__') {
      setIsCustomValue(true)
      setNewHeaderValue('')
    } else {
      setIsCustomValue(false)
      
      // If the value contains placeholder text, switch to custom input for easy editing
      if (value.includes('YOUR_TOKEN_HERE') || value.includes('YOUR_CREDENTIALS_HERE') || value.includes('YOUR_KEY_HERE') || value.includes('YOUR_API_KEY_HERE')) {
        setIsCustomValue(true)
        setNewHeaderValue(value)
      } else {
        setNewHeaderValue(value)
      }
    }
  }

  // Handle ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCancel])

  // Initialize preserved body when editing existing endpoint with body
  useEffect(() => {
    if (endpoint?.body && ['POST', 'PUT', 'PATCH', 'OPTIONS'].includes(endpoint.method)) {
      setPreservedBody(endpoint.body)
    }
  }, [endpoint])

  // Parse parameters whenever URL, headers, or body changes
  useEffect(() => {
    const parsed = parseEndpointParameters({
      url: formData.url,
      headers: formData.headers,
      body: formData.body
    })
    
    setEndpointParams(parsed)
    
    // Auto-expand parameters section if parameters are detected
    if (parsed.totalCount > 0 && !showParameters) {
      setShowParameters(true)
    }
    
    // Use space-consistent parameter values
    if (parsed.totalCount > 0) {
      // Get space-consistent parameters for this endpoint
      const spaceConsistentParams = spaceParameterManager.mergeEndpointParameters({
        ...formData,
        url: formData.url,
        headers: formData.headers,
        body: formData.body
      })
      
      // Update form data if parameters changed
      if (JSON.stringify(spaceConsistentParams) !== JSON.stringify(formData.parameters)) {
        console.log(`🎯 Updated endpoint "${formData.name}" with space-consistent parameters:`, spaceConsistentParams)
        setFormData(prev => ({ ...prev, parameters: spaceConsistentParams }))
      }
    } else {
      // No parameters detected, clear parameter field
      if (Object.keys(formData.parameters || {}).length > 0) {
        setFormData(prev => ({ ...prev, parameters: {} }))
      }
    }
  }, [formData.url, formData.headers, formData.body, currentSpace])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Trim all string fields
    const trimmedData: ApiEndpoint = {
      ...formData,
      name: formData.name.trim(),
      url: formData.url.trim(),
      method: formData.method,
      body: formData.body?.trim() || '',
      headers: Object.fromEntries(
        Object.entries(formData.headers || {}).map(([key, value]) => [key.trim(), String(value).trim()])
      ),
      auth: formData.auth ? {
        ...formData.auth,
        type: formData.auth.type?.trim(),
        token: formData.auth.token?.trim()
      } : undefined
    }
    
    if (!trimmedData.name || !trimmedData.url) {
      toast.error('Name and URL are required')
      return
    }

    // Check for duplicate names (only for new endpoints or when name changed)
    const isDuplicate = endpoint?.name?.includes(' - Copy')
    const isEditingWithSameName = endpoint && !isDuplicate && endpoint.name === trimmedData.name
    
    if (!isEditingWithSameName) {
      const existingApiEndpoint = endpoints.find(e => e.name === trimmedData.name)
      if (existingApiEndpoint) {
        toast.error(`ApiEndpoint name "${trimmedData.name}" already exists`)
        return
      }
    }

    // Optional: Warn about duplicate URLs (but allow them since same URL with different methods/headers can be useful)
    const duplicateUrl = endpoints.find(e => e.url === trimmedData.url && e.method === trimmedData.method)
    if (duplicateUrl && duplicateUrl.name !== endpoint?.name) {
      if (!confirm(`The URL and method are already used by "${duplicateUrl.name}". Create "${trimmedData.name}" anyway?`)) {
        return
      }
    }

    onSave(trimmedData)
  }

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      setFormData({
        ...formData,
        headers: {
          ...formData.headers,
          [newHeaderKey]: newHeaderValue
        }
      })
      setNewHeaderKey('')
      setNewHeaderValue('')
    }
  }

  const removeHeader = (key: string) => {
    const { [key]: removed, ...rest } = formData.headers || {}
    setFormData({ ...formData, headers: rest })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {!endpoint ? 'Add ApiEndpoint' : 
             isDuplicated ? 'Duplicate ApiEndpoint' : 'Edit ApiEndpoint'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="my-api-endpoint"
                autoFocus={isDuplicated}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Method & URL</label>
              <div className="flex gap-2 mt-1">
                <select
                  value={formData.method}
                  onChange={(e) => {
                    const newMethod = e.target.value as ApiEndpoint['method']
                    const oldMethod = formData.method
                    
                    // Clear body when switching from body-supporting method to non-body method
                    const bodyMethods = ['POST', 'PUT', 'PATCH', 'OPTIONS']
                    const hadBody = bodyMethods.includes(oldMethod)
                    const willHaveBody = bodyMethods.includes(newMethod)
                    
                    let newBody = formData.body
                    let newHeaders = { ...formData.headers }
                    
                    if (hadBody && !willHaveBody && formData.body) {
                      // Switching from body method to non-body method - preserve the body
                      setPreservedBody(formData.body)
                      newBody = ''
                      
                      // Also remove Content-Type header
                      delete newHeaders['Content-Type']
                      delete newHeaders['content-type']
                      
                      toast(`Request body hidden - ${newMethod} requests don't use body (your content is preserved)`, {
                        icon: 'ℹ️',
                      })
                    } else if (!hadBody && willHaveBody && preservedBody) {
                      // Switching back to body method - restore preserved body
                      newBody = preservedBody
                      toast.success('Request body restored')
                    }
                    
                    setFormData({ 
                      ...formData, 
                      method: newMethod,
                      body: newBody,
                      headers: newHeaders
                    })
                  }}
                  className="w-24 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                  <option value="HEAD">HEAD</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.example.com/endpoint"
                  required
                />
              </div>
            </div>

            {/* Request Body - Show for methods that typically use body */}
            {['POST', 'PUT', 'PATCH', 'OPTIONS'].includes(formData.method) && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Request Body</label>
                  {formData.body && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, body: '' })
                        setPreservedBody('')
                      }}
                      className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                      title="Clear body content"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>
                {/* Check if Content-Type is multipart/form-data */}
                {(formData.headers?.['Content-Type'] === 'multipart/form-data' || formData.headers?.['content-type'] === 'multipart/form-data') ? (
                  <div className="mt-1 p-3 border border-gray-300 rounded-md bg-blue-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-blue-700 font-medium">Multipart Form Data</span>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">File uploads supported</span>
                    </div>
                    <textarea
                      value={formData.body}
                      onChange={(e) => {
                        setFormData({ ...formData, body: e.target.value })
                        // Also update preserved body when typing
                        setPreservedBody(e.target.value)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder='--boundary\nContent-Disposition: form-data; name="field1"\n\nvalue1\n--boundary\nContent-Disposition: form-data; name="file"; filename="example.txt"\nContent-Type: text/plain\n\nfile content here\n--boundary--'
                      rows={6}
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Use multipart format with boundaries for file uploads and form fields
                    </p>
                  </div>
                ) : (formData.headers?.['Content-Type'] === 'application/x-www-form-urlencoded' || formData.headers?.['content-type'] === 'application/x-www-form-urlencoded') ? (
                  <div className="mt-1 p-3 border border-gray-300 rounded-md bg-yellow-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-yellow-700 font-medium">URL Encoded Form</span>
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">key=value pairs</span>
                    </div>
                    <textarea
                      value={formData.body}
                      onChange={(e) => {
                        setFormData({ ...formData, body: e.target.value })
                        // Also update preserved body when typing
                        setPreservedBody(e.target.value)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="key1=value1&key2=value2&email=user@example.com"
                      rows={3}
                    />
                    <p className="text-xs text-yellow-600 mt-1">
                      💡 Format: key=value pairs separated by &
                    </p>
                  </div>
                ) : (formData.headers?.['Content-Type']?.includes('json') || formData.headers?.['content-type']?.includes('json')) ? (
                  <div className="mt-1 p-3 border border-gray-300 rounded-md bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-green-700 font-medium">JSON Data</span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">application/json</span>
                    </div>
                    <textarea
                      value={formData.body}
                      onChange={(e) => {
                        setFormData({ ...formData, body: e.target.value })
                        // Also update preserved body when typing
                        setPreservedBody(e.target.value)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                      placeholder='{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "age": 30\n}'
                      rows={4}
                    />
                    <p className="text-xs text-green-600 mt-1">
                      💡 Valid JSON format with proper syntax
                    </p>
                  </div>
                ) : (formData.headers?.['Content-Type']?.includes('xml') || formData.headers?.['content-type']?.includes('xml')) ? (
                  <div className="mt-1 p-3 border border-gray-300 rounded-md bg-purple-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-purple-700 font-medium">XML Data</span>
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">application/xml</span>
                    </div>
                    <textarea
                      value={formData.body}
                      onChange={(e) => {
                        setFormData({ ...formData, body: e.target.value })
                        // Also update preserved body when typing
                        setPreservedBody(e.target.value)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                      placeholder='<?xml version="1.0" encoding="UTF-8"?>\n<user>\n  <name>John Doe</name>\n  <email>john@example.com</email>\n  <age>30</age>\n</user>'
                      rows={5}
                    />
                    <p className="text-xs text-purple-600 mt-1">
                      💡 Well-formed XML with proper tags and encoding
                    </p>
                  </div>
                ) : (
                  <textarea
                    value={formData.body}
                    onChange={(e) => {
                      const newBody = e.target.value
                      setFormData({ ...formData, body: newBody })
                      
                      // Also update preserved body when typing
                      setPreservedBody(newBody)
                      
                      // Auto-detect and suggest Content-Type
                      if (newBody.trim() && !formData.headers?.['Content-Type'] && !formData.headers?.['content-type']) {
                        let suggestedContentType = ''
                        
                        // Detect JSON
                        if (newBody.trim().startsWith('{') || newBody.trim().startsWith('[')) {
                          suggestedContentType = 'application/json'
                        }
                        // Detect XML
                        else if (newBody.trim().startsWith('<')) {
                          suggestedContentType = 'application/xml'
                        }
                        // Detect form data
                        else if (newBody.includes('=') && newBody.includes('&')) {
                          suggestedContentType = 'application/x-www-form-urlencoded'
                        }
                        // Detect HTML
                        else if (newBody.toLowerCase().includes('<html') || newBody.toLowerCase().includes('<!doctype html')) {
                          suggestedContentType = 'text/html'
                        }
                        // Detect CSV
                        else if (newBody.includes(',') && newBody.split('\n').length > 1) {
                          suggestedContentType = 'text/csv'
                        }
                        // Default to plain text for any other content
                        else if (newBody.trim().length > 0) {
                          suggestedContentType = 'text/plain'
                        }
                        
                        // Auto-add Content-Type header if detected
                        if (suggestedContentType) {
                          setFormData((prev: ApiEndpoint) => ({
                            ...prev,
                            body: newBody,
                            headers: {
                              ...prev.headers,
                              'Content-Type': suggestedContentType
                            }
                          }))
                        }
                      }
                    }}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder='{"key": "value"} or <xml>data</xml> or key=value&key2=value2'
                    rows={4}
                  />
                )}
                {!(formData.headers?.['Content-Type'] || formData.headers?.['content-type']) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Content-Type header will be auto-detected: JSON, XML, form data, CSV, HTML, or plain text.
                  </p>
                )}
              </div>
            )}

            {/* Headers */}
            <div>
              <label className="text-sm font-medium">Headers</label>
              <div className="mt-2 space-y-2">
                {Object.entries(formData.headers || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1">
                    <div className="flex-1 flex gap-1">
                      <span className="w-32 px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded text-gray-700 font-medium">
                        {key}
                      </span>
                      <span className="flex-1 px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded text-gray-600 font-mono">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-red-50 hover:bg-red-100 text-red-600"
                      title="Remove header"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="space-y-2">
                  {/* Show header selector when nothing is selected */}
                  {!newHeaderKey && !isCustomHeader ? (
                    <div className="flex items-center gap-1">
                      <div className="flex-1 flex gap-1">
                        <select
                          value=""
                          onChange={(e) => handleHeaderKeyChange(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select header to add...</option>
                          {Object.keys(commonHeaders).map(header => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    /* Show name/value inputs once header is selected */
                    <div className="flex items-center gap-1">
                      <div className="flex-1 flex gap-1">
                        {/* Header Name Display/Input */}
                        {isCustomHeader ? (
                          <input
                            type="text"
                            placeholder="Custom header name"
                            value={newHeaderKey}
                            onChange={(e) => setNewHeaderKey(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                e.stopPropagation()
                                if (newHeaderKey.trim() && newHeaderValue.trim()) {
                                  addHeader()
                                }
                              }
                            }}
                            className="w-32 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <span className="w-32 px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded text-gray-700 font-medium flex items-center">
                            {newHeaderKey}
                          </span>
                        )}
                        
                        {/* Header Value - Smart input with suggestions */}
                        <div className="flex-1 relative">
                          {isCustomValue || !newHeaderKey || isCustomHeader || !commonHeaders[newHeaderKey as keyof typeof commonHeaders] ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="Header value"
                                value={newHeaderValue}
                                onChange={(e) => setNewHeaderValue(e.target.value)}
                                onFocus={(e) => {
                                  // Auto-select placeholder text for easy replacement
                                  if (newHeaderValue.includes('YOUR_TOKEN_HERE') || newHeaderValue.includes('YOUR_CREDENTIALS_HERE') || 
                                      newHeaderValue.includes('YOUR_KEY_HERE') || newHeaderValue.includes('YOUR_API_KEY_HERE')) {
                                    e.target.select()
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (newHeaderKey.trim() && newHeaderValue.trim()) {
                                      addHeader()
                                    }
                                  }
                                }}
                                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                autoFocus={isCustomValue}
                              />
                              {/* Back to templates button - only show when we have templates and are in custom mode */}
                              {isCustomValue && newHeaderKey && !isCustomHeader && commonHeaders[newHeaderKey as keyof typeof commonHeaders] && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCustomValue(false)
                                    const suggestions = commonHeaders[newHeaderKey as keyof typeof commonHeaders]
                                    setNewHeaderValue(suggestions.length > 0 ? suggestions[0] : '')
                                  }}
                                  className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 text-gray-600"
                                  title="Back to templates"
                                >
                                  ↺
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <select
                                value={newHeaderValue}
                                onChange={(e) => handleHeaderValueChange(e.target.value)}
                                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select value...</option>
                                {commonHeaders[newHeaderKey as keyof typeof commonHeaders].map((value, index) => (
                                  <option key={index} value={value}>
                                    {value}
                                  </option>
                                ))}
                                <option value="__CUSTOM__">💭 Custom value...</option>
                              </select>
                              {/* Edit button for placeholder values */}
                              {newHeaderValue && (newHeaderValue.includes('YOUR_TOKEN_HERE') || newHeaderValue.includes('YOUR_CREDENTIALS_HERE') || 
                               newHeaderValue.includes('YOUR_KEY_HERE') || newHeaderValue.includes('YOUR_API_KEY_HERE')) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCustomValue(true)
                                  }}
                                  className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-blue-50 hover:bg-blue-100 text-blue-600"
                                  title="Edit this value"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Add/Cancel buttons */}
                      <div className="flex gap-1">
                        <button 
                          type="button" 
                          onClick={addHeader}
                          disabled={!newHeaderKey.trim() || !newHeaderValue.trim()}
                          className={`px-2 py-1.5 text-xs border border-gray-300 rounded shrink-0 ${
                            newHeaderKey.trim() && newHeaderValue.trim() 
                              ? 'border-green-500 text-green-600 hover:bg-green-50' 
                              : 'border-gray-300 text-gray-400'
                          }`}
                          title={
                            newHeaderKey.trim() && newHeaderValue.trim() 
                              ? 'Add header' 
                              : 'Enter header value'
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        
                        {/* Reset/Cancel button */}
                        <button
                          type="button"
                          onClick={() => {
                            setNewHeaderKey('')
                            setNewHeaderValue('')
                            setIsCustomHeader(false)
                            setIsCustomValue(false)
                          }}
                          className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-red-50 hover:bg-red-100 text-red-600"
                          title="Cancel header"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Parameters Section */}
            {endpointParams && endpointParams.totalCount > 0 && (
              <div>
                <div 
                  className="flex items-center justify-between cursor-pointer py-2 border-b border-gray-200"
                  onClick={() => setShowParameters(!showParameters)}
                >
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Parameters</label>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {getParameterSummary(endpointParams)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Reset and regenerate space-consistent parameter values
                        if (endpointParams) {
                          for (const [paramName] of Object.entries(endpointParams.parameters)) {
                            spaceParameterManager.resetParameter(paramName)
                          }
                        }
                        // Re-merge parameters to get fresh space-consistent values
                        const freshParams = spaceParameterManager.mergeEndpointParameters(formData)
                        setFormData(prev => ({ ...prev, parameters: freshParams }))
                        toast.success('Space parameters regenerated consistently')
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                      title="Regenerate all parameter values"
                    >
                      <Settings className="h-3 w-3" />
                    </button>
                    {showParameters ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </div>
                
                {showParameters && (
                  <div className="mt-3 space-y-3">
                    {/* Live URL Preview */}
                    {hasUnresolvedParameters(formData) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <div className="text-xs font-medium text-yellow-700 mb-1">Live Preview:</div>
                        <div className="text-xs font-mono text-yellow-800 break-all">
                          {resolveEndpointParameters(formData).url}
                        </div>
                      </div>
                    )}
                    
                    {/* Parameter Inputs */}
                    <div className="grid grid-cols-1 gap-2">
                      {endpointParams && Object.entries(endpointParams.parameters).map(([paramName, paramConfig]) => {
                        const currentValue = formData.parameters?.[paramName] || paramConfig.value
                        
                        return (
                          <div key={paramName} className="grid grid-cols-4 gap-2 items-center text-sm">
                            {/* Parameter Name */}
                            <div className="flex flex-col">
                              <span className="font-mono text-gray-700">{paramName}</span>
                              <span className="text-xs text-gray-500">{typeof paramConfig.pattern === 'object' ? JSON.stringify(paramConfig.pattern) : String(paramConfig.pattern || '')}</span>
                            </div>
                            
                            {/* Parameter Value Input */}
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={currentValue}
                                onChange={(e) => {
                                  const newParams = { ...formData.parameters }
                                  newParams[paramName] = e.target.value
                                  setFormData(prev => ({ ...prev, parameters: newParams }))
                                }}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder={paramConfig.value}
                              />
                            </div>
                            
                            {/* Sources & Actions */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500" title={`Used in: ${Array.isArray(paramConfig.sources) ? paramConfig.sources.join(', ') : String(paramConfig.sources || '')}`}>
                                {Array.isArray(paramConfig.sources) ? (
                                  paramConfig.sources.join(', ').substring(0, 10) + (paramConfig.sources.join(', ').length > 10 ? '...' : '')
                                ) : (
                                  String(paramConfig.sources || '').substring(0, 10)
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  // Reset this specific parameter in space and regenerate
                                  spaceParameterManager.resetParameter(paramName)
                                  const freshValue = spaceParameterManager.generateParameter(paramName, paramConfig.pattern)
                                  const newParams = { ...formData.parameters }
                                  newParams[paramName] = freshValue
                                  setFormData(prev => ({ ...prev, parameters: newParams }))
                                  toast.success(`Parameter "${paramName}" reset to space-consistent value`)
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 px-1 py-0.5 rounded hover:bg-blue-50"
                                title="Reset to space-consistent value"
                              >
                                ↻
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Parameter Help */}
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      💡 Parameters like <code>{'{userId}'}</code> are automatically detected and can be used in URL, headers, and request body.
                      Smart defaults are generated based on parameter names.
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}