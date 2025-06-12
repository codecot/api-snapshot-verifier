import apiClient from './client'
import type { Snapshot, ComparisonResult } from '@/types'

export const snapshotsApi = {
  getAll: async () => {
    const { data } = await apiClient.get<Snapshot[]>('/snapshots')
    return data
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<Snapshot>(`/snapshots/${id}`)
    return data
  },

  capture: async (endpointName?: string) => {
    const url = endpointName ? `/snapshots/capture/${endpointName}` : '/snapshots/capture'
    const { data } = await apiClient.post<Snapshot | Snapshot[]>(url)
    return data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/snapshots/${id}`)
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