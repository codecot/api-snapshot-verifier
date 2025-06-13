import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { createHash } from 'crypto';
import { Config } from './types.js';

export class ConfigManager {
  private config: Config | null = null;
  private configsDir: string = './configs';
  private spaceMappingFile: string = './configs/.space-mapping.json';

  loadConfig(configPath?: string, space?: string): Config {
    // Determine config path based on space or explicit path
    const actualConfigPath = this.resolveConfigPath(configPath, space);
    if (!existsSync(actualConfigPath)) {
      throw new Error(`Config file not found: ${actualConfigPath}`);
    }

    try {
      const configContent = readFileSync(actualConfigPath, 'utf-8');
      this.config = JSON.parse(configContent);
      
      this.validateConfig(this.config!);
      return this.config!;
    } catch (error) {
      throw new Error(`Failed to load config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getConfig(): Config {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  saveConfig(configPath: string, config: Config, space?: string): void {
    try {
      this.validateConfig(config);
      const actualConfigPath = space ? this.resolveConfigPath(undefined, space) : configPath;
      
      // Ensure directory exists
      const dir = dirname(actualConfigPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      const configContent = JSON.stringify(config, null, 2);
      writeFileSync(actualConfigPath, configContent, 'utf-8');
      this.config = config;
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateConfig(config: Config): void {
    if (!config.endpoints || !Array.isArray(config.endpoints)) {
      throw new Error('Config must have an endpoints array');
    }
    
    // Allow empty endpoints array for new spaces

    if (!config.snapshotDir) {
      throw new Error('Config must specify snapshotDir');
    }

    for (const endpoint of config.endpoints) {
      if (!endpoint.name || !endpoint.url || !endpoint.method) {
        throw new Error('Each endpoint must have name, url, and method');
      }
    }
  }

  createDefaultConfig(options: { 
    includeExampleEndpoint?: boolean, 
    environment?: string,
    spaceName?: string 
  } = {}): Config {
    const { includeExampleEndpoint = false, environment = 'development', spaceName } = options;
    
    const baseConfig: Config = {
      endpoints: [],
      snapshotDir: spaceName ? `./snapshots/${spaceName}` : './snapshots',
      baselineDir: spaceName ? `./baselines/${spaceName}` : './baselines',
      environment,
      plugins: {
        auth: { providers: [] },
        formatters: { default: 'table' },
        storage: { provider: 'filesystem' },
        diff: { engine: 'json' }
      },
      rules: [
        {
          path: 'response.headers.date',
          ignore: true
        },
        {
          path: 'response.headers.x-request-id', 
          ignore: true
        }
      ]
    };

    // Add example endpoint only when explicitly requested
    if (includeExampleEndpoint) {
      baseConfig.endpoints = [
        {
          name: 'example-users-api',
          url: 'https://jsonplaceholder.typicode.com/users',
          method: 'GET'
        }
      ];
    }

    return baseConfig;
  }

  createExampleTemplates(): { name: string; description: string; config: Config }[] {
    return [
      {
        name: 'REST API Testing',
        description: 'Template for testing REST APIs with common endpoints',
        config: this.createDefaultConfig({
          includeExampleEndpoint: false
        })
      },
      {
        name: 'JSONPlaceholder Demo',
        description: 'Pre-configured with JSONPlaceholder API for testing',
        config: {
          ...this.createDefaultConfig({ includeExampleEndpoint: false }),
          endpoints: [
            {
              name: 'users',
              url: 'https://jsonplaceholder.typicode.com/users',
              method: 'GET'
            },
            {
              name: 'posts', 
              url: 'https://jsonplaceholder.typicode.com/posts',
              method: 'GET'
            }
          ]
        }
      },
      {
        name: 'Microservices Health Check',
        description: 'Template for monitoring microservice health endpoints',
        config: {
          ...this.createDefaultConfig({ includeExampleEndpoint: false }),
          endpoints: [
            {
              name: 'auth-service-health',
              url: 'http://localhost:3001/health',
              method: 'GET'
            },
            {
              name: 'user-service-health',
              url: 'http://localhost:3002/health', 
              method: 'GET'
            },
            {
              name: 'order-service-health',
              url: 'http://localhost:3003/health',
              method: 'GET'
            }
          ]
        }
      }
    ];
  }

  private resolveConfigPath(configPath?: string, space?: string): string {
    if (configPath) {
      return configPath;
    }
    
    if (space) {
      const safeFilename = this.generateSafeFilename(space);
      return join(this.configsDir, `${safeFilename}.json`);
    }
    
    // Default fallback
    return './api-snapshot.config.json';
  }

  private generateSafeFilename(spaceName: string): string {
    // Validate space name format
    this.validateSpaceName(spaceName);
    
    // Generate a deterministic hash from the space name
    const hash = createHash('sha256').update(spaceName).digest('hex').substring(0, 16);
    
    // Create a safe filename with format: space_{hash}
    return `space_${hash}`;
  }

  private validateSpaceName(spaceName: string): void {
    if (!spaceName || typeof spaceName !== 'string') {
      throw new Error('Space name must be a non-empty string');
    }
    
    if (spaceName.length > 100) {
      throw new Error('Space name too long (max 100 characters)');
    }
    
    if (spaceName.trim() !== spaceName) {
      throw new Error('Space name cannot have leading or trailing whitespace');
    }
    
    // Allow alphanumeric, hyphens, underscores, and spaces
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(spaceName)) {
      throw new Error('Space name can only contain letters, numbers, spaces, hyphens, and underscores');
    }
  }

  private loadSpaceMapping(): Record<string, string> {
    try {
      if (existsSync(this.spaceMappingFile)) {
        const content = readFileSync(this.spaceMappingFile, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load space mapping, creating new one');
    }
    return {};
  }

  private saveSpaceMapping(mapping: Record<string, string>): void {
    try {
      const dir = dirname(this.spaceMappingFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.spaceMappingFile, JSON.stringify(mapping, null, 2));
    } catch (error) {
      console.error('Failed to save space mapping:', error);
    }
  }

  listSpaces(): string[] {
    try {
      const mapping = this.loadSpaceMapping();
      return Object.keys(mapping);
    } catch (error) {
      return [];
    }
  }

  spaceExists(space: string): boolean {
    const mapping = this.loadSpaceMapping();
    return space in mapping;
  }

  createSpace(space: string, options: {
    config?: Config;
    template?: string;
    includeExample?: boolean;
    source?: 'cli' | 'web';
  } = {}): void {
    this.validateSpaceName(space);
    
    // Check if space already exists
    if (this.spaceExists(space)) {
      throw new Error(`Space '${space}' already exists`);
    }
    
    let configToSave: Config;
    
    if (options.config) {
      // Use provided config
      configToSave = options.config;
    } else if (options.template) {
      // Use template
      const templates = this.createExampleTemplates();
      const template = templates.find(t => t.name === options.template);
      if (!template) {
        throw new Error(`Template '${options.template}' not found`);
      }
      configToSave = template.config;
    } else {
      // Create default config based on source
      const includeExample = options.includeExample ?? (options.source === 'cli');
      configToSave = this.createDefaultConfig({
        includeExampleEndpoint: includeExample,
        spaceName: space,
        environment: space
      });
    }
    
    const configPath = this.resolveConfigPath(undefined, space);
    this.saveConfig(configPath, configToSave);
    
    // Update mapping
    const mapping = this.loadSpaceMapping();
    const safeFilename = this.generateSafeFilename(space);
    mapping[space] = safeFilename;
    this.saveSpaceMapping(mapping);
  }

  getAvailableTemplates(): { name: string; description: string }[] {
    return this.createExampleTemplates().map(({ name, description }) => ({ name, description }));
  }

  deleteSpace(space: string): void {
    if (space === 'default') {
      throw new Error('Cannot delete default space');
    }
    
    if (!this.spaceExists(space)) {
      throw new Error(`Space '${space}' does not exist`);
    }
    
    const configPath = this.resolveConfigPath(undefined, space);
    if (existsSync(configPath)) {
      unlinkSync(configPath);
    }
    
    // Update mapping
    const mapping = this.loadSpaceMapping();
    delete mapping[space];
    this.saveSpaceMapping(mapping);
  }
}