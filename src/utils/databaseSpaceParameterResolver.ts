// Database-aware Space Parameter Resolution for Backend
// Integrates space-level parameters with endpoint-specific parameters using SQLite database

import type { ApiEndpoint } from '../types.js';
import { DatabaseService } from '../database/database-service.js';

// Get database service instance
let dbService: DatabaseService | null = null;

function getDatabaseService(): DatabaseService {
  if (!dbService) {
    console.log('🔧 Creating new DatabaseService instance for parameter resolver');
    dbService = new DatabaseService('./snapshots.db');
  }
  return dbService;
}

// Load space parameters from database
export async function loadSpaceParameters(spaceId: string): Promise<Record<string, string>> {
  try {
    const db = getDatabaseService();
    const parameters = db.getSpaceParametersByName(spaceId);
    
    if (Object.keys(parameters).length > 0) {
      console.log(`📊 Loaded ${Object.keys(parameters).length} space parameters from database for ${spaceId}:`, parameters);
    } else {
      console.log(`📊 No space parameters found in database for ${spaceId}`);
    }
    
    return parameters;
  } catch (error) {
    console.warn(`Failed to load space parameters for ${spaceId} from database:`, error);
    return {};
  }
}

// Save space parameters to database
export async function saveSpaceParameters(spaceId: string, parameters: Record<string, string>): Promise<void> {
  try {
    const db = getDatabaseService();
    const space = db.getSpaceByName(spaceId);
    
    if (!space) {
      throw new Error(`Space '${spaceId}' not found in database`);
    }
    
    // Update or create each parameter
    for (const [name, value] of Object.entries(parameters)) {
      db.createSpaceParameter(space.id, name, value);
    }
    
    console.log(`💾 Saved ${Object.keys(parameters).length} space parameters to database for ${spaceId}`);
  } catch (error) {
    console.error(`Failed to save space parameters for ${spaceId} to database:`, error);
    throw error;
  }
}

// Merge space parameters with endpoint parameters
export async function mergeSpaceParameters(
  endpoint: ApiEndpoint,
  spaceId: string
): Promise<ApiEndpoint> {
  // Load space-level parameters from database
  const spaceParameters = await loadSpaceParameters(spaceId);
  
  // Initialize endpoint parameters if undefined
  const endpointParameters = endpoint.parameters || {};
  
  // Merge with endpoint parameters (endpoint params take precedence)
  const mergedParameters = {
    ...spaceParameters,
    ...endpointParameters
  };
  
  // Log if space parameters are being used
  const spaceParamsUsed = Object.keys(spaceParameters).filter(
    key => !(key in endpointParameters)
  );
  
  if (spaceParamsUsed.length > 0) {
    console.log(`🌍 Using space-level parameters from database for ${endpoint.name}:`, spaceParamsUsed);
  } else if (Object.keys(spaceParameters).length > 0) {
    console.log(`🌍 All space parameters overridden by endpoint-specific values for ${endpoint.name}`);
  }
  
  console.log(`🔗 Merged parameters for ${endpoint.name}:`, mergedParameters);
  
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
  // Get existing parameters from database
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

// Close database connection when done
export function closeDatabaseConnection(): void {
  if (dbService) {
    dbService.close();
    dbService = null;
  }
}