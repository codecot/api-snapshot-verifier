import { BaseApiClient } from '@/api/base/client'
import { ApiResponse } from '@/api/base/types'

export interface Space {
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface SpaceStats {
  endpoints: number
  parameters: number
  snapshots: number
  recentSnapshots: number
  successRate: number
  avgResponseTime: number
  lastSnapshot?: string
}

export class SpacesApi extends BaseApiClient {
  async getAll(): Promise<Space[]> {
    const response = await this.get<{ success: boolean; data: any[] }>('/config/spaces')
    return response.data || []
  }

  async create(space: { name: string; description?: string }): Promise<Space> {
    const response = await this.post<ApiResponse<Space>>('/config/spaces', space)
    return response.data
  }

  async deleteSpace(name: string): Promise<void> {
    await super.delete(`/config/spaces/${encodeURIComponent(name)}`)
  }

  async getStats(name: string): Promise<SpaceStats> {
    const response = await this.get<ApiResponse<SpaceStats>>(`/config/spaces/${encodeURIComponent(name)}/stats`)
    return response.data
  }
}

// Export singleton instance
export const spacesApi = new SpacesApi()