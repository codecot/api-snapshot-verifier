import { 
  SnapshotService, 
  HttpClient, 
  StorageProvider, 
  AuthProvider, 
  RequestConfig, 
  Logger 
} from '../core/interfaces.js';
import { ApiEndpoint, ApiSnapshot, SnapshotComparison, ValidationResult } from '../types.js';
import { GenericRegistry } from '../core/registry.js';
import { SchemaManager } from '../schema-manager.js';

export class DefaultSnapshotService implements SnapshotService {
  constructor(
    private httpClient: HttpClient,
    private storageProvider: StorageProvider,
    private authRegistry: GenericRegistry<AuthProvider>,
    private schemaManager: SchemaManager,
    private endpoints: ApiEndpoint[],
    private logger: Logger
  ) {}

  async captureSnapshot(endpoint: ApiEndpoint): Promise<{ success: boolean; snapshot?: ApiSnapshot; error?: string; }> {
    const startTime = Date.now();
    
    try {
      // Validate request body if schema is provided
      let requestValidation: ValidationResult | undefined;
      if (endpoint.schema && endpoint.body) {
        requestValidation = await this.schemaManager.validateRequest(endpoint.body, endpoint.schema);
        
        if (!requestValidation.isValid) {
          this.logger.warn(`Request validation failed for ${endpoint.name}:`, requestValidation.errors);
        }
      }

      // Prepare request configuration
      let requestConfig: RequestConfig = {
        method: endpoint.method,
        url: endpoint.url,
        headers: endpoint.headers || {},
        timeout: endpoint.timeout
      };

      if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        requestConfig.data = endpoint.body;
      }

      // Apply authentication if configured
      if (endpoint.auth) {
        const authProvider = this.authRegistry.get(endpoint.auth.type);
        if (authProvider) {
          requestConfig = await authProvider.authenticate(requestConfig);
        } else {
          this.logger.warn(`Auth provider '${endpoint.auth.type}' not found for endpoint '${endpoint.name}'`);
        }
      }

      // Make HTTP request
      const response = await this.httpClient.request(requestConfig);

      // Validate response if schema is provided
      let responseValidation: ValidationResult | undefined;
      if (endpoint.schema) {
        responseValidation = await this.schemaManager.validateResponse(
          response.data, 
          response.status, 
          endpoint.schema
        );
        
        if (!responseValidation.isValid) {
          this.logger.warn(`Response validation failed for ${endpoint.name}:`, responseValidation.errors);
        }
      }

      // Create snapshot
      const snapshot: ApiSnapshot = {
        endpoint,
        timestamp: new Date().toISOString(),
        request: requestValidation ? { validation: requestValidation } : undefined,
        response: {
          status: response.status,
          headers: response.headers,
          data: response.data,
          duration: response.duration,
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

  async captureAll(baseline?: boolean): Promise<{ success: boolean; snapshot?: ApiSnapshot; error?: string; }[]> {
    const promises = this.endpoints.map(endpoint => 
      this.captureSnapshot(endpoint).then(async result => {
        if (result.success && result.snapshot) {
          try {
            await this.storageProvider.saveSnapshot(result.snapshot, baseline);
          } catch (error) {
            return {
              success: false,
              error: `Failed to save snapshot: ${error instanceof Error ? error.message : error}`
            };
          }
        }
        return result;
      })
    );
    
    return Promise.all(promises);
  }

  async compareSnapshots(endpointName: string): Promise<SnapshotComparison | null> {
    try {
      // Find baseline and current snapshots
      const snapshots = await this.storageProvider.listSnapshots(endpointName);
      
      if (snapshots.length < 2) {
        this.logger.warn(`Not enough snapshots found for endpoint '${endpointName}' to perform comparison`);
        return null;
      }

      // Load baseline and current snapshots
      // This is a simplified implementation - in reality, you'd need logic to identify baseline vs current
      const baselineSnapshot = await this.storageProvider.loadSnapshot(snapshots[0]);
      const currentSnapshot = await this.storageProvider.loadSnapshot(snapshots[1]);

      // Note: This would need integration with DiffProvider
      // For now, returning a placeholder
      return {
        endpoint: endpointName,
        baseline: baselineSnapshot,
        current: currentSnapshot,
        differences: [],
        hasChanges: false
      };

    } catch (error) {
      this.logger.error(`Failed to compare snapshots for endpoint '${endpointName}':`, error);
      return null;
    }
  }

  async compareAll(): Promise<(SnapshotComparison | null)[]> {
    const promises = this.endpoints.map(endpoint => this.compareSnapshots(endpoint.name));
    return Promise.all(promises);
  }

  async listSnapshots(endpointName?: string): Promise<string[]> {
    return this.storageProvider.listSnapshots(endpointName);
  }

  async cleanupSnapshots(endpointName?: string, keepCount = 10): Promise<number> {
    if (endpointName) {
      return this.storageProvider.cleanupSnapshots(endpointName, keepCount);
    }

    let totalCleaned = 0;
    for (const endpoint of this.endpoints) {
      const cleaned = await this.storageProvider.cleanupSnapshots(endpoint.name, keepCount);
      totalCleaned += cleaned;
    }
    
    return totalCleaned;
  }
}