import { BaseApiClient } from '../base/client';
import type { Space, ApiEndpoint, Snapshot } from '@/types';

/**
 * Hierarchical Spaces API Client
 * Provides access to the new /api/spaces/* hierarchical endpoints
 */
export class SpacesHierarchicalApi extends BaseApiClient {
  /**
   * List all spaces
   * GET /api/spaces
   */
  async getAllSpaces(): Promise<Space[]> {
    const response = await this.get<{ data: Space[] }>('/api/spaces');
    return response.data;
  }

  /**
   * Get specific space details
   * GET /api/spaces/:space
   */
  async getSpace(spaceName: string): Promise<Space> {
    const response = await this.get<{ data: Space }>(`/api/spaces/${encodeURIComponent(spaceName)}`);
    return response.data;
  }

  /**
   * List endpoints in a space
   * GET /api/spaces/:space/endpoints
   */
  async getSpaceEndpoints(spaceName: string): Promise<ApiEndpoint[]> {
    const response = await this.get<{ data: ApiEndpoint[] }>(`/api/spaces/${encodeURIComponent(spaceName)}/endpoints`);
    return response.data;
  }

  /**
   * Get specific endpoint details
   * GET /api/spaces/:space/endpoints/:endpoint
   */
  async getSpaceEndpoint(spaceName: string, endpointName: string): Promise<ApiEndpoint> {
    const response = await this.get<{ data: ApiEndpoint }>(
      `/api/spaces/${encodeURIComponent(spaceName)}/endpoints/${encodeURIComponent(endpointName)}`
    );
    return response.data;
  }

  /**
   * List all snapshots in a space
   * GET /api/spaces/:space/snapshots
   */
  async getSpaceSnapshots(spaceName: string, options?: { limit?: number }): Promise<Snapshot[]> {
    const params = new URLSearchParams();
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    
    const url = `/api/spaces/${encodeURIComponent(spaceName)}/snapshots${params.toString() ? `?${params}` : ''}`;
    const response = await this.get<{ data: Snapshot[] }>(url);
    return response.data;
  }

  /**
   * List snapshots for a specific endpoint
   * GET /api/spaces/:space/endpoints/:endpoint/snapshots
   */
  async getEndpointSnapshots(
    spaceName: string, 
    endpointName: string, 
    options?: { limit?: number }
  ): Promise<Snapshot[]> {
    const params = new URLSearchParams();
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    
    const url = `/api/spaces/${encodeURIComponent(spaceName)}/endpoints/${encodeURIComponent(endpointName)}/snapshots${params.toString() ? `?${params}` : ''}`;
    const response = await this.get<{ data: Snapshot[] }>(url);
    return response.data;
  }

  /**
   * Capture snapshots for entire space
   * POST /api/spaces/:space/snapshots/capture
   */
  async captureSpaceSnapshots(spaceName: string, endpointNames?: string[]): Promise<{
    success: boolean;
    jobId: string;
    message: string;
    space: string;
    endpoints: string[];
  }> {
    const response = await this.post(
      `/api/spaces/${encodeURIComponent(spaceName)}/snapshots/capture`,
      { endpoints: endpointNames }
    );
    return response;
  }
}

// Export singleton instance
export const spacesHierarchicalApi = new SpacesHierarchicalApi();