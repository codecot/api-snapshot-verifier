import { useEffect, useCallback } from 'react';
import toast from '@/components/ui/toast';

interface UseAutoRefreshProps {
  enabled: boolean;
  interval: number;
  onRefresh: () => Promise<void>;
  dependencies?: any[];
}

/**
 * Custom hook to handle auto-refresh functionality
 */
export function useAutoRefresh({
  enabled,
  interval,
  onRefresh,
  dependencies = [],
}: UseAutoRefreshProps) {
  const refresh = useCallback(async () => {
    try {
      await onRefresh();
    } catch (error) {
      console.error('Auto-refresh failed:', error);
      toast.error('Failed to refresh data. Check your connection.');
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || interval <= 0) return;

    const intervalId = setInterval(refresh, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval, refresh, ...dependencies]);

  return { refresh };
}