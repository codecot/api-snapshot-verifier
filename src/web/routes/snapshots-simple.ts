import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

async function snapshotRoutes(fastify: FastifyInstance) {

/**
 * @swagger
 * /api/snapshots:
 *   get:
 *     summary: List all snapshots
 *     tags: [Snapshots]
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
 *                     count:
 *                       type: integer
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

  // GET /api/snapshots - List all snapshots
  fastify.get('/', async (request: FastifyRequest & { logger?: any }, reply: FastifyReply) => {
    try {
      // Mock data for now
      const snapshots = [
        {
          id: 'snap-1',
          endpoint: 'example-api',
          timestamp: '2025-01-06T10:00:00Z',
          status: 'success'
        },
        {
          id: 'snap-2', 
          endpoint: 'example-api',
          timestamp: '2025-01-06T09:00:00Z',
          status: 'success'
        }
      ];
      
      return {
        success: true,
        data: snapshots,
        count: snapshots.length
      };
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
 * /api/snapshots/{id}:
 *   get:
 *     summary: Get specific snapshot by ID
 *     tags: [Snapshots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Snapshot ID
 *     responses:
 *       200:
 *         description: Snapshot retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Snapshot'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/snapshots/:id - Get specific snapshot
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Mock data
      const snapshot = {
        id,
        endpoint: 'example-api',
        timestamp: '2025-01-06T10:00:00Z',
        status: 'success',
        data: {
          response: {
            status: 200,
            headers: { 'content-type': 'application/json' },
            body: { message: 'Hello World' }
          }
        }
      };
      
      return {
        success: true,
        data: snapshot
      };
    } catch (error) {
      (request as any).logger?.error('Failed to get snapshot:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get snapshot',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/snapshots/capture:
 *   post:
 *     summary: Capture new snapshots
 *     tags: [Snapshots]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endpoints:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ApiEndpoint'
 *                 description: Specific endpoints to capture (optional)
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // POST /api/snapshots/capture - Capture new snapshots
  fastify.post('/capture', async (request: FastifyRequest & { logger?: any }, reply: FastifyReply) => {
    try {
      // For now, just return a success response
      const response = {
        success: true,
        message: 'Snapshot capture started',
        jobId: Date.now().toString()
      };
      
      // Emit via WebSocket if available
      if ((fastify as any).io) {
        (fastify as any).io.to('snapshots').emit('capture:complete', {
          success: true,
          timestamp: new Date().toISOString()
        });
      }
      
      return response;
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

/**
 * @swagger
 * /api/snapshots/compare:
 *   post:
 *     summary: Compare two snapshots
 *     tags: [Snapshots]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [baselineId, snapshotId]
 *             properties:
 *               baselineId:
 *                 type: string
 *                 description: Baseline snapshot ID
 *               snapshotId:
 *                 type: string
 *                 description: Snapshot ID to compare
 *               options:
 *                 type: object
 *                 description: Comparison options
 *     responses:
 *       200:
 *         description: Comparison completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         baselineId:
 *                           type: string
 *                         snapshotId:
 *                           type: string
 *                         result:
 *                           type: string
 *                           enum: [no-changes, changes-detected, error]
 *                         differences:
 *                           type: array
 *                           description: List of differences found
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // POST /api/snapshots/compare - Compare snapshots
  fastify.post('/compare', async (request: FastifyRequest & { logger?: any }, reply: FastifyReply) => {
    try {
      const { baselineId, snapshotId } = request.body as any;
      
      // Mock comparison result
      const comparison = {
        baselineId,
        snapshotId,
        result: 'no-changes',
        differences: [],
        timestamp: new Date().toISOString()
      };
      
      return {
        success: true,
        data: comparison
      };
    } catch (error) {
      (request as any).logger?.error('Failed to compare snapshots:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to compare snapshots',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

export { snapshotRoutes };