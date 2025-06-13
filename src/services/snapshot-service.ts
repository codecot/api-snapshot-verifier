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
import { resolveEndpointParameters, debugParameterResolution, hasUnresolvedParameters } from '../utils/parameterResolver.js';
import { mergeSpaceParameters } from '../utils/databaseSpaceParameterResolver.js';

export class DefaultSnapshotService implements SnapshotService {
  constructor(
    private httpClient: HttpClient,
    private storageProvider: StorageProvider,
    private authRegistry: GenericRegistry<AuthProvider>,
    private schemaManager: SchemaManager,
    private endpoints: ApiEndpoint[],
    private logger: Logger,
    private spaceId: string = 'default'
  ) {}

  async captureSnapshot(endpoint: ApiEndpoint): Promise<{ success: boolean; snapshot?: ApiSnapshot; error?: string; }> {
    const startTime = Date.now();
    
    try {
      // Debug incoming endpoint
      console.log(`🔍 [${endpoint.name}] Starting capture for space '${this.spaceId}'`);
      console.log(`   Original endpoint:`, JSON.stringify(endpoint, null, 2));
      
      // 1. Merge space-level parameters with endpoint parameters
      const endpointWithSpaceParams = await mergeSpaceParameters(endpoint, this.spaceId);
      
      // 2. Resolve template parameters
      const resolvedEndpoint = resolveEndpointParameters(endpointWithSpaceParams);
      
      // Debug parameter resolution if parameters exist
      if (endpointWithSpaceParams.parameters && Object.keys(endpointWithSpaceParams.parameters).length > 0) {
        console.log(`🔄 [${endpoint.name}] Parameter Resolution:`);
        console.log(`   Template URL: ${endpoint.url}`);
        console.log(`   Resolved URL: ${resolvedEndpoint.url}`);
        console.log(`   Parameters:`, endpointWithSpaceParams.parameters);
        console.log(`   Space: ${this.spaceId}`);
        debugParameterResolution(endpointWithSpaceParams, resolvedEndpoint);
        this.logger.info(`[${endpoint.name}] Resolved parameters:`, endpointWithSpaceParams.parameters);
      } else {
        console.log(`🔄 [${endpoint.name}] No parameters to resolve`);
        console.log(`   endpointWithSpaceParams.parameters:`, endpointWithSpaceParams.parameters);
      }
      
      // Check for any unresolved parameters
      if (hasUnresolvedParameters(resolvedEndpoint)) {
        this.logger.warn(`[${endpoint.name}] Endpoint contains unresolved parameters`);
      }
      
      // 2. Validate request body if schema is provided (use resolved endpoint)
      let requestValidation: ValidationResult | undefined;
      if (resolvedEndpoint.schema && resolvedEndpoint.body) {
        requestValidation = await this.schemaManager.validateRequest(resolvedEndpoint.body, resolvedEndpoint.schema);
        
        if (!requestValidation.isValid) {
          this.logger.warn(`Request validation failed for ${resolvedEndpoint.name}:`, requestValidation.errors);
        }
      }

      // 3. Prepare request configuration using resolved values
      let requestConfig: RequestConfig = {
        method: resolvedEndpoint.method,
        url: resolvedEndpoint.url,
        headers: resolvedEndpoint.headers || {},
        timeout: resolvedEndpoint.timeout
      };

      if (resolvedEndpoint.body && ['POST', 'PUT', 'PATCH'].includes(resolvedEndpoint.method)) {
        requestConfig.data = resolvedEndpoint.body;
      }

      // Apply authentication if configured
      if (endpoint.auth && endpoint.auth.type) {
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

      // Create snapshot (store original endpoint with parameters)
      const snapshot: ApiSnapshot = {
        endpoint: endpoint, // Store original endpoint with template parameters
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