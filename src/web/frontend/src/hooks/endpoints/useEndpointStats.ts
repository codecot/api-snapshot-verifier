import { useMemo } from 'react';
import { formatRelativeTime } from '@/utils/dateUtils';

export interface EndpointStats {
  total: number;
  successful: number;
  failed: number;
  lastSnapshot: Date | null;
  successRate: number;
}

export interface Snapshot {
  endpoint: string;
  status?: string;
  responseStatus?: number;
  error?: any;
  timestamp: string;
}

/**
 * Custom hook to calculate endpoint statistics from snapshots
 */
export function useEndpointStats(
  endpointName: string,
  snapshots: Snapshot[]
): EndpointStats {
  return useMemo(() => {
    // Filter snapshots for this endpoint
    const endpointSnapshots = snapshots.filter((s: Snapshot) => {
      // The backend returns s.endpoint as the endpoint name string
      return s.endpoint === endpointName;
    });

    // Count successful snapshots
    const successful = endpointSnapshots.filter((s: Snapshot) => {
      // Check multiple possible success indicators
      return (
        s.status === 'success' ||
        s.status === 'completed' ||
        // Check HTTP status codes directly - any 2xx is success
        (s.responseStatus !== undefined && s.responseStatus >= 200 && s.responseStatus < 300) ||
        // Fallback: if we have response data and no error
        (!s.error && s.responseStatus !== undefined)
      );
    }).length;

    const failed = endpointSnapshots.length - successful;

    // Find the most recent snapshot
    const lastSnapshot =
      endpointSnapshots.length > 0
        ? new Date(
            Math.max(
              ...endpointSnapshots.map((s: Snapshot) =>
                new Date(s.timestamp).getTime()
              )
            )
          )
        : null;

    // Calculate success rate
    const successRate =
      endpointSnapshots.length > 0
        ? Math.round((successful / endpointSnapshots.length) * 100)
        : 0;

    return {
      total: endpointSnapshots.length,
      successful,
      failed,
      lastSnapshot,
      successRate,
    };
  }, [endpointName, snapshots]);
}

/**
 * Format endpoint stats for display
 */
export function formatEndpointStats(stats: EndpointStats) {
  return {
    totalText: `${stats.successful}/${stats.total}`,
    successRateText: `${stats.successRate}%`,
    lastSnapshotText: stats.lastSnapshot
      ? formatRelativeTime(stats.lastSnapshot)
      : 'Never',
    statusColor: stats.total === 0
      ? 'text-gray-400'
      : stats.successRate === 100
      ? 'text-green-600'
      : stats.successRate >= 80
      ? 'text-yellow-600'
      : 'text-red-600',
  };
}