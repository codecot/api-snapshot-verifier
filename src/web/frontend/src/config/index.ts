// Frontend Configuration
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    protocol: 'http' | 'https';
    host: string;
    port: string;
    path: string;
  };
  app: {
    name: string;
    version: string;
  };
}

// Parse a full URL into components
function parseBackendUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(':', '') as 'http' | 'https',
      host: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
      path: parsed.pathname === '/' ? '' : parsed.pathname,
      baseUrl: url.replace(/\/$/, '') // Remove trailing slash
    };
  } catch (error) {
    // Fallback for invalid URLs
    return {
      protocol: 'http' as const,
      host: 'localhost',
      port: '3301',
      path: '',
      baseUrl: 'http://localhost:3301'
    };
  }
}

// Get saved backend URL from localStorage or use default
function getSavedBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('api_backend_url');
    if (saved) {
      return saved;
    }
  }
  return (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3301';
}

// Save backend URL to localStorage
export function saveBackendUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('api_backend_url', url);
    // Update the global config
    Object.assign(config, createConfig());
  }
}

// Get configuration from saved settings or environment variables
function createConfig(): AppConfig {
  const backendUrl = getSavedBackendUrl();
  const parsed = parseBackendUrl(backendUrl);
  
  return {
    api: {
      baseUrl: parsed.baseUrl,
      timeout: 10000,
      protocol: parsed.protocol,
      host: parsed.host,
      port: parsed.port,
      path: parsed.path,
    },
    app: {
      name: 'API Snapshot Verifier',
      version: '1.0.0',
    },
  };
}

export const config = createConfig();

// Helper function to build API URL
export function buildApiUrl(endpoint: string): string {
  const apiPath = config.api.path ? `${config.api.path}/api` : '/api';
  return `${config.api.baseUrl}${apiPath}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

// Validate if a URL is properly formatted
export function validateBackendUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL cannot be empty' };
  }

  try {
    const parsed = new URL(url);
    
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Protocol must be http or https' };
    }
    
    if (!parsed.hostname) {
      return { valid: false, error: 'Invalid hostname' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// Test connection to backend URL
export async function testBackendConnection(url: string): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  
  try {
    const testUrl = `${url.replace(/\/$/, '')}/health`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return { success: true, responseTime };
    } else {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed',
      responseTime 
    };
  }
}

// Get current backend URL
export function getCurrentBackendUrl(): string {
  return config.api.baseUrl;
}

// Reset to default backend URL
export function resetToDefaultBackendUrl(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('api_backend_url');
    Object.assign(config, createConfig());
  }
}

// Helper function to check if we're in development mode
export const isDev = (import.meta as any).env?.DEV || false;

// Export environment variables for easy access
export const env = {
  BACKEND_URL: (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3301',
  FRONTEND_PORT: (import.meta as any).env?.VITE_FRONTEND_PORT || '3300',
};