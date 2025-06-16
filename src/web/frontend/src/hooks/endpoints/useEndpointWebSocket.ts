import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queuedToast } from '@/utils/toastQueue';

interface CaptureEvent {
  space: string;
  endpoints?: string[];
  successful?: number;
  failed?: number;
  error?: string;
}

interface WebSocketHandlers {
  onCaptureStarted: (handler: (event: CaptureEvent) => void) => void;
  onCaptureComplete: (handler: (event: CaptureEvent) => void) => void;
  onCaptureError: (handler: (event: CaptureEvent) => void) => void;
  offCaptureStarted: (handler: (event: CaptureEvent) => void) => void;
  offCaptureComplete: (handler: (event: CaptureEvent) => void) => void;
  offCaptureError: (handler: (event: CaptureEvent) => void) => void;
  isConnected: boolean;
  isReconnecting: boolean;
}

interface UseEndpointWebSocketProps {
  currentSpace: string;
  captureEvents: WebSocketHandlers;
  onSnapshotStarted?: (endpointNames: string[]) => void;
  onSnapshotCompleted?: () => void;
  onBulkSnapshotStarted?: () => void;
  onBulkSnapshotCompleted?: () => void;
}

/**
 * Custom hook to handle WebSocket events for endpoint operations
 */
export function useEndpointWebSocket({
  currentSpace,
  captureEvents,
  onSnapshotStarted,
  onSnapshotCompleted,
  onBulkSnapshotStarted,
  onBulkSnapshotCompleted,
}: UseEndpointWebSocketProps) {
  const queryClient = useQueryClient();

  // Handle capture started event
  const handleCaptureStarted = useCallback(
    (event: CaptureEvent) => {
      if (!event || event.space !== currentSpace) {
        console.log('🚀 Capture started event ignored:', {
          event,
          currentSpace,
        });
        return;
      }

      console.log('🚀 Capture started:', event);

      // Set loading state for affected endpoints
      const endpointNames = event.endpoints || [];
      if (endpointNames.length > 0) {
        onSnapshotStarted?.(endpointNames);
      } else {
        // Bulk capture - set loading for all
        onBulkSnapshotStarted?.();
      }
    },
    [currentSpace, onSnapshotStarted, onBulkSnapshotStarted]
  );

  // Handle capture complete event
  const handleCaptureComplete = useCallback(
    (event: CaptureEvent) => {
      if (event.space !== currentSpace) return;

      console.log('✅ Capture completed:', event);

      // Clear loading states
      onSnapshotCompleted?.();
      onBulkSnapshotCompleted?.();

      // Show success notification via queue to prevent spam
      const { successful = 0, failed = 0 } = event;
      if (failed > 0) {
        queuedToast.error(
          `📸 Capture completed: ${successful} successful, ${failed} failed`
        );
      } else {
        queuedToast.success(
          `📸 All ${successful} snapshots captured successfully!`
        );
      }

      // Immediate fresh data fetch after capture
      setTimeout(async () => {
        console.log('🔄 Force refreshing snapshots after capture complete...');

        // Invalidate and refetch snapshots data to ensure fresh stats
        queryClient.invalidateQueries({
          queryKey: ['snapshots', currentSpace],
        });
        console.log('✅ Fresh snapshots data loaded');
      }, 1000);
    },
    [currentSpace, queryClient, onSnapshotCompleted, onBulkSnapshotCompleted]
  );

  // Handle capture error event
  const handleCaptureError = useCallback(
    (event: CaptureEvent) => {
      if (event.space !== currentSpace) return;

      console.error('❌ Capture error:', event);

      // Clear loading states
      onSnapshotCompleted?.();
      onBulkSnapshotCompleted?.();

      queuedToast.error(`❌ Capture failed: ${event.error}`);
    },
    [currentSpace, onSnapshotCompleted, onBulkSnapshotCompleted]
  );

  // Register and cleanup event listeners
  useEffect(() => {
    // Register event listeners
    captureEvents.onCaptureStarted(handleCaptureStarted);
    captureEvents.onCaptureComplete(handleCaptureComplete);
    captureEvents.onCaptureError(handleCaptureError);

    // Cleanup event listeners
    return () => {
      captureEvents.offCaptureStarted(handleCaptureStarted);
      captureEvents.offCaptureComplete(handleCaptureComplete);
      captureEvents.offCaptureError(handleCaptureError);
    };
  }, [
    captureEvents,
    handleCaptureStarted,
    handleCaptureComplete,
    handleCaptureError,
  ]);

  return {
    isConnected: captureEvents.isConnected,
    isReconnecting: captureEvents.isReconnecting,
  };
}