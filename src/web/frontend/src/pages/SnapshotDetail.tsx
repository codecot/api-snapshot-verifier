import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Download, Copy, Check, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { snapshotsApi } from '@/api/snapshots/snapshots.api'
import { PageHeader } from '@/design-system/components/PageHeader'
import { PageLayout } from '@/design-system/components/PageLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/states/LoadingState'
import { ErrorState } from '@/components/states/ErrorState'
import { JsonViewer } from '@/components/ui/json-viewer'
import { formatResponseTime } from '@/utils/formatting'

interface SnapshotDetail {
  id: string
  endpoint: string
  timestamp: string
  status: 'success' | 'error' | 'pending'
  url: string
  method: string
  responseStatus?: number
  error?: string
  duration?: number
  response?: any
  filename?: string
}

export default function SnapshotDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch snapshot details
  const { data: snapshotDetail, isLoading, error } = useQuery({
    queryKey: ['snapshot', id],
    queryFn: async () => {
      if (!id) throw new Error('No snapshot ID provided')
      const data = await snapshotsApi.getById(id)
      
      // The API returns data with snapshot content nested
      if (data && data.snapshot) {
        return {
          id: data.id,
          filename: data.filename,
          endpoint: data.endpoint_name,
          timestamp: data.created_at,
          status: data.status,
          url: data.endpoint_url,
          method: data.endpoint_method,
          responseStatus: data.response_status,
          error: data.error,
          duration: data.duration,
          response: data.snapshot.response?.data || data.snapshot.response
        } as SnapshotDetail
      }
      
      // Fallback for filesystem-based snapshots without database record
      return data as SnapshotDetail
    },
    enabled: !!id,
  })

  const handleCopyUrl = async () => {
    if (snapshotDetail?.url) {
      try {
        await navigator.clipboard.writeText(snapshotDetail.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleDownload = () => {
    if (snapshotDetail?.response) {
      const dataStr = JSON.stringify(snapshotDetail.response, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `snapshot-${snapshotDetail.endpoint}-${snapshotDetail.id}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
    }
  }

  if (isLoading) {
    return (
      <PageLayout>
        <PageHeader
          title="Loading Snapshot..."
          actions={
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          }
        />
        <LoadingState message="Loading snapshot details..." />
      </PageLayout>
    )
  }

  if (error || !snapshotDetail) {
    return (
      <PageLayout>
        <PageHeader
          title="Snapshot Not Found"
          actions={
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          }
        />
        <ErrorState 
          error={error || 'Snapshot not found'} 
          onRetry={() => window.location.reload()} 
        />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title={`Snapshot: ${snapshotDetail.endpoint}`}
        description={`Captured on ${format(new Date(snapshotDetail.timestamp), 'MMM d, yyyy HH:mm:ss')}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Snapshots
            </Button>
          </div>
        }
      />

      {/* Metadata Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {snapshotDetail.status === 'success' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700">Success</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-700">Failed</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Code</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={snapshotDetail.responseStatus && snapshotDetail.responseStatus < 400 ? 'outline' : 'destructive'}
              className="text-lg px-3 py-1"
            >
              {snapshotDetail.responseStatus || 'N/A'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">
                {snapshotDetail.duration ? formatResponseTime(snapshotDetail.duration) : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Method</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-lg px-3 py-1 font-mono">
              {snapshotDetail.method}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* URL Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Endpoint URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted p-3 rounded text-sm font-mono break-all">
              {snapshotDetail.url}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyUrl}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(snapshotDetail.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Section (if any) */}
      {snapshotDetail.error && (
        <Card className="mb-6 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Error Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded">
              <pre className="whitespace-pre-wrap text-sm">{snapshotDetail.error}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Data Section */}
      {snapshotDetail.response && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Response Data</CardTitle>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Search in response..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1 text-sm border rounded-md bg-background"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <JsonViewer
              data={snapshotDetail.response}
              maxHeight="calc(100vh - 600px)"
              searchTerm={searchTerm}
              defaultExpanded={false}
              className="min-h-[400px]"
            />
          </CardContent>
        </Card>
      )}

      {/* Additional Info */}
      <div className="mt-6 text-sm text-muted-foreground">
        <p>Snapshot ID: {snapshotDetail.id}</p>
        {snapshotDetail.filename && <p>Filename: {snapshotDetail.filename}</p>}
      </div>
    </PageLayout>
  )
}