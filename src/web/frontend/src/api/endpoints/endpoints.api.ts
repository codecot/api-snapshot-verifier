import { BaseApiClient } from '@/api/base/client'
import { ApiResponse } from '@/api/base/types'
import type { ApiEndpoint } from '@/types'

export class EndpointsApi extends BaseApiClient {
  async getAll(space?: string): Promise<ApiEndpoint[]> {
    try {
      const response = await this.get<{ success: boolean; data: ApiEndpoint[] }>('/config/endpoints', { space })
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error('Failed to fetch endpoints:', error)
      return []
    }
  }

  async create(space: string, endpoint: ApiEndpoint): Promise<ApiEndpoint> {
    const response = await this.post<ApiResponse<ApiEndpoint>>(
      '/config/endpoints',
      endpoint,
      { params: { space } }
    )
    return response.data
  }

  async update(space: string, name: string, endpoint: ApiEndpoint): Promise<ApiEndpoint> {
    const response = await this.put<ApiResponse<ApiEndpoint>>(
      `/config/endpoints/${encodeURIComponent(name)}`,
      endpoint,
      { params: { space } }
    )
    return response.data
  }

  async deleteEndpoint(space: string, name: string, deleteSnapshots?: boolean): Promise<void> {
    const params: any = { space }
    if (deleteSnapshots) {
      params.deleteSnapshots = 'true'
    }
    await super.delete(`/config/endpoints/${encodeURIComponent(name)}`, params)
  }

  async test(space: string, endpoint: ApiEndpoint): Promise<any> {
    const response = await this.post<ApiResponse<any>>(
      '/config/endpoints/test',
      endpoint,
      { params: { space } }
    )
    return response.data
  }

  async importOpenAPI(
    space: string,
    schema: any,
    options: {
      baseUrl?: string
      merge?: boolean
      overwriteExisting?: boolean
    }
  ): Promise<{ message: string; imported: number; skipped: number }> {
    const response = await this.post<ApiResponse<any>>(
      '/config/import-openapi',
      {
        schema,
        baseUrl: options.baseUrl,
        merge: options.merge,
        overwriteExisting: options.overwriteExisting
      },
      { params: { space } }
    )
    return response.data
  }

  async bulkDelete(
    space: string,
    endpointNames: string[],
    deleteSnapshots: boolean
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = {
      success: [] as string[],
      failed: [] as string[]
    }

    // Process deletions in parallel batches to avoid overwhelming the server
    const batchSize = 5
    for (let i = 0; i < endpointNames.length; i += batchSize) {
      const batch = endpointNames.slice(i, i + batchSize)
      const promises = batch.map(async (name) => {
        try {
          await this.deleteEndpoint(space, name, deleteSnapshots)
          results.success.push(name)
        } catch (error) {
          results.failed.push(name)
        }
      })
      await Promise.all(promises)
    }

    return results
  }
}

// Export singleton instance
export const endpointsApi = new EndpointsApi()