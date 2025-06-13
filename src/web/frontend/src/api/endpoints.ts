import apiClient from './client'
import type { ApiEndpoint } from '@/types'

export const endpointsApi = {
  getAll: async (space?: string) => {
    const params = space ? { space } : {}
    const { data } = await apiClient.get<{ success: boolean; data: ApiEndpoint[]; count: number }>('/config/endpoints', { params })
    return data.data
  },

  create: async (space: string, endpoint: ApiEndpoint) => {
    const params = { space }
    const { data } = await apiClient.post<ApiEndpoint>('/config/endpoints', endpoint, { params })
    return data
  },

  update: async (space: string, name: string, endpoint: ApiEndpoint) => {
    const params = { space }
    const { data } = await apiClient.put<ApiEndpoint>(`/config/endpoints/${name}`, endpoint, { params })
    return data
  },

  delete: async (space: string, name: string, deleteSnapshots?: boolean) => {
    const params: any = { space }
    if (deleteSnapshots) {
      params.deleteSnapshots = 'true'
    }
    await apiClient.delete(`/config/endpoints/${name}`, { params })
  },

  test: async (space: string, endpoint: ApiEndpoint) => {
    const params = { space }
    const { data } = await apiClient.post('/config/endpoints/test', endpoint, { params })
    return data
  },

  importOpenAPI: async (space: string, schema: any, options: {
    baseUrl?: string
    merge?: boolean
    overwriteExisting?: boolean
  }) => {
    const params = { space }
    const { data } = await apiClient.post('/config/import-openapi', {
      schema,
      baseUrl: options.baseUrl,
      merge: options.merge,
      overwriteExisting: options.overwriteExisting
    }, { params })
    return data
  },
}