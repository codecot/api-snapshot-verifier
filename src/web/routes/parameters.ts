import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { loadSpaceParameters, saveSpaceParameters, extractSpaceParameters, initializeSpaceParameters } from '../../utils/databaseSpaceParameterResolver.js';
import { DatabaseConfigManager } from '../../database/database-config-manager.js';

async function parameterRoutes(fastify: FastifyInstance) {

/**
 * @swagger
 * /api/parameters/{space}:
 *   get:
 *     summary: Get space parameters
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space/environment name
 *     responses:
 *       200:
 *         description: Parameters retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       description: Key-value pairs of parameters
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/parameters/:space - Get space parameters
  fastify.get<{ Params: { space: string } }>('/:space', async (request, reply) => {
    try {
      const { space } = request.params;
      
      // Check if the space exists
      const configManager = new DatabaseConfigManager();
      if (!configManager.spaceExists(space)) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${space}' does not exist`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Load space parameters
      const parameters = await loadSpaceParameters(space);
      
      return {
        success: true,
        data: parameters,
        space,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      (request as any).logger?.error('Failed to get space parameters:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get space parameters',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/parameters/{space}:
 *   put:
 *     summary: Update space parameters
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space/environment name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties:
 *               type: string
 *             description: Key-value pairs of parameters
 *     responses:
 *       200:
 *         description: Parameters updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // PUT /api/parameters/:space - Update space parameters
  fastify.put<{ Params: { space: string } }>('/:space', async (request, reply) => {
    try {
      const { space } = request.params;
      const parameters = request.body as Record<string, string>;
      
      // Check if the space exists
      const configManager = new DatabaseConfigManager();
      if (!configManager.spaceExists(space)) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${space}' does not exist`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Validate parameters
      if (!parameters || typeof parameters !== 'object') {
        reply.status(400);
        return {
          success: false,
          error: 'Invalid parameters',
          message: 'Parameters must be an object with string key-value pairs',
          timestamp: new Date().toISOString()
        };
      }
      
      // Save space parameters
      await saveSpaceParameters(space, parameters);
      
      return {
        success: true,
        message: `Updated ${Object.keys(parameters).length} parameters for space '${space}'`,
        space,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      (request as any).logger?.error('Failed to update space parameters:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to update space parameters',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/parameters/{space}/{paramName}:
 *   put:
 *     summary: Update a single space parameter
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space/environment name
 *       - in: path
 *         name: paramName
 *         required: true
 *         schema:
 *           type: string
 *         description: Parameter name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 type: string
 *                 description: Parameter value
 *     responses:
 *       200:
 *         description: Parameter updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // PUT /api/parameters/:space/:paramName - Update single parameter
  fastify.put<{ Params: { space: string; paramName: string } }>('/:space/:paramName', async (request, reply) => {
    try {
      const { space, paramName } = request.params;
      const { value } = request.body as { value: string };
      
      // Check if the space exists
      const configManager = new DatabaseConfigManager();
      if (!configManager.spaceExists(space)) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${space}' does not exist`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Validate value
      if (typeof value !== 'string') {
        reply.status(400);
        return {
          success: false,
          error: 'Invalid value',
          message: 'Parameter value must be a string',
          timestamp: new Date().toISOString()
        };
      }
      
      // Load existing parameters
      const parameters = await loadSpaceParameters(space);
      parameters[paramName] = value;
      
      // Save updated parameters
      await saveSpaceParameters(space, parameters);
      
      return {
        success: true,
        message: `Updated parameter '${paramName}' for space '${space}'`,
        space,
        paramName,
        value,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      (request as any).logger?.error('Failed to update parameter:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to update parameter',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/parameters/{space}/{paramName}:
 *   delete:
 *     summary: Delete a space parameter
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space/environment name
 *       - in: path
 *         name: paramName
 *         required: true
 *         schema:
 *           type: string
 *         description: Parameter name
 *     responses:
 *       200:
 *         description: Parameter deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // DELETE /api/parameters/:space/:paramName - Delete parameter
  fastify.delete<{ Params: { space: string; paramName: string } }>('/:space/:paramName', async (request, reply) => {
    try {
      const { space, paramName } = request.params;
      
      // Check if the space exists
      const configManager = new DatabaseConfigManager();
      if (!configManager.spaceExists(space)) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${space}' does not exist`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Load existing parameters
      const parameters = await loadSpaceParameters(space);
      
      if (!(paramName in parameters)) {
        reply.status(404);
        return {
          success: false,
          error: 'Parameter not found',
          message: `Parameter '${paramName}' does not exist in space '${space}'`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Delete parameter
      delete parameters[paramName];
      
      // Save updated parameters
      await saveSpaceParameters(space, parameters);
      
      return {
        success: true,
        message: `Deleted parameter '${paramName}' from space '${space}'`,
        space,
        paramName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      (request as any).logger?.error('Failed to delete parameter:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to delete parameter',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/parameters/{space}/usage:
 *   get:
 *     summary: Get parameter usage across endpoints
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space/environment name
 *     responses:
 *       200:
 *         description: Parameter usage retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: string
 *                       description: Map of parameter names to endpoint names that use them
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/parameters/:space/usage - Get parameter usage in endpoints
  fastify.get<{ Params: { space: string } }>('/:space/usage', async (request, reply) => {
    try {
      const { space } = request.params;
      
      // Check if the space exists
      const configManager = new DatabaseConfigManager();
      if (!configManager.spaceExists(space)) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${space}' does not exist`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Load space configuration to get endpoints
      const spaceConfig = configManager.loadConfig(undefined, space);
      
      // Extract parameters used in each endpoint
      const parameterUsage: Record<string, string[]> = {};
      
      for (const endpoint of spaceConfig.endpoints) {
        // Extract parameters from URL
        const urlParams = (endpoint.url.match(/\{([^}]+)\}/g) || []).map(p => p.slice(1, -1));
        
        // Extract parameters from headers
        const headerParams: string[] = [];
        if (endpoint.headers) {
          for (const headerValue of Object.values(endpoint.headers)) {
            const matches = headerValue.match(/\{([^}]+)\}/g) || [];
            headerParams.push(...matches.map(p => p.slice(1, -1)));
          }
        }
        
        // Extract parameters from body (if it's a string)
        const bodyParams: string[] = [];
        if (endpoint.body && typeof endpoint.body === 'string') {
          const matches = endpoint.body.match(/\{([^}]+)\}/g) || [];
          bodyParams.push(...matches.map(p => p.slice(1, -1)));
        }
        
        // Combine all parameters for this endpoint
        const allParams = [...new Set([...urlParams, ...headerParams, ...bodyParams])];
        
        // Add to usage map
        for (const param of allParams) {
          if (!parameterUsage[param]) {
            parameterUsage[param] = [];
          }
          parameterUsage[param].push(endpoint.name);
        }
      }
      
      return {
        success: true,
        data: parameterUsage,
        space,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      (request as any).logger?.error('Failed to get parameter usage:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get parameter usage',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/parameters/{space}/initialize:
 *   post:
 *     summary: Initialize space parameters from endpoints
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space/environment name
 *     responses:
 *       200:
 *         description: Parameters initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       description: Initialized parameters
 *                     newCount:
 *                       type: integer
 *                       description: Number of new parameters created
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // POST /api/parameters/:space/initialize - Initialize parameters from endpoints
  fastify.post<{ Params: { space: string } }>('/:space/initialize', async (request, reply) => {
    try {
      const { space } = request.params;
      
      // Check if the space exists
      const configManager = new DatabaseConfigManager();
      if (!configManager.spaceExists(space)) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${space}' does not exist`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Load space configuration
      const spaceConfig = configManager.loadConfig(undefined, space);
      
      // Get existing parameters count
      const existingParams = await loadSpaceParameters(space);
      const existingCount = Object.keys(existingParams).length;
      
      // Initialize parameters from endpoints
      const parameters = await initializeSpaceParameters(space, spaceConfig.endpoints);
      const newCount = Object.keys(parameters).length - existingCount;
      
      return {
        success: true,
        message: `Initialized ${newCount} new parameters for space '${space}'`,
        data: parameters,
        newCount,
        totalCount: Object.keys(parameters).length,
        space,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      (request as any).logger?.error('Failed to initialize parameters:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to initialize parameters',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

export { parameterRoutes };