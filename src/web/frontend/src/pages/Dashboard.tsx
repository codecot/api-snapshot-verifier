import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, AlertCircle, CheckCircle, Clock, RefreshCw, Share2, Settings, Loader2, Camera, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { snapshotsApi } from '@/api/snapshots/snapshots.api'
import { endpointsApi } from '@/api/endpoints/endpoints.api'
import { useSpace } from '@/contexts/SpaceContext'
import { useCaptureEvents } from '@/contexts/WebSocketContext'
import { useCaptureProgress } from '@/contexts/CaptureProgressContext'
import { ThinStatusBar } from '@/components/StatusBar'
import { formatRelativeTime } from '@/utils/dateUtils'
import { useState, useEffect } from 'react'
import { toast } from '@/components/ui/toast'
import { useNavigate } from 'react-router-dom'
import { PageLayout, PageHeader, StatCard, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/design-system/components'

export default function Dashboard() {
  const { currentSpace, shareUrl } = useSpace()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const captureEvents = useCaptureEvents()
  const captureProgress = useCaptureProgress()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  const { data: snapshotsResponse, refetch: refetchSnapshots, isLoading: loadingSnapshots } = useQuery({
    queryKey: ['snapshots', currentSpace],
    queryFn: () => snapshotsApi.getAllBySpace(currentSpace!),
    refetchOnWindowFocus: true, // Auto-refresh on page focus
    enabled: !!currentSpace, // Only fetch if space is selected
  })

  const { data: endpointsResponse, refetch: refetchEndpoints, isLoading: loadingEndpoints } = useQuery({
    queryKey: ['endpoints', currentSpace],
    queryFn: () => endpointsApi.getAll(currentSpace),
    refetchOnWindowFocus: true, // Auto-refresh on page focus
    enabled: !!currentSpace, // Only fetch if space is selected
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
  const snapshots = Array.isArray(snapshotsResponse) ? snapshotsResponse : []
  const endpoints = Array.isArray(endpointsResponse) ? endpointsResponse : []
  
  // Debug logging
  console.log('Dashboard - currentSpace:', currentSpace)
  console.log('Dashboard - snapshotsResponse:', snapshotsResponse)
  console.log('Dashboard - snapshots array:', snapshots)

  // Calculate stats
  const successfulSnapshots = snapshots.filter((s: any) => s.status === 'success').length
  const failedSnapshots = snapshots.filter((s: any) => s.status === 'error' || s.error).length
  
  // Calculate average response time
  const snapshotsWithTime = snapshots.filter((s: any) => s.duration && s.status === 'success')
  const avgResponseTime = snapshotsWithTime.length > 0
    ? Math.round(snapshotsWithTime.reduce((acc: number, s: any) => acc + s.duration, 0) / snapshotsWithTime.length)
    : 0

  const stats = [
    {
      title: 'Total Endpoints',
      value: endpoints.length,
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-transparent',
      borderColor: 'dark:border-blue-400',
    },
    {
      title: 'Successful Snapshots',
      value: successfulSnapshots,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-transparent',
      borderColor: 'dark:border-green-400',
    },
    {
      title: 'Failed Snapshots',
      value: failedSnapshots,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-transparent',
      borderColor: 'dark:border-red-400',
    },
    {
      title: 'Avg Response Time',
      value: `${avgResponseTime}ms`,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-transparent',
      borderColor: 'dark:border-yellow-400',
    },
  ]

  // Get active operation status
  const activeOperation = captureProgress.getActiveOperation(currentSpace)
  const isCapturing = activeOperation?.isActive || false

  // Show message if no space is selected
  if (!currentSpace) {
    return (
      <PageLayout>
        <EmptyState
          icon={AlertCircle}
          title="No Space Selected"
          description="Please select a space from the dropdown above to view dashboard statistics."
        />
      </PageLayout>
    )
  }

  return (
    <PageLayout maxWidth="xl">
      {/* Thin Status Bar */}
      <ThinStatusBar 
        isActive={isCapturing}
        status={isCapturing ? 'loading' : 'idle'}
        message={isCapturing ? `Capturing ${activeOperation?.type === 'bulk' ? 'multiple' : 'single'} snapshot(s)...` : undefined}
      />
      
      <PageHeader
        title="Dashboard"
        description="Monitor your API endpoints and snapshot performance"
        badge={isCapturing && <Loader2 className="h-6 w-6 animate-spin text-blue-600" />}
        actions={
          <div className="flex items-center gap-4">
          {/* WebSocket Connection Status */}
          <div 
            className="flex items-center gap-2 text-sm cursor-help"
            title={captureEvents.isConnected 
              ? 'Real-time updates enabled via WebSocket' 
              : 'WebSocket disabled or unavailable - using auto-refresh polling'}
          >
            <div className={`w-2 h-2 rounded-full ${captureEvents.isConnected ? 'bg-green-500' : 'bg-orange-500'}`} />
            <span className="text-muted-foreground">
              {captureEvents.isConnected ? 'Live' : 'Polling'}
            </span>
          </div>
          
          {lastRefresh && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
          <Button
            onClick={() => navigate('/endpoints')}
            variant="outline"
            size="sm"
            className="gap-2 dark:text-muted-foreground dark:border-muted-foreground/50"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">Manage Endpoints</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2 dark:text-muted-foreground dark:border-muted-foreground/50"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">Share</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefresh()}
            disabled={isRefreshing}
            className={`gap-2 ${!captureEvents.isConnected ? 'border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20' : 'dark:text-muted-foreground dark:border-muted-foreground/50'}`}
            title={
              !captureEvents.isConnected 
                ? 'WebSocket disconnected - manual refresh recommended'
                : 'Refresh data (auto-refresh is active)'
            }
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">
              {isRefreshing ? 'Refreshing...' : 
               !captureEvents.isConnected ? 'Refresh (Offline)' : 'Refresh'}
            </span>
          </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const isClickable = stat.title === 'Total Endpoints' || 
                            stat.title === 'Successful Snapshots' || 
                            stat.title === 'Failed Snapshots'
          const handleClick = () => {
            if (stat.title === 'Total Endpoints') navigate('/endpoints')
            else if (stat.title === 'Successful Snapshots' || stat.title === 'Failed Snapshots') navigate('/snapshots')
          }
          
          return (
            <StatCard
              key={stat.title}
              icon={stat.icon}
              value={(loadingSnapshots || loadingEndpoints) ? '-' : stat.value}
              label={stat.title}
              onClick={isClickable ? handleClick : undefined}
              iconClassName={`${stat.bg} ${stat.borderColor}`}
            />
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="dark:text-muted-foreground">Recent Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSnapshots ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : snapshots.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="No snapshots captured yet"
              description="Go to the Endpoints page to capture your first snapshot"
              action={{
                label: 'Go to Endpoints',
                onClick: () => navigate('/endpoints'),
                variant: 'default'
              }}
            />
          ) : (
            <div className="space-y-4">
              {snapshots.slice(0, 5).map((snapshot: any) => (
                <div
                  key={snapshot.id}
                  className="flex items-center justify-between p-4 border rounded-lg transition-all duration-200 hover:shadow hover:shadow-blue-500/10 hover:bg-white/50 dark:hover:bg-white/5"
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
                      {snapshot.responseTime ? `${snapshot.responseTime}ms` : '-'}
                    </p>
                  </div>
                </div>
              ))}
              {snapshots.length > 5 && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/snapshots')}
                    className="dark:text-muted-foreground dark:border-muted-foreground/50"
                  >
                    <span className="hidden md:inline">View All</span> Snapshots
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  )
}