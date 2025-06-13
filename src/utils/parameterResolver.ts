// Backend Parameter Resolution System
// Resolves template parameters in endpoints before making HTTP requests

import type { ApiEndpoint } from '../types';

// Substitute parameters in a string
export function substituteParametersInString(
  template: string,
  parameters: Record<string, string>
): string {
  if (!template || !parameters) return template;
  
  let result = template;
  
  // Replace all {paramName} with actual values
  for (const [paramName, paramValue] of Object.entries(parameters)) {
    const placeholder = `{${paramName}}`;
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), paramValue);
  }
  
  return result;
}

// Substitute parameters in headers object
export function substituteParametersInHeaders(
  headers: Record<string, string> | undefined,
  parameters: Record<string, string>
): Record<string, string> | undefined {
  if (!headers || !parameters) return headers;
  
  const resolved: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    resolved[key] = substituteParametersInString(value, parameters);
  }
  
  return resolved;
}

// Substitute parameters in request body (supports nested objects and JSON strings)
export function substituteParametersInBody(
  body: any,
  parameters: Record<string, string>
): any {
  if (!body || !parameters) return body;
  
  // Handle string body (JSON or plain text)
  if (typeof body === 'string') {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(body);
      const substituted = substituteInObject(parsed, parameters);
      return JSON.stringify(substituted);
    } catch {
      // If not valid JSON, treat as plain string
      return substituteParametersInString(body, parameters);
    }
  }
  
  // Handle object body
  if (typeof body === 'object' && body !== null) {
    return substituteInObject(body, parameters);
  }
  
  return body;
}

// Recursively substitute parameters in nested objects
function substituteInObject(obj: any, parameters: Record<string, string>): any {
  if (typeof obj === 'string') {
    return substituteParametersInString(obj, parameters);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => substituteInObject(item, parameters));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteInObject(value, parameters);
    }
    return result;
  }
  
  return obj;
}

// Main function: Resolve all parameters in an endpoint
export function resolveEndpointParameters(endpoint: ApiEndpoint): ApiEndpoint {
  // If no parameters to substitute, return as-is
  if (!endpoint.parameters || Object.keys(endpoint.parameters).length === 0) {
    return endpoint;
  }
  
  // Create resolved endpoint with substituted values
  const resolved: ApiEndpoint = {
    ...endpoint,
    url: substituteParametersInString(endpoint.url, endpoint.parameters),
    headers: substituteParametersInHeaders(endpoint.headers, endpoint.parameters),
    body: substituteParametersInBody(endpoint.body, endpoint.parameters),
    // Keep original parameters for reference
    parameters: endpoint.parameters
  };
  
  return resolved;
}

// Extract parameters from URL, headers, and body
export function extractParametersFromEndpoint(endpoint: ApiEndpoint): string[] {
  const parameters = new Set<string>();
  
  const extractFromString = (str: string): void => {
    if (!str) return;
    const matches = str.match(/\{([^}]+)\}/g);
    if (matches) {
      matches.forEach(match => parameters.add(match.slice(1, -1)));
    }
  };
  
  const extractFromObject = (obj: any): void => {
    if (typeof obj === 'string') {
      extractFromString(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(item => extractFromObject(item));
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(value => extractFromObject(value));
    }
  };
  
  // Extract from URL
  extractFromString(endpoint.url);
  
  // Extract from headers
  if (endpoint.headers) {
    Object.values(endpoint.headers).forEach(value => extractFromString(value));
  }
  
  // Extract from body
  if (endpoint.body) {
    if (typeof endpoint.body === 'string') {
      try {
        const parsed = JSON.parse(endpoint.body);
        extractFromObject(parsed);
      } catch {
        extractFromString(endpoint.body);
      }
    } else {
      extractFromObject(endpoint.body);
    }
  }
  
  return Array.from(parameters);
}

// Check if endpoint has unresolved parameters
export function hasUnresolvedParameters(endpoint: ApiEndpoint): boolean {
  const checkString = (str: string): boolean => {
    return /{[^}]+}/.test(str);
  };
  
  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(item => checkObject(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkObject(value));
    }
    
    return false;
  };
  
  // Check URL
  if (checkString(endpoint.url)) return true;
  
  // Check headers
  if (endpoint.headers) {
    for (const value of Object.values(endpoint.headers)) {
      if (checkString(value)) return true;
    }
  }
  
  // Check body
  if (endpoint.body) {
    if (typeof endpoint.body === 'string') {
      try {
        const parsed = JSON.parse(endpoint.body);
        if (checkObject(parsed)) return true;
      } catch {
        if (checkString(endpoint.body)) return true;
      }
    } else if (checkObject(endpoint.body)) {
      return true;
    }
  }
  
  return false;
}

// Get list of unresolved parameter names
export function getUnresolvedParameterNames(endpoint: ApiEndpoint): string[] {
  return extractParametersFromEndpoint(endpoint);
}

// Debug utility: Log parameter resolution
export function debugParameterResolution(
  template: ApiEndpoint,
  resolved: ApiEndpoint
): void {
  console.log('🔄 Backend Parameter Resolution:', {
    template: {
      url: template.url,
      headers: template.headers,
      body: template.body,
      parameters: template.parameters
    },
    resolved: {
      url: resolved.url,
      headers: resolved.headers,
      body: resolved.body
    },
    hasUnresolved: hasUnresolvedParameters(resolved),
    extractedParams: extractParametersFromEndpoint(template)
  });
}