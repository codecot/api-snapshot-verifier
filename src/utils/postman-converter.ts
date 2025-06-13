import type { ApiEndpoint } from '../types.js';

// Postman Collection v2.1 types
interface PostmanCollection {
  info: {
    name: string;
    schema: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  item?: PostmanItem[]; // Folders can contain items
}

interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl | string;
  auth?: PostmanAuth;
}

interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

interface PostmanBody {
  mode: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql';
  raw?: string;
  urlencoded?: Array<{ key: string; value: string }>;
  formdata?: Array<{ key: string; value: string; type?: string }>;
}

interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: Array<{ key: string; value: string }>;
  variable?: PostmanVariable[];
}

interface PostmanVariable {
  key: string;
  value: string;
}

interface PostmanAuth {
  type: string;
  bearer?: Array<{ key: string; value: string }>;
  basic?: Array<{ key: string; value: string }>;
  apikey?: Array<{ key: string; value: string }>;
}

export function convertPostmanToEndpoints(collection: PostmanCollection, baseUrl?: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  const globalVariables = new Map<string, string>();

  // Process collection variables
  if (collection.variable) {
    collection.variable.forEach(v => {
      globalVariables.set(v.key, v.value);
    });
  }

  // Process items recursively
  processItems(collection.item, endpoints, '', globalVariables, baseUrl);

  return endpoints;
}

function processItems(
  items: PostmanItem[], 
  endpoints: ApiEndpoint[], 
  folderPrefix: string,
  variables: Map<string, string>,
  baseUrl?: string
): void {
  items.forEach(item => {
    if (item.request) {
      // It's a request
      const endpoint = convertRequest(item, folderPrefix, variables, baseUrl);
      if (endpoint) {
        endpoints.push(endpoint);
      }
    } else if (item.item) {
      // It's a folder
      const newPrefix = folderPrefix ? `${folderPrefix}/${item.name}` : item.name;
      processItems(item.item, endpoints, newPrefix, variables, baseUrl);
    }
  });
}

function convertRequest(
  item: PostmanItem, 
  folderPrefix: string,
  variables: Map<string, string>,
  baseUrl?: string
): ApiEndpoint | null {
  if (!item.request) return null;

  const request = item.request;
  const method = request.method?.toUpperCase() || 'GET';
  
  // Parse URL
  let url = '';
  if (typeof request.url === 'string') {
    url = request.url;
  } else if (request.url) {
    url = request.url.raw || '';
    
    // Build URL from components if raw is not complete
    if (!url.startsWith('http') && request.url.protocol && request.url.host) {
      const protocol = request.url.protocol || 'https';
      const host = Array.isArray(request.url.host) ? request.url.host.join('.') : '';
      const path = Array.isArray(request.url.path) ? request.url.path.join('/') : '';
      url = `${protocol}://${host}/${path}`;
    }
  }

  // Replace Postman variables {{variable}} with our format {variable}
  url = replacePostmanVariables(url, variables);
  
  // Use baseUrl if provided and URL is relative
  if (baseUrl && !url.startsWith('http')) {
    url = `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }

  // Create endpoint name
  const name = folderPrefix ? `${folderPrefix}/${item.name}` : item.name;
  const safeName = name.replace(/[^a-zA-Z0-9-_\/]/g, '-').toLowerCase();

  // Convert headers
  const headers: Record<string, string> = {};
  if (request.header) {
    request.header.forEach(h => {
      if (!h.disabled && h.key && h.value) {
        headers[h.key] = replacePostmanVariables(h.value, variables);
      }
    });
  }

  // Convert body
  let body: any = undefined;
  if (request.body) {
    if (request.body.mode === 'raw' && request.body.raw) {
      body = replacePostmanVariables(request.body.raw, variables);
      
      // Set Content-Type if not already set
      if (!headers['Content-Type']) {
        // Try to detect content type from body
        const trimmed = body.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          headers['Content-Type'] = 'application/json';
        } else if (trimmed.startsWith('<')) {
          headers['Content-Type'] = 'application/xml';
        }
      }
    } else if (request.body.mode === 'urlencoded' && request.body.urlencoded) {
      const params = new URLSearchParams();
      request.body.urlencoded.forEach(p => {
        params.append(p.key, replacePostmanVariables(p.value, variables));
      });
      body = params.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (request.body.mode === 'formdata') {
      // For form data, we'll store it as a JSON representation
      const formData: Record<string, string> = {};
      request.body.formdata?.forEach(p => {
        formData[p.key] = replacePostmanVariables(p.value, variables);
      });
      body = JSON.stringify(formData, null, 2);
      headers['Content-Type'] = 'multipart/form-data';
    }
  }

  // Convert auth
  const auth: any = {};
  if (request.auth) {
    if (request.auth.type === 'bearer' && request.auth.bearer) {
      const token = request.auth.bearer.find(b => b.key === 'token')?.value || '';
      auth.type = 'bearer';
      auth.token = replacePostmanVariables(token, variables);
    } else if (request.auth.type === 'basic' && request.auth.basic) {
      const username = request.auth.basic.find(b => b.key === 'username')?.value || '';
      const password = request.auth.basic.find(b => b.key === 'password')?.value || '';
      auth.type = 'basic';
      auth.username = replacePostmanVariables(username, variables);
      auth.password = replacePostmanVariables(password, variables);
    } else if (request.auth.type === 'apikey' && request.auth.apikey) {
      const key = request.auth.apikey.find(a => a.key === 'key')?.value || '';
      const value = request.auth.apikey.find(a => a.key === 'value')?.value || '';
      const addTo = request.auth.apikey.find(a => a.key === 'in')?.value || 'header';
      
      auth.type = 'api-key';
      auth.key = replacePostmanVariables(key, variables);
      auth.value = replacePostmanVariables(value, variables);
      
      // Add to headers if it's a header API key
      if (addTo === 'header') {
        headers[auth.key] = auth.value;
      }
    }
  }

  return {
    name: safeName,
    url,
    method: method as any,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body,
    auth: Object.keys(auth).length > 0 ? auth : undefined
  };
}

function replacePostmanVariables(text: string, variables: Map<string, string>): string {
  // Replace {{variable}} with {variable} and substitute known values
  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    // If we have a value for this variable, use it
    if (variables.has(varName)) {
      return variables.get(varName)!;
    }
    // Otherwise, convert to our parameter format
    return `{${varName}}`;
  });
}

export function validatePostmanCollection(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid JSON structure' };
  }

  if (!data.info || !data.info.schema) {
    return { isValid: false, error: 'Missing Postman collection info' };
  }

  if (!data.info.schema.includes('collection')) {
    return { isValid: false, error: 'Not a valid Postman collection' };
  }

  if (!Array.isArray(data.item)) {
    return { isValid: false, error: 'Missing collection items' };
  }

  return { isValid: true };
}