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

    try {
      const response: AxiosResponse = await axios(axiosConfig);
      const duration = Date.now() - startTime;

      return {
        status: response.status,
        headers: this.normalizeHeaders(response.headers),
        data: response.data,
        duration
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const duration = Date.now() - startTime;
        return {
          status: error.response.status,
          headers: this.normalizeHeaders(error.response.headers),
          data: error.response.data,
          duration
        };
      }
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