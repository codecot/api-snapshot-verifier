import { AuthProvider, RequestConfig } from '../../core/interfaces.js';

export interface BearerAuthConfig {
  tokenEnvVar?: string;
  token?: string;
}

export class BearerAuthProvider implements AuthProvider {
  name = 'bearer';
  type = 'bearer';
  private config: BearerAuthConfig = {};

  async configure(config: BearerAuthConfig): Promise<void> {
    this.config = { tokenEnvVar: 'API_TOKEN', ...config };
  }

  async authenticate(request: RequestConfig): Promise<RequestConfig> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No bearer token available. Set API_TOKEN environment variable or configure token directly.');
    }

    return {
      ...request,
      headers: {
        ...request.headers,
        'Authorization': `Bearer ${token}`
      }
    };
  }

  validateConfig(config: any): boolean {
    return typeof config === 'object' && 
           (typeof config.tokenEnvVar === 'string' || typeof config.token === 'string');
  }

  private getToken(): string | undefined {
    if (this.config.token) {
      return this.config.token;
    }

    if (this.config.tokenEnvVar) {
      return process.env[this.config.tokenEnvVar];
    }

    return process.env.API_TOKEN;
  }
}