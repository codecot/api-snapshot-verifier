import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query'
import { ApiException } from '@/api/base/errors'

export interface UseApiQueryOptions<TData = unknown> extends Omit<UseQueryOptions<TData, ApiException>, 'queryKey' | 'queryFn'> {
  onError?: (error: ApiException) => void
}

export function useApiQuery<TData = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: UseApiQueryOptions<TData>
) {
  return useQuery<TData, ApiException>({
    queryKey,
    queryFn,
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error.isClientError) return false
      // Retry up to 3 times for network/server errors
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
    // @ts-ignore - TypeScript issue with error typing
    onError: (error: ApiException) => {
      options?.onError?.(error)
    }
  })
}

// Specialized hook for paginated queries
export function usePaginatedApiQuery<TData = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: UseApiQueryOptions<TData>
) {
  return useApiQuery(queryKey, queryFn, {
    keepPreviousData: true,
    ...options
  })
}

// Specialized hook for infinite queries
export { useInfiniteQuery as useInfiniteApiQuery } from '@tanstack/react-query'