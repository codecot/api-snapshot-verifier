import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { ApiException, getErrorMessage } from '@/api/base/errors'
import { toast } from '@/components/ui/toast'

export interface UseApiMutationOptions<TData = unknown, TVariables = unknown>
  extends Omit<UseMutationOptions<TData, ApiException, TVariables>, 'mutationFn'> {
  successMessage?: string | ((data: TData) => string)
  errorMessage?: string | ((error: ApiException) => string)
  invalidateQueries?: string[][]
  showToast?: boolean
}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseApiMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient()
  const showToast = options?.showToast !== false // Default to true

  return useMutation<TData, ApiException, TVariables>({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate queries if specified
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }

      // Show success toast
      if (showToast && options?.successMessage) {
        const message = typeof options.successMessage === 'function' 
          ? options.successMessage(data)
          : options.successMessage
        toast.success(message)
      }

      // Call original onSuccess
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      // Show error toast
      if (showToast) {
        const message = options?.errorMessage
          ? typeof options.errorMessage === 'function'
            ? options.errorMessage(error)
            : options.errorMessage
          : getErrorMessage(error)
        
        toast.error(message, {
          duration: error.isValidationError ? 5000 : 3000
        })
      }

      // Call original onError
      options?.onError?.(error, variables, context)
    }
  })
}

// Specialized hook for delete operations
export function useDeleteMutation<TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<void>,
  options?: UseApiMutationOptions<void, TVariables>
) {
  return useApiMutation(mutationFn, {
    successMessage: 'Successfully deleted',
    errorMessage: 'Failed to delete',
    ...options
  })
}

// Specialized hook for create operations
export function useCreateMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseApiMutationOptions<TData, TVariables>
) {
  return useApiMutation(mutationFn, {
    successMessage: 'Successfully created',
    errorMessage: 'Failed to create',
    ...options
  })
}

// Specialized hook for update operations
export function useUpdateMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseApiMutationOptions<TData, TVariables>
) {
  return useApiMutation(mutationFn, {
    successMessage: 'Successfully updated',
    errorMessage: 'Failed to update',
    ...options
  })
}