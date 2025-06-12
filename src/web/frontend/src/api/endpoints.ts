import apiClient from './client'
import type { ApiEndpoint } from '@/types'

export const endpointsApi = {
  getAll: async () => {
    const { data } = await apiClient.get<ApiEndpoint[]>('/config/endpoints')
    return data
  },

  create: async (endpoint: ApiEndpoint) => {
    const { data } = await apiClient.post<ApiEndpoint>('/config/endpoints', endpoint)
    return data
  },

  update: async (name: string, endpoint: ApiEndpoint) => {
    const { data } = await apiClient.put<ApiEndpoint>(`/config/endpoints/${name}`, endpoint)
    return data
  },

  delete: async (name: string) => {
    await apiClient.delete(`/config/endpoints/${name}`)
  },

  test: async (endpoint: ApiEndpoint) => {
    const { data } = await apiClient.post('/config/endpoints/test', endpoint)
    return data
  },
}