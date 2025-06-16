import React from 'react';
import { Edit3, Trash2, Copy, Play, Loader2, Camera, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEndpointStats, formatEndpointStats } from '@/hooks/endpoints/useEndpointStats';
import { getMethodColor, HTTP_METHOD } from '@/constants/httpMethods';
import type { ApiEndpoint } from '@/types';
import toast from '@/components/ui/toast';

export interface EndpointCardProps {
  endpoint: ApiEndpoint;
  snapshots: any[];
  isSelected?: boolean;
  selectionMode?: boolean;
  isSnapshotting?: boolean;
  isCapturing?: boolean;
  onToggleSelection?: () => void;
  onSnapshot: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  className?: string;
}

/**
 * Individual endpoint card component
 */
export function EndpointCard({
  endpoint,
  snapshots,
  isSelected = false,
  selectionMode = false,
  isSnapshotting = false,
  isCapturing = false,
  onToggleSelection,
  onSnapshot,
  onEdit,
  onDuplicate,
  onDelete,
  className = '',
}: EndpointCardProps) {
  const stats = useEndpointStats(endpoint.name, snapshots);
  const formattedStats = formatEndpointStats(stats);
  const methodColors = getMethodColor(endpoint.method);

  const handleCopyTimestamp = async () => {
    if (!stats.lastSnapshot) return;
    
    const fullTimestamp = stats.lastSnapshot.toLocaleString();
    try {
      await navigator.clipboard.writeText(fullTimestamp);
      toast.success(`Copied: ${fullTimestamp}`, { duration: 2000 });
    } catch (error) {
      toast.error('Failed to copy timestamp');
    }
  };

  return (
    <Card
      id={`endpoint-${endpoint.name}`}
      className={`transition-all duration-300 hover:border-blue-500/30 dark:hover:border-blue-400/30 hover:bg-accent/5 ${className}`}
    >
      <CardHeader className="pb-3 min-h-[80px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Selection checkbox */}
            {selectionMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelection}
                className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
            )}
            
            <CardTitle className="text-lg dark:text-muted-foreground">
              {String(endpoint.name || 'Unnamed Endpoint')}
            </CardTitle>

            {/* Snapshot button */}
            <button
              onClick={onSnapshot}
              disabled={isSnapshotting || isCapturing}
              className={`h-8 w-8 flex items-center justify-center rounded-full border transition-all duration-200 ${
                isSnapshotting
                  ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm hover:scale-110'
              }`}
              title={
                isSnapshotting
                  ? 'Creating a new snapshot of this endpoint...'
                  : 'Click to capture a snapshot of this endpoint\'s current response'
              }
            >
              {isSnapshotting ? (
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              ) : (
                <Play className="h-4 w-4 text-gray-600 dark:text-gray-400 hover:text-blue-600" />
              )}
            </button>

            {/* Stats display */}
            <div className="flex items-center gap-3 text-sm transition-all duration-300">
              <div
                className="flex items-center gap-1 transition-colors duration-300"
                title={`${stats.successful} successful snapshots out of ${stats.total} total${
                  stats.total > 0 ? ` (${stats.successRate}% success rate)` : ''
                }`}
              >
                <Camera className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                <span className={`font-medium transition-colors duration-300 ${formattedStats.statusColor}`}>
                  {formattedStats.totalText}
                </span>
              </div>
              
              {stats.lastSnapshot && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground transition-all duration-300">
                  <button
                    onClick={handleCopyTimestamp}
                    title={`Last snapshot: ${stats.lastSnapshot.toLocaleString()}\n\nClick to copy full timestamp to clipboard`}
                    className="flex items-center gap-1 hover:text-blue-600 transition-all duration-200 cursor-pointer p-0.5 rounded hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm"
                  >
                    <Clock className="h-3 w-3" />
                    <span>{formattedStats.lastSnapshotText}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onDuplicate}
              disabled={isCapturing}
              className="h-8 w-8 lg:w-auto lg:px-3 p-0 lg:gap-2 text-muted-foreground hover:text-foreground"
              title={
                isCapturing
                  ? 'Please wait for current operations to complete'
                  : 'Create a copy of this endpoint with the same configuration for testing variations'
              }
            >
              <Copy className="h-3 w-3" />
              <span className="hidden lg:inline text-xs">Duplicate</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={isCapturing}
              className="h-8 w-8 lg:w-auto lg:px-3 p-0 lg:gap-2 text-muted-foreground hover:text-foreground"
              title={
                isCapturing
                  ? 'Please wait for current operations to complete'
                  : 'Edit this endpoint\'s URL, method, headers, and other settings'
              }
            >
              <Edit3 className="h-3 w-3" />
              <span className="hidden lg:inline text-xs">Edit</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isCapturing}
              className="h-8 w-8 lg:w-auto lg:px-3 p-0 lg:gap-2 text-red-600 hover:text-red-700"
              title={
                isCapturing
                  ? 'Please wait for current operations to complete'
                  : 'Delete this endpoint permanently (you can choose whether to also delete snapshots)'
              }
            >
              <Trash2 className="h-3 w-3" />
              <span className="hidden lg:inline text-xs">Delete</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Method and URL */}
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 text-xs font-semibold rounded ${methodColors.bg} ${methodColors.text}`}>
              {String(endpoint.method || 'GET')}
            </span>
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-1 dark:text-muted-foreground">
              {String(endpoint.url || '')}
            </code>
            
            {/* Auth badge */}
            {endpoint.auth && (endpoint.auth.type || endpoint.auth.token) && (
              <span
                className="text-xs bg-purple-100 dark:bg-transparent dark:border dark:border-purple-400 text-purple-800 dark:text-purple-400 px-2 py-1 rounded"
                title={`Authentication method: ${endpoint.auth.type || 'Custom'}\n${
                  endpoint.auth.type === 'bearer'
                    ? 'Uses Bearer token authentication'
                    : endpoint.auth.type === 'basic'
                    ? 'Uses Basic authentication'
                    : endpoint.auth.type === 'api-key'
                    ? 'Uses API key authentication'
                    : 'Custom authentication setup'
                }`}
              >
                Auth: {String(endpoint.auth.type || 'Custom')}
              </span>
            )}
          </div>

          {/* Request Body */}
          {endpoint.body && (
            <div className="bg-blue-50 dark:bg-gray-800 p-2 rounded">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                Request Body:
              </div>
              <div className="text-xs font-mono text-blue-700 dark:text-blue-300 max-h-20 overflow-y-auto">
                {typeof endpoint.body === 'object'
                  ? JSON.stringify(endpoint.body)
                  : String(endpoint.body || '')}
              </div>
            </div>
          )}

          {/* Headers */}
          {endpoint.headers && Object.keys(endpoint.headers).length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Headers:
              </div>
              <div className="grid grid-cols-1 gap-1 text-xs">
                {Object.entries(endpoint.headers).map(([key, value]) => (
                  <div key={key} className="font-mono text-gray-700 dark:text-gray-300">
                    <span className="text-gray-500 dark:text-gray-400">{key}:</span>{' '}
                    {typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}