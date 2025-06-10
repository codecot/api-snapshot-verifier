import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { ApiEndpoint, ApiSnapshot, SnapshotResult } from './types.js';

export class SnapshotCapturer {
  private readonly defaultTimeout = 30000;

  async captureSnapshot(endpoint: ApiEndpoint): Promise<SnapshotResult> {
    const startTime = Date.now();
    
    try {
      const config: AxiosRequestConfig = {
        method: endpoint.method,
        url: endpoint.url,
        headers: endpoint.headers || {},
        timeout: endpoint.timeout || this.defaultTimeout,
        validateStatus: () => true // Accept all status codes
      };

      if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        config.data = endpoint.body;
      }

      const response: AxiosResponse = await axios(config);
      const duration = Date.now() - startTime;

      const snapshot: ApiSnapshot = {
        endpoint,
        timestamp: new Date().toISOString(),
        response: {
          status: response.status,
          headers: this.normalizeHeaders(response.headers),
          data: response.data,
          duration
        },
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      };

      return {
        success: true,
        snapshot
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async captureMultipleSnapshots(endpoints: ApiEndpoint[]): Promise<SnapshotResult[]> {
    const promises = endpoints.map(endpoint => this.captureSnapshot(endpoint));
    return Promise.all(promises);
  }

  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        normalized[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        normalized[key.toLowerCase()] = value.join(', ');
      }
    }

    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
    sensitiveHeaders.forEach(header => {
      if (normalized[header]) {
        normalized[header] = '[REDACTED]';
      }
    });

    return normalized;
  }
}