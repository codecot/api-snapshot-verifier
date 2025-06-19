import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, CheckCircle, XCircle, Eye, Trash2, RefreshCw, TrendingUp, Activity, BarChart3 } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useSpace } from '@/contexts/SpaceContext'
import { snapshotsApi } from '@/api/snapshots/snapshots.api'
import { PageLayout, PageSection, StatCard } from '@/components/shared'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/states/EmptyState'
import { LoadingState, Skeleton } from '@/components/states/LoadingState'
import { ErrorState } from '@/components/states/ErrorState'
import { toast } from '@/components/ui/toast'
import { formatResponseTime } from '@/utils/formatting'
import type { Snapshot } from '@/types'

export default function Snapshots() {
  const { currentSpace } = useSpace()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list')

  // Fetch snapshots
  const { data: snapshots = [], isLoading, error } = useQuery({
    queryKey: ['snapshots', currentSpace],
    queryFn: () => snapshotsApi.getAllBySpace(currentSpace!),
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: !!currentSpace, // Only fetch if space is selected
  })

  // Delete snapshot mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => snapshotsApi.deleteSnapshot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots', currentSpace] })
      toast.success('Snapshot deleted')
    },
    onError: () => {
      toast.error('Failed to delete snapshot')
    },
  })

  // Calculate statistics
  const stats = useMemo(() => {
    const total = snapshots.length
    const successful = snapshots.filter(s => s.status === 'success').length
    const failed = snapshots.filter(s => s.status === 'error').length
    const avgResponseTime = snapshots
      .filter(s => s.status === 'success' && (s as any).duration)
      .reduce((acc, s) => acc + ((s as any).duration || 0), 0) / (successful || 1)

    const endpoints = [...new Set(snapshots.map(s => s.endpoint))]
    const recentSnapshots = snapshots.slice(0, 5)

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgResponseTime,
      endpoints,
      recentSnapshots,
    }
  }, [snapshots])

  // Filter snapshots
  const filteredSnapshots = useMemo(() => {
    if (selectedEndpoint === 'all') return snapshots
    return snapshots.filter(s => s.endpoint === selectedEndpoint)
  }, [snapshots, selectedEndpoint])

  // Group snapshots by endpoint
  const groupedSnapshots = useMemo(() => {
    const groups: Record<string, typeof snapshots> = {}
    filteredSnapshots.forEach(snapshot => {
      if (!groups[snapshot.endpoint]) {
        groups[snapshot.endpoint] = []
      }
      groups[snapshot.endpoint].push(snapshot)
    })
    return groups
  }, [filteredSnapshots])

  if (isLoading) {
    return (
      <PageLayout 
        title="Snapshots"
        description="View and analyze API snapshot history"
      >
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <LoadingState message="Loading snapshots..." />
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout 
        title="Snapshots"
        description="View and analyze API snapshot history"
      >
        <ErrorState error={error} onRetry={() => queryClient.invalidateQueries({ queryKey: ['snapshots'] })} />
      </PageLayout>
    )
  }

  return (
    <PageLayout 
      title="Snapshots"
      description="View and analyze API snapshot history"
    >
      {/* Refresh Button */}
      <div className="flex justify-end mb-6">
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['snapshots'] })}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          title="Total Snapshots"
          value={stats.total}
          icon={BarChart3}
          subtitle={`Across ${stats.endpoints.length} endpoints`}
        />

        <StatCard
          title="Success Rate"
          value={`${stats.successRate.toFixed(1)}%`}
          icon={TrendingUp}
          subtitle={`${stats.successful} successful, ${stats.failed} failed`}
        />

        <StatCard
          title="Avg Response Time"
          value={formatResponseTime(stats.avgResponseTime)}
          icon={Activity}
          subtitle="For successful requests"
        />

        <StatCard
          title="Latest Snapshot"
          value={stats.recentSnapshots[0] 
            ? formatDistanceToNow(new Date(stats.recentSnapshots[0].timestamp), { addSuffix: true })
            : 'None'
          }
          icon={Clock}
          subtitle={stats.recentSnapshots[0]?.endpoint || 'No snapshots yet'}
        />
      </div>

      {/* Filters and View Options */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by endpoint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Endpoints</SelectItem>
              {stats.endpoints.map(endpoint => (
                <SelectItem key={endpoint} value={endpoint}>
                  {endpoint}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'grouped' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grouped')}
            >
              Grouped View
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredSnapshots.length} of {snapshots.length} snapshots
        </div>
      </div>

      {/* Main Content */}
      <div>
          {filteredSnapshots.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No snapshots found"
              description={selectedEndpoint !== 'all' 
                ? `No snapshots for endpoint "${selectedEndpoint}"`
                : "Capture some snapshots to see them here"
              }
            />
          ) : viewMode === 'list' ? (
            <div className="space-y-2">
              {filteredSnapshots.map(snapshot => (
                <Card
                  key={snapshot.id}
                  className="cursor-pointer transition-colors hover:ring-2 hover:ring-primary/50"
                  onClick={() => navigate(`/snapshots/${snapshot.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {(snapshot as any).method || 'GET'}
                          </Badge>
                          <span className="font-medium">{snapshot.endpoint}</span>
                          {snapshot.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{(snapshot as any).url || snapshot.endpoint}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/snapshots/${snapshot.id}`)
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMutation.mutate(snapshot.id)
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(snapshot.timestamp), 'MMM d, yyyy HH:mm:ss')}
                      </span>
                      {(snapshot as any).duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatResponseTime((snapshot as any).duration)}
                        </span>
                      )}
                      {(snapshot as any).responseStatus && (
                        <Badge
                          variant={(snapshot as any).responseStatus < 400 ? 'outline' : 'destructive'}
                          className="text-xs"
                        >
                          {(snapshot as any).responseStatus}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSnapshots).map(([endpoint, endpointSnapshots]) => (
                <div key={endpoint}>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    {endpoint}
                    <Badge variant="secondary">{endpointSnapshots.length}</Badge>
                  </h3>
                  <div className="grid gap-2 pl-4">
                    {endpointSnapshots.map(snapshot => (
                      <Card
                        key={snapshot.id}
                        className="cursor-pointer transition-colors hover:ring-2 hover:ring-primary/50"
                        onClick={() => navigate(`/snapshots/${snapshot.id}`)}
                      >
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm">
                              {snapshot.status === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span>{format(new Date(snapshot.timestamp), 'HH:mm:ss')}</span>
                              {(snapshot as any).duration && (
                                <span className="text-muted-foreground">
                                  {formatResponseTime((snapshot as any).duration)}
                                </span>
                              )}
                              {(snapshot as any).responseStatus && (
                                <Badge
                                  variant={(snapshot as any).responseStatus < 400 ? 'outline' : 'destructive'}
                                  className="text-xs"
                                >
                                  {(snapshot as any).responseStatus}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/snapshots/${snapshot.id}`)
                                }}
                                title="View Details"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteMutation.mutate(snapshot.id)
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </PageLayout>
  )
}