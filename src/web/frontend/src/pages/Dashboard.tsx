import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, AlertCircle, CheckCircle, Clock, RefreshCw, Share2, Settings, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { snapshotsApi } from '@/api/snapshots'
import { endpointsApi } from '@/api/endpoints'
import { useSpace } from '@/contexts/SpaceContext'
import { useCaptureEvents } from '@/contexts/WebSocketContext'
import { useCaptureProgress } from '@/contexts/CaptureProgressContext'
import { ThinStatusBar } from '@/components/StatusBar'
import { formatRelativeTime } from '@/utils/dateUtils'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { currentSpace, shareUrl } = useSpace()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const captureEvents = useCaptureEvents()
  const captureProgress = useCaptureProgress()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  const { data: snapshotsResponse, refetch: refetchSnapshots } = useQuery({
    queryKey: ['snapshots', currentSpace],
    queryFn: () => snapshotsApi.getAll(currentSpace),
    refetchOnWindowFocus: true, // Auto-refresh on page focus
  })

  const { data: endpointsResponse, refetch: refetchEndpoints } = useQuery({
    queryKey: ['endpoints', currentSpace],
    queryFn: () => endpointsApi.getAll(currentSpace),
    refetchOnWindowFocus: true, // Auto-refresh on page focus
  })

  // Auto-refresh timer - adaptive based on WebSocket connectivity
  useEffect(() => {
    // 30s when connected (WebSocket provides real-time updates), 10s when disconnected
    const refreshInterval = captureEvents.isConnected ? 30000 : 10000
    
    const interval = setInterval(async () => {
      await handleRefresh(false) // Silent refresh
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [currentSpace, captureEvents.isConnected])

  // WebSocket event listeners for dashboard statistics updates
  useEffect(() => {
    const handleCaptureComplete = (event: any) => {
      if (event.space !== currentSpace) return
      
      console.log('📊 Dashboard: Updating statistics after capture completion')
      
      // Auto-refresh data to update statistics
      setTimeout(async () => {
        await Promise.all([
          refetchSnapshots(),
          refetchEndpoints()
        ])
        queryClient.invalidateQueries({ queryKey: ['snapshots', currentSpace] })
        queryClient.invalidateQueries({ queryKey: ['endpoints', currentSpace] })
        console.log('📊 Dashboard: Statistics refreshed after capture completion')
      }, 500)
    }

    // Register event listener
    captureEvents.onCaptureComplete(handleCaptureComplete)

    // Cleanup
    return () => {
      captureEvents.offCaptureComplete(handleCaptureComplete)
    }
  }, [currentSpace, captureEvents, queryClient, refetchSnapshots, refetchEndpoints])

  // Handle manual refresh
  const handleRefresh = async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true)
    
    try {
      await Promise.all([
        refetchSnapshots(),
        refetchEndpoints(),
        queryClient.refetchQueries({ queryKey: ['spaces'] }) // Refresh spaces too
      ])
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      if (showLoading) setIsRefreshing(false)
    }
  }

  // Handle share URL copy
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share URL copied to clipboard!')
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success('Share URL copied to clipboard!')
    }
  }

  // Extract data from API response format  
  const snapshots = (snapshotsResponse?.data && Array.isArray(snapshotsResponse.data)) ? snapshotsResponse.data : []
  const endpoints = (endpointsResponse?.data && Array.isArray(endpointsResponse.data)) ? endpointsResponse.data : []

  // Calculate stats
  const successfulSnapshots = snapshots.filter((s: any) => s.status === 'success').length
  const failedSnapshots = snapshots.filter((s: any) => s.status === 'error' || s.error).length
  const avgResponseTime = 0 // Will be calculated when we have actual response time data

  const stats = [
    {
      title: 'Total Endpoints',
      value: endpoints.length,
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Successful Snapshots',
      value: successfulSnapshots,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Failed Snapshots',
      value: failedSnapshots,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
    {
      title: 'Avg Response Time',
      value: `${avgResponseTime}ms`,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
  ]

  // Get active operation status
  const activeOperation = captureProgress.getActiveOperation(currentSpace)
  const isCapturing = activeOperation?.isActive || false

  return (
    <div className="space-y-6">
      {/* Thin Status Bar */}
      <ThinStatusBar 
        isActive={isCapturing}
        status={isCapturing ? 'loading' : 'idle'}
        message={isCapturing ? `Capturing ${activeOperation?.type === 'bulk' ? 'multiple' : 'single'} snapshot(s)...` : undefined}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Dashboard
            {isCapturing && <Loader2 className="h-6 w-6 animate-spin text-blue-600" />}
          </h1>
          <p className="text-muted-foreground">
            Monitor your API endpoints and snapshot performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* WebSocket Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${captureEvents.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-muted-foreground">
              {captureEvents.isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          
          {lastRefresh && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
          <Button
            onClick={() => navigate('/endpoints')}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Endpoints
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefresh()}
            disabled={isRefreshing}
            className={`gap-2 ${!captureEvents.isConnected ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : ''}`}
            title={
              !captureEvents.isConnected 
                ? 'WebSocket disconnected - manual refresh recommended'
                : 'Refresh data (auto-refresh is active)'
            }
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 
             !captureEvents.isConnected ? 'Refresh (Offline)' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card 
            key={stat.title} 
            className={stat.title === 'Total Endpoints' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
            onClick={stat.title === 'Total Endpoints' ? () => navigate('/endpoints') : undefined}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {snapshots.slice(0, 5).map((snapshot: any) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      snapshot.status === 'success'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="font-medium">{snapshot.endpoint}</p>
                    <p className="text-sm text-muted-foreground" title={new Date(snapshot.timestamp).toLocaleString()}>
                      {formatRelativeTime(snapshot.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{snapshot.status}</p>
                  <p className="text-sm text-muted-foreground">
                    -
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}