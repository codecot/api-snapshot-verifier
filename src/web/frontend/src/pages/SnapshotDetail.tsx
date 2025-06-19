import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Download, Copy, Check, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { snapshotsApi } from '@/api/snapshots/snapshots.api'
import { PageLayout, PageSection, StatCard } from '@/components/shared'
import { Button } from '@/components/ui/button'
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
      <PageLayout 
        title="Loading Snapshot..."
      >
        <div className="flex justify-end mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <LoadingState message="Loading snapshot details..." />
      </PageLayout>
    )
  }

  if (error || !snapshotDetail) {
    return (
      <PageLayout 
        title="Snapshot Not Found"
      >
        <div className="flex justify-end mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <ErrorState 
          error={error || 'Snapshot not found'} 
          onRetry={() => window.location.reload()} 
        />
      </PageLayout>
    )
  }

  return (
    <PageLayout 
      title={`Snapshot: ${snapshotDetail.endpoint}`}
      description={`Captured on ${format(new Date(snapshotDetail.timestamp), 'MMM d, yyyy HH:mm:ss')}`}
    >
      {/* Action buttons */}
      <div className="flex justify-end gap-2 mb-6">
        <Button variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Snapshots
        </Button>
      </div>

      {/* Metadata Section using StatCards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Status"
          value={snapshotDetail.status === 'success' ? 'Success' : 'Failed'}
          icon={snapshotDetail.status === 'success' ? CheckCircle : XCircle}
          color={snapshotDetail.status === 'success' ? 'text-green-600' : 'text-red-600'}
        />

        <StatCard
          title="Response Code"
          value={snapshotDetail.responseStatus?.toString() || 'N/A'}
          icon={CheckCircle}
          color={snapshotDetail.responseStatus && snapshotDetail.responseStatus < 400 ? 'text-green-600' : 'text-red-600'}
        />

        <StatCard
          title="Duration"
          value={snapshotDetail.duration ? formatResponseTime(snapshotDetail.duration) : 'N/A'}
          icon={Clock}
        />

        <StatCard
          title="Method"
          value={snapshotDetail.method}
          icon={ExternalLink}
        />
      </div>

      {/* URL Section */}
      <PageSection title="Endpoint URL">
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
      </PageSection>

      {/* Error Section (if any) */}
      {snapshotDetail.error && (
        <PageSection title="Error Details">
          <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error Details</span>
            </div>
            <pre className="whitespace-pre-wrap text-sm">{snapshotDetail.error}</pre>
          </div>
        </PageSection>
      )}

      {/* Response Data Section */}
      {snapshotDetail.response && (
        <PageSection 
          title="Response Data"
          headerActions={
            <input
              type="text"
              placeholder="Search in response..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 text-sm border rounded-md bg-background"
            />
          }
        >
          <JsonViewer
            data={snapshotDetail.response}
            maxHeight="calc(100vh - 600px)"
            searchTerm={searchTerm}
            defaultExpanded={false}
            className="min-h-[400px]"
          />
        </PageSection>
      )}

      {/* Additional Info */}
      <div className="mt-6 text-sm text-muted-foreground">
        <p>Snapshot ID: {snapshotDetail.id}</p>
        {snapshotDetail.filename && <p>Filename: {snapshotDetail.filename}</p>}
      </div>
    </PageLayout>
  )
}