import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { ApiEndpoint, ApiSnapshot, SnapshotResult, ValidationResult } from './types.js';
import { SchemaManager } from './schema-manager.js';

export class SnapshotCapturer {
  private readonly defaultTimeout = 30000;
  private readonly schemaManager = new SchemaManager();

  async captureSnapshot(endpoint: ApiEndpoint): Promise<SnapshotResult> {
    const startTime = Date.now();
    
    try {
      // Validate request body if schema is provided
      let requestValidation: ValidationResult | undefined;
      if (endpoint.schema && endpoint.body) {
        requestValidation = await this.schemaManager.validateRequest(endpoint.body, endpoint.schema);
        
        // Log validation errors but continue with the request
        if (!requestValidation.isValid) {
          console.warn(`Request validation failed for ${endpoint.name}:`, requestValidation.errors);
        }
      }

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

      // Validate response if schema is provided
      let responseValidation: ValidationResult | undefined;
      if (endpoint.schema) {
        responseValidation = await this.schemaManager.validateResponse(
          response.data, 
          response.status, 
          endpoint.schema
        );
        
        if (!responseValidation.isValid) {
          console.warn(`Response validation failed for ${endpoint.name}:`, responseValidation.errors);
        }
      }

      const snapshot: ApiSnapshot = {
        endpoint,
        timestamp: new Date().toISOString(),
        request: requestValidation ? { validation: requestValidation } : undefined,
        response: {
          status: response.status,
          headers: this.normalizeHeaders(response.headers),
          data: response.data,
          duration,
          validation: responseValidation
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