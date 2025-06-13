import apiClient from './client'
import type { Snapshot, ComparisonResult } from '@/types'

export const snapshotsApi = {
  getAll: async (space?: string) => {
    const params = space ? { space } : {}
    const { data } = await apiClient.get<{ success: boolean; data: Snapshot[]; count: number }>('/snapshots', { params })
    return data.data
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<Snapshot>(`/snapshots/${id}`)
    return data
  },

  capture: async (space?: string, endpointNames?: string[]) => {
    const body = endpointNames ? { endpoints: endpointNames } : {}
    
    // Use space-specific endpoint if space is provided, otherwise use general endpoint with query param
    if (space) {
      const { data } = await apiClient.post<Snapshot | Snapshot[]>(`/snapshots/capture/${space}`, body)
      return data
    } else {
      const { data } = await apiClient.post<Snapshot | Snapshot[]>('/snapshots/capture', body)
      return data
    }
  },

  delete: async (id: string) => {
    await apiClient.delete(`/snapshots/${id}`)
  },

  deleteByEndpoint: async (space: string, endpointName: string) => {
    const params = { space, endpoint: endpointName }
    await apiClient.delete('/snapshots/by-endpoint', { params })
  },

  compare: async (snapshot1Id: string, snapshot2Id: string) => {
    const { data } = await apiClient.post<ComparisonResult>('/snapshots/compare', {
      snapshot1Id,
      snapshot2Id,
    })
    return data
  },

  getComparisons: async () => {
    const { data } = await apiClient.get<ComparisonResult[]>('/snapshots/comparisons')
    return data
  },
}