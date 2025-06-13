import { DatabaseService } from './database-service.js';
import type { Config, ApiEndpoint } from '../types.js';

export class DatabaseConfigManager {
  private db: DatabaseService;

  constructor(dbPath?: string) {
    this.db = new DatabaseService(dbPath);
  }

  // Getter for database service (needed for import operations)
  get database(): DatabaseService {
    return this.db;
  }

  // Space management
  createSpace(spaceName: string, options: {
    config?: Config;
    template?: string;
    includeExample?: boolean;
    source?: 'cli' | 'web';
  } = {}): void {
    this.validateSpaceName(spaceName);
    
    if (this.spaceExists(spaceName)) {
      throw new Error(`Space '${spaceName}' already exists`);
    }

    let configToSave: Config;
    
    if (options.config) {
      configToSave = options.config;
    } else if (options.template) {
      const templates = this.createExampleTemplates();
      const template = templates.find(t => t.name === options.template);
      if (!template) {
        throw new Error(`Template '${options.template}' not found`);
      }
      configToSave = template.config;
    } else {
      configToSave = this.createDefaultConfig(spaceName, options.includeExample);
    }

    // Create space in database
    const space = this.db.createSpace({
      name: spaceName,
      display_name: spaceName,
      environment: configToSave.environment || spaceName,
      snapshot_dir: configToSave.snapshotDir || './snapshots',
      baseline_dir: configToSave.baselineDir || './baselines'
    });

    // Add endpoints
    for (const endpoint of configToSave.endpoints || []) {
      this.db.createEndpoint(space.id, endpoint);
    }

    console.log(`Created space '${spaceName}' with ${configToSave.endpoints?.length || 0} endpoints`);
  }

  deleteSpace(spaceName: string): void {
    const space = this.db.getSpaceByName(spaceName);
    if (!space) {
      throw new Error(`Space '${spaceName}' does not exist`);
    }

    // Database cascading will handle endpoints, parameters, etc.
    this.db.deleteSpace(space.id);
    console.log(`Deleted space '${spaceName}'`);
  }

  spaceExists(spaceName: string): boolean {
    return this.db.spaceExists(spaceName);
  }

  listSpaces(): string[] {
    return this.db.listSpaces().map(space => space.name);
  }

  // Configuration loading
  loadConfig(configPath?: string, spaceName?: string): Config {
    const space = spaceName ? this.db.getSpaceByName(spaceName) : this.getDefaultSpace();
    
    if (!space) {
      if (spaceName) {
        throw new Error(`Config file not found for space '${spaceName}'`);
      } else {
        // Return default config if no default space exists
        return this.createDefaultConfig('default', false);
      }
    }

    const endpoints = this.db.getEndpointsBySpaceName(space.name);
    
    // Don't populate parameters here - let the snapshot service handle it
    // This ensures space parameters are merged properly at runtime
    
    return {
      endpoints,
      snapshotDir: space.snapshot_dir,
      baselineDir: space.baseline_dir,
      environment: space.environment || space.name,
      space: space.name, // Add the actual space name
      plugins: this.getDefaultPlugins(),
      rules: this.getDefaultRules()
    };
  }

  // Endpoint management
  addEndpoint(endpoint: ApiEndpoint, spaceName?: string): void {
    const space = spaceName ? this.db.getSpaceByName(spaceName) : this.getDefaultSpace();
    
    if (!space) {
      throw new Error(spaceName ? `Space '${spaceName}' does not exist` : 'No default space found');
    }

    this.db.createEndpoint(space.id, endpoint);
  }

  updateEndpoint(endpointName: string, endpoint: ApiEndpoint, spaceName?: string): void {
    const space = spaceName ? this.db.getSpaceByName(spaceName) : this.getDefaultSpace();
    
    if (!space) {
      throw new Error(spaceName ? `Space '${spaceName}' does not exist` : 'No default space found');
    }

    const endpoints = this.db.getEndpointsBySpaceId(space.id);
    const existingEndpoint = endpoints.find(ep => ep.name === endpointName);
    
    if (!existingEndpoint) {
      throw new Error(`Endpoint '${endpointName}' not found`);
    }

    this.db.updateEndpoint(existingEndpoint.id, endpoint);
  }

  deleteEndpoint(endpointName: string, spaceName?: string): void {
    const space = spaceName ? this.db.getSpaceByName(spaceName) : this.getDefaultSpace();
    
    if (!space) {
      throw new Error(spaceName ? `Space '${spaceName}' does not exist` : 'No default space found');
    }

    const deleted = this.db.deleteEndpointByName(space.id, endpointName);
    if (!deleted) {
      throw new Error(`Endpoint '${endpointName}' not found`);
    }
  }

  // Parameter management
  getSpaceParameters(spaceName: string): Record<string, string> {
    return this.db.getSpaceParametersByName(spaceName);
  }

  setSpaceParameter(spaceName: string, paramName: string, value: string): void {
    const space = this.db.getSpaceByName(spaceName);
    if (!space) {
      throw new Error(`Space '${spaceName}' does not exist`);
    }

    this.db.createSpaceParameter(space.id, paramName, value);
  }

  deleteSpaceParameter(spaceName: string, paramName: string): void {
    const space = this.db.getSpaceByName(spaceName);
    if (!space) {
      throw new Error(`Space '${spaceName}' does not exist`);
    }

    this.db.deleteSpaceParameter(space.id, paramName);
  }

  // Private helper methods
  private getDefaultSpace() {
    return this.db.getSpaceByName('default') || this.db.listSpaces()[0];
  }

  private validateSpaceName(spaceName: string): void {
    if (!spaceName || typeof spaceName !== 'string') {
      throw new Error('Space name is required and must be a string');
    }
    
    if (spaceName.length < 1) {
      throw new Error('Space name cannot be empty');
    }
    
    if (spaceName.length > 100) {
      throw new Error('Space name too long (max 100 characters)');
    }
    
    if (spaceName.trim() !== spaceName) {
      throw new Error('Space name cannot have leading or trailing whitespace');
    }
    
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(spaceName)) {
      throw new Error('Space name can only contain letters, numbers, spaces, hyphens, and underscores');
    }
  }

  private createDefaultConfig(spaceName: string, includeExample: boolean = false): Config {
    const endpoints: ApiEndpoint[] = [];

    if (includeExample) {
      endpoints.push({
        name: 'example-api',
        url: 'https://api.example.com/health',
        method: 'GET' as const,
        headers: {
          'Accept': 'application/json'
        }
      });
    }

    return {
      endpoints,
      snapshotDir: './snapshots',
      baselineDir: './baselines',
      environment: spaceName,
      plugins: this.getDefaultPlugins(),
      rules: this.getDefaultRules()
    };
  }

  private createExampleTemplates() {
    return [
      {
        name: 'api-testing',
        description: 'Template for API testing with common endpoints',
        config: {
          endpoints: [
            {
              name: 'health-check',
              url: 'https://api.example.com/health',
              method: 'GET' as const,
              headers: { 'Accept': 'application/json' }
            },
            {
              name: 'users-list',
              url: 'https://api.example.com/users',
              method: 'GET' as const,
              headers: { 'Accept': 'application/json' }
            }
          ],
          snapshotDir: './snapshots',
          baselineDir: './baselines',
          environment: 'development',
          plugins: this.getDefaultPlugins(),
          rules: this.getDefaultRules()
        }
      }
    ];
  }

  private getDefaultPlugins() {
    return {
      auth: { providers: [] },
      formatters: { default: 'table' },
      storage: { provider: 'filesystem' },
      diff: { engine: 'json' }
    };
  }

  private getDefaultRules() {
    return [
      {
        path: 'response.headers.date',
        ignore: true
      },
      {
        path: 'response.headers.x-request-id',
        ignore: true
      }
    ];
  }

  // Get database statistics
  getStats() {
    return this.db.getStats();
  }

  // Close database connection
  close(): void {
    this.db.close();
  }
}