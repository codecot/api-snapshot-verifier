// Space-aware Parameter Resolution for Backend
// Integrates space-level parameters with endpoint-specific parameters

import type { ApiEndpoint } from '../types';
import { SpaceParameterStore } from '../web/frontend/src/utils/spaceParameterManager';
import { promises as fs } from 'fs';
import * as path from 'path';

// Load space parameters from filesystem (backend version)
export async function loadSpaceParameters(spaceId: string): Promise<Record<string, string>> {
  try {
    // Sanitize space name for safe file access
    const sanitizedSpace = spaceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const configPath = path.join('./configs', `space_${sanitizedSpace}.json`);
    
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    // Return parameters if they exist in the config
    return config.parameters || {};
  } catch (error) {
    console.warn(`Failed to load space parameters for ${spaceId}:`, error);
    return {};
  }
}

// Save space parameters to filesystem
export async function saveSpaceParameters(spaceId: string, parameters: Record<string, string>): Promise<void> {
  try {
    // Sanitize space name for safe file access
    const sanitizedSpace = spaceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const configPath = path.join('./configs', `space_${sanitizedSpace}.json`);
    
    // Load existing config
    let config: any = {};
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch {
      // Config doesn't exist yet, that's okay
    }
    
    // Update parameters
    config.parameters = parameters;
    
    // Save back to file
    await fs.mkdir('./configs', { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    console.log(`💾 Saved space parameters for ${spaceId} to ${configPath}`);
  } catch (error) {
    console.error(`Failed to save space parameters for ${spaceId}:`, error);
    throw error;
  }
}

// Merge space parameters with endpoint parameters
export async function mergeSpaceParameters(
  endpoint: ApiEndpoint,
  spaceId: string
): Promise<ApiEndpoint> {
  // Load space-level parameters
  const spaceParameters = await loadSpaceParameters(spaceId);
  
  // Merge with endpoint parameters (endpoint params take precedence)
  const mergedParameters = {
    ...spaceParameters,
    ...endpoint.parameters
  };
  
  // Log if space parameters are being used
  const spaceParamsUsed = Object.keys(spaceParameters).filter(
    key => !(endpoint.parameters && key in endpoint.parameters)
  );
  
  if (spaceParamsUsed.length > 0) {
    console.log(`🌍 Using space-level parameters for ${endpoint.name}:`, spaceParamsUsed);
  }
  
  return {
    ...endpoint,
    parameters: mergedParameters
  };
}

// Extract all unique parameters across all endpoints in a space
export async function extractSpaceParameters(
  endpoints: ApiEndpoint[]
): Promise<Set<string>> {
  const allParameters = new Set<string>();
  
  const extractFromString = (str: string): void => {
    if (!str) return;
    const matches = str.match(/\{([^}]+)\}/g);
    if (matches) {
      matches.forEach(match => allParameters.add(match.slice(1, -1)));
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
  
  for (const endpoint of endpoints) {
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
  }
  
  return allParameters;
}

// Generate initial values for space parameters
export function generateInitialParameterValue(paramName: string): string {
  const cleanName = paramName.replace(/[{}]/g, '');
  
  // Pattern detection (similar to frontend)
  if (/.*[Ii]d$/.test(cleanName)) {
    return Math.floor(Math.random() * 900 + 100).toString();
  }
  
  if (/.*([Uu]id|[Uu]uid)$/.test(cleanName)) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  if (/.*([Tt]m|[Tt]imestamp)$/.test(cleanName)) {
    return Date.now().toString();
  }
  
  if (/.*[Dd]ate$/.test(cleanName)) {
    return new Date().toISOString().split('T')[0];
  }
  
  if (/.*[Tt]ime$/.test(cleanName)) {
    return new Date().toTimeString().split(' ')[0];
  }
  
  if (/.*([Tt]oken|[Kk]ey)$/.test(cleanName)) {
    return `tk_${cleanName.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;
  }
  
  if (/.*([Nn]ame|[Tt]itle|[Tt]ext)$/.test(cleanName)) {
    return `${cleanName.toLowerCase()}_${Math.floor(Math.random() * 100)}`;
  }
  
  return `${cleanName}_${Math.floor(Math.random() * 1000)}`;
}

// Initialize space parameters for all endpoints
export async function initializeSpaceParameters(
  spaceId: string,
  endpoints: ApiEndpoint[]
): Promise<Record<string, string>> {
  // Get existing parameters
  const existingParameters = await loadSpaceParameters(spaceId);
  
  // Extract all parameters from endpoints
  const allParameters = await extractSpaceParameters(endpoints);
  
  // Generate values for new parameters
  const updatedParameters = { ...existingParameters };
  let hasNewParameters = false;
  
  for (const paramName of allParameters) {
    if (!(paramName in updatedParameters)) {
      updatedParameters[paramName] = generateInitialParameterValue(paramName);
      hasNewParameters = true;
      console.log(`🎯 Generated space parameter for "${spaceId}": ${paramName} = "${updatedParameters[paramName]}"`);
    }
  }
  
  // Save if there are new parameters
  if (hasNewParameters) {
    await saveSpaceParameters(spaceId, updatedParameters);
  }
  
  return updatedParameters;
}