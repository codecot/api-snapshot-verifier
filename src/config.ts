import { readFileSync, writeFileSync, existsSync } from 'fs';
import { Config } from './types.js';

export class ConfigManager {
  private config: Config | null = null;

  loadConfig(configPath: string = './api-snapshot.config.json'): Config {
    if (!existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    try {
      const configContent = readFileSync(configPath, 'utf-8');
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

  saveConfig(configPath: string, config: Config): void {
    try {
      this.validateConfig(config);
      const configContent = JSON.stringify(config, null, 2);
      writeFileSync(configPath, configContent, 'utf-8');
      this.config = config;
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateConfig(config: Config): void {
    if (!config.endpoints || !Array.isArray(config.endpoints) || config.endpoints.length === 0) {
      throw new Error('Config must contain at least one endpoint');
    }

    if (!config.snapshotDir) {
      throw new Error('Config must specify snapshotDir');
    }

    for (const endpoint of config.endpoints) {
      if (!endpoint.name || !endpoint.url || !endpoint.method) {
        throw new Error('Each endpoint must have name, url, and method');
      }
    }
  }

  createDefaultConfig(): Config {
    return {
      endpoints: [
        {
          name: 'users-api',
          url: 'https://jsonplaceholder.typicode.com/users',
          method: 'GET'
        }
      ],
      snapshotDir: './snapshots',
      environment: 'development',
      rules: []
    };
  }
}