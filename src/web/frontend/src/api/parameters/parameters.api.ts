import { BaseApiClient } from '@/api/base/client'
import { ApiResponse } from '@/api/base/types'

export interface Parameter {
  name: string
  value: string
}

export interface ParameterUsage {
  [key: string]: string[]
}

export class ParametersApi extends BaseApiClient {
  async getAll(space: string): Promise<Record<string, string>> {
    const response = await this.get<ApiResponse<Record<string, string>>>(`/parameters/${space}`)
    return response.data || {}
  }

  async getUsage(space: string): Promise<ParameterUsage> {
    const response = await this.get<ApiResponse<ParameterUsage>>(`/parameters/${space}/usage`)
    return response.data || {}
  }

  async create(space: string, name: string, value: string): Promise<void> {
    await this.post(`/parameters/${space}`, { name, value })
  }

  async update(space: string, name: string, value: string): Promise<void> {
    await this.put(`/parameters/${space}/${name}`, { value })
  }

  async deleteParameter(space: string, name: string): Promise<void> {
    await super.delete(`/parameters/${space}/${name}`)
  }
}

// Export singleton instance
export const parametersApi = new ParametersApi()