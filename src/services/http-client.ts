import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { HttpClient, RequestConfig, HttpResponse } from '../core/interfaces.js';

export class AxiosHttpClient implements HttpClient {
  private readonly defaultTimeout = 30000;

  async request(config: RequestConfig): Promise<HttpResponse> {
    const startTime = Date.now();

    const axiosConfig: AxiosRequestConfig = {
      method: config.method as any,
      url: config.url,
      headers: config.headers || {},
      timeout: config.timeout || this.defaultTimeout,
      validateStatus: () => true // Accept all status codes
    };

    if (config.data && ['POST', 'PUT', 'PATCH'].includes(config.method.toUpperCase())) {
      axiosConfig.data = config.data;
    }

    // 🔍 Log the actual HTTP request being made
    console.log(`🌐 [HTTP] ${config.method.toUpperCase()} ${config.url}`);
    if (config.headers && Object.keys(config.headers).length > 0) {
      console.log(`📋 [HTTP] Headers:`, config.headers);
    }
    if (config.data) {
      console.log(`📦 [HTTP] Body:`, typeof config.data === 'string' ? config.data : JSON.stringify(config.data));
    }

    try {
      const response: AxiosResponse = await axios(axiosConfig);
      const duration = Date.now() - startTime;

      // 🔍 Log the HTTP response
      console.log(`✅ [HTTP] ${response.status} ${response.statusText} (${duration}ms)`);
      if (response.data) {
        const dataPreview = typeof response.data === 'string' 
          ? response.data.substring(0, 200) + (response.data.length > 200 ? '...' : '')
          : JSON.stringify(response.data).substring(0, 200) + '...';
        console.log(`📥 [HTTP] Response:`, dataPreview);
      }

      return {
        status: response.status,
        headers: this.normalizeHeaders(response.headers),
        data: response.data,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (axios.isAxiosError(error) && error.response) {
        console.log(`❌ [HTTP] ${error.response.status} ${error.response.statusText} (${duration}ms)`);
        console.log(`📥 [HTTP] Error Response:`, error.response.data);
        
        return {
          status: error.response.status,
          headers: this.normalizeHeaders(error.response.headers),
          data: error.response.data,
          duration
        };
      }
      
      // Handle connection/timeout errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`💥 [HTTP] Request failed (${duration}ms):`, errorMessage);
      throw error;
    }
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