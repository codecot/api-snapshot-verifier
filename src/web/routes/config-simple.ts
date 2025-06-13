import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseConfigManager } from '../../database/database-config-manager.js';
import type { ApiEndpoint } from '../../types.js';

// Use database-based config manager
const dbConfigManager = new DatabaseConfigManager();

// Helper function to enhance endpoints with request body examples from OpenAPI schema
function enhanceEndpointsWithBodies(endpoints: ApiEndpoint[], schema: any, baseUrl?: string): ApiEndpoint[] {
  const enhanced = endpoints.map(endpoint => {
    const enhancedEndpoint = { ...endpoint };
    
    // Find the corresponding operation in the schema
    for (const [path, pathItem] of Object.entries(schema.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (method.toLowerCase() === endpoint.method.toLowerCase() && 
            endpoint.url.endsWith(path.replace(/\{[^}]+\}/g, match => match))) {
          
          const operationObj = operation as any;
          
          // Add headers
          enhancedEndpoint.headers = enhancedEndpoint.headers || {};
          
          // Add Content-Type header for operations with request body
          if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && operationObj.requestBody) {
            const contentTypes = Object.keys(operationObj.requestBody.content || {});
            if (contentTypes.length > 0) {
              enhancedEndpoint.headers['Content-Type'] = contentTypes[0];
            }
          }
          
          // Add Accept header based on response content types
          const responses = operationObj.responses || {};
          const responseContentTypes = new Set<string>();
          Object.values(responses).forEach((response: any) => {
            if (response.content) {
              Object.keys(response.content).forEach(contentType => {
                responseContentTypes.add(contentType);
              });
            }
          });
          if (responseContentTypes.size > 0) {
            enhancedEndpoint.headers['Accept'] = Array.from(responseContentTypes).join(', ');
          }
          
          // Generate request body example for POST/PUT/PATCH operations
          if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && operationObj.requestBody) {
            const requestBody = operationObj.requestBody;
            const content = requestBody.content;
            
            if (content) {
              // Try JSON content first
              if (content['application/json']?.schema) {
                const jsonSchema = content['application/json'].schema;
                enhancedEndpoint.body = generateExampleFromSchema(jsonSchema);
                enhancedEndpoint.headers['Content-Type'] = 'application/json';
              }
              // Then XML
              else if (content['application/xml']?.schema) {
                const xmlSchema = content['application/xml'].schema;
                enhancedEndpoint.body = generateXmlExampleFromSchema(xmlSchema);
                enhancedEndpoint.headers['Content-Type'] = 'application/xml';
              }
              // Then form data
              else if (content['application/x-www-form-urlencoded']?.schema) {
                const formSchema = content['application/x-www-form-urlencoded'].schema;
                enhancedEndpoint.body = generateFormExampleFromSchema(formSchema);
                enhancedEndpoint.headers['Content-Type'] = 'application/x-www-form-urlencoded';
              }
              // Default to first available content type
              else {
                const firstContentType = Object.keys(content)[0];
                if (content[firstContentType]?.schema) {
                  enhancedEndpoint.body = generateExampleFromSchema(content[firstContentType].schema);
                  enhancedEndpoint.headers['Content-Type'] = firstContentType;
                }
              }
            }
          }
          
          break;
        }
      }
    }
    
    return enhancedEndpoint;
  });
  
  return enhanced;
}

// Generate JSON example from schema
function generateExampleFromSchema(schema: any): string {
  const example = createExampleObject(schema);
  return JSON.stringify(example, null, 2);
}

// Generate XML example from schema  
function generateXmlExampleFromSchema(schema: any): string {
  const example = createExampleObject(schema);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${objectToXml(example, '  ')}\n</root>`;
}

// Generate form data example from schema
function generateFormExampleFromSchema(schema: any): string {
  const example = createExampleObject(schema);
  const pairs = Object.entries(example).map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return pairs.join('&');
}

// Create example object from JSON schema
function createExampleObject(schema: any): any {
  if (schema.example !== undefined) {
    return schema.example;
  }
  
  if (schema.examples && Array.isArray(schema.examples) && schema.examples.length > 0) {
    return schema.examples[0];
  }
  
  switch (schema.type) {
    case 'object':
      const obj: any = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = createExampleObject(propSchema as any);
        }
      }
      return obj;
      
    case 'array':
      if (schema.items) {
        return [createExampleObject(schema.items)];
      }
      return [];
      
    case 'string':
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum[0];
      }
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'date') return '2023-01-01';
      if (schema.format === 'date-time') return '2023-01-01T00:00:00Z';
      if (schema.format === 'uri') return 'https://example.com';
      return schema.pattern ? 'example' : 'string';
      
    case 'number':
    case 'integer':
      if (schema.minimum !== undefined) return schema.minimum;
      if (schema.maximum !== undefined) return Math.min(schema.maximum, 100);
      return schema.type === 'integer' ? 1 : 1.0;
      
    case 'boolean':
      return true;
      
    case 'null':
      return null;
      
    default:
      return 'example';
  }
}

// Convert object to XML string
function objectToXml(obj: any, indent: string = ''): string {
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${indent}<${key}>`);
          lines.push(objectToXml(item, indent + '  '));
          lines.push(`${indent}</${key}>`);
        } else {
          lines.push(`${indent}<${key}>${item}</${key}>`);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${indent}<${key}>`);
      lines.push(objectToXml(value, indent + '  '));
      lines.push(`${indent}</${key}>`);
    } else {
      lines.push(`${indent}<${key}>${value}</${key}>`);
    }
  }
  
  return lines.join('\n');
}

async function configRoutes(fastify: FastifyInstance) {

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Get current configuration
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Config'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

  // GET /api/config - Get current configuration
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { space } = request.query as { space?: string };
    
    try {
      // Handle default space mapping - use 'default' directly since we cleaned up the database
      const actualSpace = space || 'default';
      
      if (actualSpace && !dbConfigManager.spaceExists(actualSpace)) {
        reply.status(404);
        return {
          success: false,
          error: 'Configuration not found',
          message: `Space '${space}' does not exist. Create it first using POST /api/config/spaces`,
          timestamp: new Date().toISOString()
        };
      }
      
      const config = dbConfigManager.loadConfig(undefined, actualSpace);
      
      return {
        success: true,
        data: config,
        space: space || 'default',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to load config:', error);
      
      // Return 404 for missing config files (spaces)
      if (error instanceof Error && error.message.includes('Config file not found')) {
        reply.status(404);
        return {
          success: false,
          error: 'Configuration not found',
          message: space ? `Space '${space}' does not exist. Create it first using POST /api/config/spaces` : 'Default configuration not found',
          timestamp: new Date().toISOString()
        };
      }
      
      reply.status(500);
      return {
        success: false,
        error: 'Failed to load configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

/**
 * @swagger
 * /api/config:
 *   put:
 *     summary: Update configuration
 *     tags: [Config]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Config'
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // PUT /api/config - Update configuration
  fastify.put('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const config = request.body as any;
      const { space } = request.query as { space?: string };
      
      // Basic validation
      if (!config.endpoints || !Array.isArray(config.endpoints)) {
        reply.status(400);
        return {
          success: false,
          error: 'Invalid configuration',
          message: 'endpoints must be an array',
          timestamp: new Date().toISOString()
        };
      }

      // Get space from database
      const spaceRecord = dbConfigManager.database.getSpaceByName(space || 'default');
      if (!spaceRecord) {
        throw new Error(`Space '${space || 'default'}' not found`);
      }
      
      // Delete all existing endpoints for this space
      const existingEndpoints = dbConfigManager.database.getEndpointsBySpaceId(spaceRecord.id);
      for (const endpoint of existingEndpoints) {
        dbConfigManager.database.deleteEndpoint(endpoint.id);
      }
      
      // Add all new endpoints
      for (const endpoint of config.endpoints) {
        dbConfigManager.database.createEndpoint(spaceRecord.id, endpoint);
      }
      
      return {
        success: true,
        message: 'Configuration updated successfully',
        space: space || 'default',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to update config:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

/**
 * @swagger
 * /api/config/endpoints:
 *   get:
 *     summary: Get all configured endpoints
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Endpoints retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ApiEndpoint'
 *                     count:
 *                       type: integer
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/config/endpoints - Get all endpoints
  fastify.get('/endpoints', async (request: FastifyRequest, reply: FastifyReply) => {
    const { space } = request.query as { space?: string };
    
    try {
      // Handle default space mapping - use 'default' directly since we cleaned up the database
      const actualSpace = space || 'default';
      
      if (actualSpace && !dbConfigManager.spaceExists(actualSpace)) {
        reply.status(404);
        return {
          success: false,
          error: 'Configuration not found',
          message: `Space '${space}' does not exist. Create it first using POST /api/config/spaces`,
          timestamp: new Date().toISOString()
        };
      }
      
      const config = dbConfigManager.loadConfig(undefined, actualSpace);
      
      return {
        success: true,
        data: config.endpoints,
        count: config.endpoints.length,
        space: space || 'default',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to load endpoints:', error);
      
      reply.status(500);
      return {
        success: false,
        error: 'Failed to load endpoints',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // POST /api/config/endpoints - Add a new endpoint
  fastify.post('/endpoints', async (request: FastifyRequest, reply: FastifyReply) => {
    const { space } = request.query as { space?: string };
    
    try {
      const endpoint = request.body as any;
      const configManager = dbConfigManager;
      
      // Load current config
      const config = configManager.loadConfig(undefined, space);
      
      // Check if endpoint name already exists
      if (config.endpoints.find(e => e.name === endpoint.name)) {
        reply.status(400);
        return {
          success: false,
          error: 'Endpoint already exists',
          message: `Endpoint with name '${endpoint.name}' already exists`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get space from database
      const spaceRecord = dbConfigManager.database.getSpaceByName(space || 'default');
      if (!spaceRecord) {
        throw new Error(`Space '${space || 'default'}' not found`);
      }
      
      // Add endpoint to database
      dbConfigManager.database.createEndpoint(spaceRecord.id, endpoint);
      
      return {
        success: true,
        message: 'Endpoint added successfully',
        data: endpoint,
        space: space || 'default',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to add endpoint:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to add endpoint',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // PUT /api/config/endpoints/:name - Update an endpoint
  fastify.put('/endpoints/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const { space } = request.query as { space?: string };
    const { name } = request.params as { name: string };
    
    try {
      const updatedEndpoint = request.body as any;
      const configManager = dbConfigManager;
      
      // Load current config
      const config = configManager.loadConfig(undefined, space);
      
      // Find endpoint index
      const endpointIndex = config.endpoints.findIndex(e => e.name === name);
      
      if (endpointIndex === -1) {
        reply.status(404);
        return {
          success: false,
          error: 'Endpoint not found',
          message: `Endpoint with name '${name}' not found`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get space from database
      const spaceRecord = dbConfigManager.database.getSpaceByName(space || 'default');
      if (!spaceRecord) {
        throw new Error(`Space '${space || 'default'}' not found`);
      }
      
      // Find endpoint in database
      const endpointRecord = dbConfigManager.database.getEndpointsBySpaceId(spaceRecord.id)
        .find(e => e.name === name);
      if (!endpointRecord) {
        throw new Error(`Endpoint '${name}' not found in database`);
      }
      
      // Update endpoint in database
      dbConfigManager.database.updateEndpoint(endpointRecord.id, updatedEndpoint);
      
      return {
        success: true,
        message: 'Endpoint updated successfully',
        data: updatedEndpoint,
        space: space || 'default',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to update endpoint:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to update endpoint',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // DELETE /api/config/endpoints/:name - Delete an endpoint
  fastify.delete('/endpoints/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const { space, deleteSnapshots } = request.query as { space?: string; deleteSnapshots?: string };
    const { name } = request.params as { name: string };
    
    try {
      const configManager = dbConfigManager;
      
      // Load current config
      const config = configManager.loadConfig(undefined, space);
      
      // Find endpoint index
      const endpointIndex = config.endpoints.findIndex(e => e.name === name);
      
      if (endpointIndex === -1) {
        // Return success for idempotent behavior
        return {
          success: true,
          message: `Endpoint '${name}' does not exist (already deleted)`,
          space: space || 'default',
          timestamp: new Date().toISOString()
        };
      }
      
      // Delete associated snapshots if requested
      let snapshotsDeleted = 0;
      if (deleteSnapshots === 'true') {
        try {
          const fs = await import('fs');
          const path = await import('path');
          
          // Determine snapshot directory
          const spaceDir = space && space !== 'default' ? space : '';
          const snapshotDir = spaceDir ? 
            path.join(config.snapshotDir || 'snapshots', spaceDir) : 
            (config.snapshotDir || 'snapshots');
          
          // Find and delete snapshot files for this endpoint
          if (fs.existsSync(snapshotDir)) {
            const files = fs.readdirSync(snapshotDir);
            const endpointSnapshots = files.filter(file => 
              file.includes(name) && file.endsWith('.json')
            );
            
            for (const file of endpointSnapshots) {
              const filePath = path.join(snapshotDir, file);
              try {
                // Verify this is actually a snapshot for our endpoint
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const snapshot = JSON.parse(fileContent);
                if (snapshot.endpoint?.name === name) {
                  fs.unlinkSync(filePath);
                  snapshotsDeleted++;
                }
              } catch (parseError) {
                console.warn(`Could not parse snapshot file ${file}, skipping`);
              }
            }
          }
        } catch (fsError) {
          console.warn('Could not delete snapshots:', fsError);
          // Continue with endpoint deletion even if snapshot deletion fails
        }
      }
      
      // Get space from database
      const spaceRecord = dbConfigManager.database.getSpaceByName(space || 'default');
      if (!spaceRecord) {
        throw new Error(`Space '${space || 'default'}' not found`);
      }
      
      // Delete endpoint from database
      dbConfigManager.database.deleteEndpointByName(spaceRecord.id, name);
      
      const message = deleteSnapshots === 'true' ? 
        `Endpoint deleted successfully (${snapshotsDeleted} snapshots also deleted)` :
        'Endpoint deleted successfully';
      
      return {
        success: true,
        message,
        snapshotsDeleted,
        space: space || 'default',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to delete endpoint',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // GET /api/config/spaces - List available config spaces
  fastify.get('/spaces', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const spaces = dbConfigManager.listSpaces().map(space => 
        space === 'default space' ? 'default' : space
      );
      
      return {
        success: true,
        data: spaces,
        count: spaces.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to list spaces:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to list spaces',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // POST /api/config/spaces - Create new config space
  fastify.post('/spaces', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { space, config, template, includeExample } = request.body as { 
        space: string; 
        config?: any; 
        template?: string;
        includeExample?: boolean;
      };
      
      if (!space) {
        reply.status(400);
        return {
          success: false,
          error: 'Space name is required',
          timestamp: new Date().toISOString()
        };
      }

      const configManager = dbConfigManager;
      configManager.createSpace(space, {
        config,
        template,
        includeExample: includeExample ?? false, // Web UI defaults to empty
        source: 'web'
      });
      
      return {
        success: true,
        message: `Space '${space}' created successfully`,
        space: space,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to create space:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to create space',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // GET /api/config/templates - Get available templates
  fastify.get('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const templates = [
        {
          name: 'api-testing',
          description: 'Template for API testing with common endpoints'
        }
      ];
      
      return {
        success: true,
        data: templates,
        count: templates.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to list templates:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to list templates',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // POST /api/config/import-openapi - Import OpenAPI schema and generate endpoints
  fastify.post('/import-openapi', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { space } = request.query as { space?: string };
      const { schema, baseUrl, merge, overwriteExisting } = request.body as { 
        schema: any; 
        baseUrl?: string; 
        merge?: boolean; 
        overwriteExisting?: boolean; 
      };
      
      if (!schema) {
        reply.status(400);
        return {
          success: false,
          error: 'Schema is required',
          message: 'OpenAPI schema data must be provided',
          timestamp: new Date().toISOString()
        };
      }

      // Validate OpenAPI structure
      if (!schema.openapi && !schema.swagger) {
        reply.status(400);
        return {
          success: false,
          error: 'Invalid schema format',
          message: 'Schema must be a valid OpenAPI/Swagger document',
          timestamp: new Date().toISOString()
        };
      }

      if (!schema.paths) {
        reply.status(400);
        return {
          success: false,
          error: 'Invalid schema structure',
          message: 'Schema must contain paths definition',
          timestamp: new Date().toISOString()
        };
      }

      // Generate endpoints from schema
      const { SchemaManager } = await import('../../schema-manager.js');
      const schemaManager = new SchemaManager();
      
      // Create temporary file to use existing generateEndpointsFromOpenApi method
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `openapi-${Date.now()}.json`);
      
      try {
        // Write schema to temp file
        fs.writeFileSync(tempFile, JSON.stringify(schema, null, 2));
        
        // Generate endpoints using existing method
        const generatedEndpoints = await schemaManager.generateEndpointsFromOpenApi(tempFile, baseUrl);
        
        // Enhance endpoints with request body examples from the schema
        const enhancedEndpoints = enhanceEndpointsWithBodies(generatedEndpoints, schema, baseUrl);
        
        // Clean up temp file
        fs.unlinkSync(tempFile);
        
        let finalEndpoints = enhancedEndpoints;
        let importedCount = enhancedEndpoints.length;
        let skippedCount = 0;
        let overwrittenCount = 0;

        if (merge) {
          const configManager = dbConfigManager;
          const currentConfig = configManager.loadConfig(undefined, space);
          const existingEndpoints = currentConfig.endpoints;
          
          // Get space from database
          const spaceRecord = configManager.database.getSpaceByName(space || 'default');
          if (!spaceRecord) {
            throw new Error(`Space '${space || 'default'}' not found`);
          }
          
          const endpointsToAdd = [];
          const conflictReport = [];

          for (const newEndpoint of enhancedEndpoints) {
            const existing = existingEndpoints.find(e => e.name === newEndpoint.name);
            
            if (existing) {
              if (overwriteExisting) {
                // Update existing endpoint in database
                const existingRecord = configManager.database.getEndpointsBySpaceId(spaceRecord.id)
                  .find(e => e.name === newEndpoint.name);
                if (existingRecord) {
                  configManager.database.updateEndpoint(existingRecord.id, newEndpoint);
                  overwrittenCount++;
                  conflictReport.push({ name: newEndpoint.name, action: 'overwritten' });
                }
              } else {
                // Skip conflicting endpoint
                skippedCount++;
                conflictReport.push({ name: newEndpoint.name, action: 'skipped' });
              }
            } else {
              // Add new endpoint
              endpointsToAdd.push(newEndpoint);
            }
          }

          // Add new endpoints to database
          for (const endpoint of endpointsToAdd) {
            configManager.database.createEndpoint(spaceRecord.id, endpoint);
          }
          
          // Get updated endpoints from database
          finalEndpoints = configManager.database.getEndpointsBySpaceName(space || 'default');
          importedCount = endpointsToAdd.length;
          
          return {
            success: true,
            message: `OpenAPI import completed: ${importedCount} imported, ${overwrittenCount} overwritten, ${skippedCount} skipped`,
            data: {
              imported: importedCount,
              overwritten: overwrittenCount,
              skipped: skippedCount,
              total: enhancedEndpoints.length,
              endpoints: finalEndpoints,
              conflicts: conflictReport
            },
            space: space || 'default',
            timestamp: new Date().toISOString()
          };
        } else {
          // Replace entire configuration
          const configManager = dbConfigManager;
          
          // Get space from database
          const spaceRecord = configManager.database.getSpaceByName(space || 'default');
          if (!spaceRecord) {
            throw new Error(`Space '${space || 'default'}' not found`);
          }
          
          // Delete all existing endpoints for this space
          const existingEndpoints = configManager.database.getEndpointsBySpaceId(spaceRecord.id);
          for (const endpoint of existingEndpoints) {
            configManager.database.deleteEndpoint(endpoint.id);
          }
          
          // Add all new endpoints
          for (const endpoint of enhancedEndpoints) {
            configManager.database.createEndpoint(spaceRecord.id, endpoint);
          }
          
          finalEndpoints = enhancedEndpoints;
          
          return {
            success: true,
            message: `OpenAPI import completed: ${importedCount} endpoints imported (replaced existing)`,
            data: {
              imported: importedCount,
              overwritten: 0,
              skipped: 0,
              total: enhancedEndpoints.length,
              endpoints: enhancedEndpoints,
              conflicts: []
            },
            space: space || 'default',
            timestamp: new Date().toISOString()
          };
        }

      } catch (fsError) {
        // Clean up temp file on error
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        } catch {}
        throw fsError;
      }

    } catch (error) {
      console.error('Failed to import OpenAPI schema:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to import OpenAPI schema',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // GET /api/config/fetch-openapi - Proxy endpoint to fetch OpenAPI schemas from external URLs
  fastify.get('/fetch-openapi', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { url } = request.query as { url?: string };
      
      if (!url) {
        reply.status(400);
        return {
          success: false,
          error: 'URL is required',
          message: 'Please provide a URL parameter',
          timestamp: new Date().toISOString()
        };
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        reply.status(400);
        return {
          success: false,
          error: 'Invalid URL',
          message: 'Please provide a valid URL',
          timestamp: new Date().toISOString()
        };
      }

      // Fetch the schema using native fetch (Node.js 18+)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json, application/yaml, text/plain',
            'User-Agent': 'API-Snapshot-Verifier/1.0'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeout);

        if (!response.ok) {
          reply.status(response.status);
          return {
            success: false,
            error: `Failed to fetch schema: ${response.status}`,
            message: response.statusText,
            timestamp: new Date().toISOString()
          };
        }

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        // Try to parse as JSON
        try {
          const schema = JSON.parse(text);
          return {
            success: true,
            data: schema,
            contentType,
            timestamp: new Date().toISOString()
          };
        } catch {
          // If not JSON, return as text (might be YAML)
          return {
            success: true,
            data: text,
            contentType,
            isText: true,
            timestamp: new Date().toISOString()
          };
        }
      } catch (fetchError: any) {
        clearTimeout(timeout);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout - schema fetch took too long');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Failed to fetch OpenAPI schema:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to fetch OpenAPI schema',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // GET /api/config/version - Get backend version
  fastify.get('/version', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Read backend package.json
      const fs = await import('fs');
      const path = await import('path');
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      return {
        success: true,
        data: {
          version: packageJson.version,
          name: packageJson.name,
          description: packageJson.description
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get version:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get version',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // GET /api/config/server-info - Get comprehensive server information
  fastify.get('/server-info', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Get backend version
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Check WebSocket status
      const hasWebSocket = !!(fastify as any).io;
      const isWebSocketEnabled = hasWebSocket && (fastify as any).io.engine;
      
      // Get database statistics
      let statistics = {
        spaces: 0,
        endpoints: 0,
        parameters: 0,
        snapshots: 0
      };
      
      try {
        const spaces = dbConfigManager.database.getAllSpaces();
        statistics.spaces = spaces.length;
        
        // Count endpoints across all spaces
        for (const space of spaces) {
          const endpoints = dbConfigManager.database.getEndpointsBySpaceId(space.id);
          statistics.endpoints += endpoints.length;
          
          // Count parameters for this space
          const parameters = dbConfigManager.database.getSpaceParameters(space.id);
          statistics.parameters += Object.keys(parameters).length;
        }
        
        // Count snapshots (if we have a method for it)
        // For now, we'll estimate based on file system if needed
      } catch (dbError) {
        console.error('Failed to get database statistics:', dbError);
      }
      
      return {
        success: true,
        data: {
          server: {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform,
            memory: {
              used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
              unit: 'MB'
            }
          },
          websocket: {
            available: hasWebSocket,
            enabled: isWebSocketEnabled,
            endpoint: hasWebSocket ? '/socket.io/' : null,
            transports: hasWebSocket ? ['websocket', 'polling'] : [],
            connectedClients: isWebSocketEnabled ? (fastify as any).io.engine.clientsCount : 0
          },
          database: {
            type: 'SQLite',
            statistics
          },
          features: {
            realTimeUpdates: hasWebSocket,
            authentication: true,
            schemaValidation: true,
            diffEngine: true,
            pluginSystem: true,
            webUI: true
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get server info:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get server information',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // GET /api/config/websocket-status - Check WebSocket availability
  fastify.get('/websocket-status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check if Socket.IO is available on the fastify instance
      const hasWebSocket = !!(fastify as any).io;
      const isEnabled = hasWebSocket && (fastify as any).io.engine;
      
      return {
        success: true,
        data: {
          available: hasWebSocket,
          enabled: isEnabled,
          endpoint: hasWebSocket ? '/socket.io/' : null,
          transports: hasWebSocket ? ['websocket', 'polling'] : [],
          connectedClients: isEnabled ? (fastify as any).io.engine.clientsCount : 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get WebSocket status:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get WebSocket status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // DELETE /api/config/spaces/:space - Delete a config space
  fastify.delete('/spaces/:space', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { space } = request.params as { space: string };
      
      if (!space) {
        reply.status(400);
        return {
          success: false,
          error: 'Space name is required',
          timestamp: new Date().toISOString()
        };
      }

      const configManager = dbConfigManager;
      
      // Check if space exists
      if (!configManager.spaceExists(space)) {
        // Return success for idempotent behavior - space already doesn't exist
        return {
          success: true,
          message: `Space '${space}' does not exist (already deleted)`,
          space: space,
          timestamp: new Date().toISOString()
        };
      }
      
      // Prevent deletion of certain protected spaces
      if (space === 'default') {
        reply.status(400);
        return {
          success: false,
          error: 'Cannot delete default space',
          timestamp: new Date().toISOString()
        };
      }
      
      configManager.deleteSpace(space);
      
      return {
        success: true,
        message: `Space '${space}' deleted successfully`,
        space: space,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to delete space:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to delete space',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });
}

export { configRoutes };