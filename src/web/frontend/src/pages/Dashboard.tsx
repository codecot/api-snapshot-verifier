import { useQuery } from '@tanstack/react-query'
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { snapshotsApi } from '@/api/snapshots'
import { endpointsApi } from '@/api/endpoints'

export default function Dashboard() {
  const { data: snapshotsResponse } = useQuery({
    queryKey: ['snapshots'],
    queryFn: snapshotsApi.getAll,
  })

  const { data: endpointsResponse } = useQuery({
    queryKey: ['endpoints'],
    queryFn: endpointsApi.getAll,
  })

  // Extract data from API response format
  const snapshots = snapshotsResponse?.data || []
  const endpoints = endpointsResponse?.data || []

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your API endpoints and snapshot performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
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
                    <p className="text-sm text-muted-foreground">
                      {new Date(snapshot.timestamp).toLocaleString()}
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