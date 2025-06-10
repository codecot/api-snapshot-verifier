import { AuthProvider, RequestConfig } from '../../core/interfaces.js';

export interface BasicAuthConfig {
  usernameEnvVar?: string;
  passwordEnvVar?: string;
  username?: string;
  password?: string;
}

export class BasicAuthProvider implements AuthProvider {
  name = 'basic';
  type = 'basic';
  private config: BasicAuthConfig = {};

  async configure(config: BasicAuthConfig): Promise<void> {
    this.config = { 
      usernameEnvVar: 'BASIC_USERNAME', 
      passwordEnvVar: 'BASIC_PASSWORD',
      ...config 
    };
  }

  async authenticate(request: RequestConfig): Promise<RequestConfig> {
    const username = this.getUsername();
    const password = this.getPassword();
    
    if (!username || !password) {
      throw new Error('Username and password are required for basic authentication');
    }

    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    return {
      ...request,
      headers: {
        ...request.headers,
        'Authorization': `Basic ${credentials}`
      }
    };
  }

  validateConfig(config: any): boolean {
    return typeof config === 'object' && (
      (typeof config.username === 'string' && typeof config.password === 'string') ||
      (typeof config.usernameEnvVar === 'string' && typeof config.passwordEnvVar === 'string')
    );
  }

  private getUsername(): string | undefined {
    if (this.config.username) {
      return this.config.username;
    }

    if (this.config.usernameEnvVar) {
      return process.env[this.config.usernameEnvVar];
    }

    return process.env.BASIC_USERNAME;
  }

  private getPassword(): string | undefined {
    if (this.config.password) {
      return this.config.password;
    }

    if (this.config.passwordEnvVar) {
      return process.env[this.config.passwordEnvVar];
    }

    return process.env.BASIC_PASSWORD;
  }
}