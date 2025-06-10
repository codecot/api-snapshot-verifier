import { AuthProvider, RequestConfig } from '../../core/interfaces.js';

export interface ApiKeyAuthConfig {
  headerName: string;
  keyEnvVar?: string;
  key?: string;
}

export class ApiKeyAuthProvider implements AuthProvider {
  name = 'apikey';
  type = 'apikey';
  private config: ApiKeyAuthConfig = { headerName: 'X-API-Key' };

  async configure(config: ApiKeyAuthConfig): Promise<void> {
    if (!config.headerName) {
      throw new Error('headerName is required for API key authentication');
    }
    this.config = { keyEnvVar: 'API_KEY', ...config };
  }

  async authenticate(request: RequestConfig): Promise<RequestConfig> {
    const key = this.getKey();
    if (!key) {
      throw new Error(`No API key available. Set ${this.config.keyEnvVar} environment variable or configure key directly.`);
    }

    return {
      ...request,
      headers: {
        ...request.headers,
        [this.config.headerName]: key
      }
    };
  }

  validateConfig(config: any): boolean {
    return typeof config === 'object' && 
           typeof config.headerName === 'string' &&
           (typeof config.keyEnvVar === 'string' || typeof config.key === 'string');
  }

  private getKey(): string | undefined {
    if (this.config.key) {
      return this.config.key;
    }

    if (this.config.keyEnvVar) {
      return process.env[this.config.keyEnvVar];
    }

    return process.env.API_KEY;
  }
}