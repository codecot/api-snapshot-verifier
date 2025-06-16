import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

async function spacesHierarchicalRoutes(fastify: FastifyInstance) {

/**
 * @swagger
 * /api/spaces:
 *   get:
 *     summary: List all spaces
 *     tags: [Spaces]
 *     responses:
 *       200:
 *         description: Spaces retrieved successfully
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
 *                         $ref: '#/components/schemas/Space'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/spaces - List all spaces
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { DatabaseService } = await import('../../database/database-service.js');
      const dbService = new DatabaseService();
      
      try {
        const spaces = dbService.listSpacesWithStats();
        
        return {
          success: true,
          data: spaces,
          count: spaces.length,
          timestamp: new Date().toISOString()
        };
      } finally {
        dbService.close();
      }
    } catch (error) {
      (request as any).logger?.error('Failed to list spaces:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to list spaces',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/spaces/{space}:
 *   get:
 *     summary: Get specific space details
 *     tags: [Spaces]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space name
 *     responses:
 *       200:
 *         description: Space retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Space'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/spaces/:space - Get specific space details
  fastify.get<{ Params: { space: string } }>('/:space', async (request, reply) => {
    try {
      const { space } = request.params;
      
      const { DatabaseService } = await import('../../database/database-service.js');
      const dbService = new DatabaseService();
      
      try {
        const spaceRecord = dbService.getSpaceByName(space);
        
        if (!spaceRecord) {
          reply.status(404);
          return {
            success: false,
            error: 'Space not found',
            message: `Space '${space}' does not exist`
          };
        }
        
        const stats = dbService.getSpaceStats(spaceRecord.id);
        
        return {
          success: true,
          data: {
            ...spaceRecord,
            stats
          },
          timestamp: new Date().toISOString()
        };
      } finally {
        dbService.close();
      }
    } catch (error) {
      (request as any).logger?.error('Failed to get space:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get space',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/spaces/{space}/endpoints:
 *   get:
 *     summary: List endpoints in a space
 *     tags: [Spaces, Endpoints]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space name
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/spaces/:space/endpoints - List endpoints in a space
  fastify.get<{ Params: { space: string } }>('/:space/endpoints', async (request, reply) => {
    try {
      const { space } = request.params;
      
      const { DatabaseConfigManager } = await import('../../database/database-config-manager.js');
      const configManager = new DatabaseConfigManager();
      
      if (!configManager.spaceExists(space)) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${space}' does not exist`
        };
      }
      
      const config = configManager.loadConfig(undefined, space);
      const endpoints = config.endpoints || [];
      
      return {
        success: true,
        data: endpoints,
        count: endpoints.length,
        space: space,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      (request as any).logger?.error('Failed to list endpoints:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to list endpoints',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/spaces/{space}/endpoints/{endpoint}:
 *   get:
 *     summary: Get specific endpoint details
 *     tags: [Spaces, Endpoints]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space name
 *       - in: path
 *         name: endpoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint name
 *     responses:
 *       200:
 *         description: Endpoint retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ApiEndpoint'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/spaces/:space/endpoints/:endpoint - Get specific endpoint details
  fastify.get<{ Params: { space: string; endpoint: string } }>('/:space/endpoints/:endpoint', async (request, reply) => {
    try {
      const { space, endpoint } = request.params;
      
      const { DatabaseConfigManager } = await import('../../database/database-config-manager.js');
      const configManager = new DatabaseConfigManager();
      
      if (!configManager.spaceExists(space)) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${space}' does not exist`
        };
      }
      
      const config = configManager.loadConfig(undefined, space);
      const endpointData = config.endpoints?.find(e => e.name === endpoint);
      
      if (!endpointData) {
        reply.status(404);
        return {
          success: false,
          error: 'Endpoint not found',
          message: `Endpoint '${endpoint}' does not exist in space '${space}'`
        };
      }
      
      return {
        success: true,
        data: endpointData,
        space: space,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      (request as any).logger?.error('Failed to get endpoint:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get endpoint',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/spaces/{space}/snapshots:
 *   get:
 *     summary: List all snapshots in a space
 *     tags: [Spaces, Snapshots]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of snapshots to return
 *     responses:
 *       200:
 *         description: Snapshots retrieved successfully
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
 *                         $ref: '#/components/schemas/Snapshot'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/spaces/:space/snapshots - List all snapshots in a space
  fastify.get<{ Params: { space: string }; Querystring: { limit?: string } }>('/:space/snapshots', async (request, reply) => {
    try {
      const { space } = request.params;
      const { limit } = request.query;
      const snapshotLimit = limit ? parseInt(limit) : 100;
      
      const { DatabaseConfigManager } = await import('../../database/database-config-manager.js');
      const { DatabaseService } = await import('../../database/database-service.js');
      const configManager = new DatabaseConfigManager();
      const dbService = new DatabaseService();
      
      try {
        if (!configManager.spaceExists(space)) {
          reply.status(404);
          return {
            success: false,
            error: 'Space not found',
            message: `Space '${space}' does not exist`
          };
        }
        
        const spaceRecord = dbService.getSpaceByName(space);
        const snapshots = [];
        
        if (spaceRecord) {
          const dbSnapshots = dbService.getSnapshotsBySpaceId(spaceRecord.id, snapshotLimit);
          
          for (const dbSnapshot of dbSnapshots) {
            const endpoint = dbService.getEndpointById(dbSnapshot.endpoint_id);
            if (endpoint) {
              snapshots.push({
                id: dbSnapshot.id.toString(),
                filename: dbSnapshot.filename,
                endpoint: endpoint.name,
                timestamp: dbSnapshot.created_at,
                status: dbSnapshot.status,
                url: endpoint.url,
                method: endpoint.method,
                responseStatus: dbSnapshot.response_status,
                error: dbSnapshot.error,
                duration: dbSnapshot.duration
              });
            }
          }
        }
        
        // Sort by timestamp (newest first)
        snapshots.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        });
        
        return {
          success: true,
          data: snapshots,
          count: snapshots.length,
          space: space,
          timestamp: new Date().toISOString()
        };
      } finally {
        dbService.close();
      }
    } catch (error) {
      (request as any).logger?.error('Failed to list snapshots:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to list snapshots',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/spaces/{space}/endpoints/{endpoint}/snapshots:
 *   get:
 *     summary: List snapshots for a specific endpoint
 *     tags: [Spaces, Endpoints, Snapshots]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space name
 *       - in: path
 *         name: endpoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of snapshots to return
 *     responses:
 *       200:
 *         description: Snapshots retrieved successfully
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
 *                         $ref: '#/components/schemas/Snapshot'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/spaces/:space/endpoints/:endpoint/snapshots - List snapshots for specific endpoint
  fastify.get<{ Params: { space: string; endpoint: string }; Querystring: { limit?: string } }>('/:space/endpoints/:endpoint/snapshots', async (request, reply) => {
    try {
      const { space, endpoint } = request.params;
      const { limit } = request.query;
      const snapshotLimit = limit ? parseInt(limit) : 100;
      
      const { DatabaseConfigManager } = await import('../../database/database-config-manager.js');
      const { DatabaseService } = await import('../../database/database-service.js');
      const configManager = new DatabaseConfigManager();
      const dbService = new DatabaseService();
      
      try {
        if (!configManager.spaceExists(space)) {
          reply.status(404);
          return {
            success: false,
            error: 'Space not found',
            message: `Space '${space}' does not exist`
          };
        }
        
        const spaceRecord = dbService.getSpaceByName(space);
        if (!spaceRecord) {
          reply.status(404);
          return {
            success: false,
            error: 'Space not found',
            message: `Space '${space}' does not exist`
          };
        }
        
        // Find the endpoint
        const endpointRecords = dbService.getEndpointsBySpaceId(spaceRecord.id);
        const endpointRecord = endpointRecords.find(e => e.name === endpoint);
        
        if (!endpointRecord) {
          reply.status(404);
          return {
            success: false,
            error: 'Endpoint not found',
            message: `Endpoint '${endpoint}' does not exist in space '${space}'`
          };
        }
        
        // Get snapshots for this specific endpoint
        const dbSnapshots = dbService.db.prepare(`
          SELECT * FROM snapshots 
          WHERE space_id = ? AND endpoint_id = ? 
          ORDER BY created_at DESC 
          LIMIT ?
        `).all(spaceRecord.id, endpointRecord.id, snapshotLimit) as any[];
        
        const snapshots = dbSnapshots.map(dbSnapshot => ({
          id: dbSnapshot.id.toString(),
          filename: dbSnapshot.filename,
          endpoint: endpointRecord.name,
          timestamp: dbSnapshot.created_at,
          status: dbSnapshot.status,
          url: endpointRecord.url,
          method: endpointRecord.method,
          responseStatus: dbSnapshot.response_status,
          error: dbSnapshot.error,
          duration: dbSnapshot.duration
        }));
        
        return {
          success: true,
          data: snapshots,
          count: snapshots.length,
          space: space,
          endpoint: endpoint,
          timestamp: new Date().toISOString()
        };
      } finally {
        dbService.close();
      }
    } catch (error) {
      (request as any).logger?.error('Failed to list endpoint snapshots:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to list endpoint snapshots',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/spaces/{space}/snapshots/capture:
 *   post:
 *     summary: Capture snapshots for entire space
 *     tags: [Spaces, Snapshots]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space name
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endpoints:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific endpoint names to capture (optional)
 *     responses:
 *       200:
 *         description: Snapshot capture started successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                       description: Capture job ID
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // POST /api/spaces/:space/snapshots/capture - Capture snapshots for entire space
  fastify.post<{ Params: { space: string } }>('/:space/snapshots/capture', async (request, reply) => {
    try {
      const { space } = request.params;
      const { endpoints } = request.body as { endpoints?: string[] };
      
      // Delegate to the existing capture endpoint with space parameter
      const captureUrl = `/api/snapshots/capture/${space}`;
      
      // Forward the request to the existing capture logic
      const response = await fastify.inject({
        method: 'POST',
        url: captureUrl,
        payload: { endpoints },
        headers: request.headers
      });
      
      return JSON.parse(response.body);
    } catch (error) {
      (request as any).logger?.error('Failed to start capture:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to start capture',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

export { spacesHierarchicalRoutes };