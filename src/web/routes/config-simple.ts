import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ConfigManager } from '../../config.js';

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
    try {
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig('./api-snapshot.config.json');
      
      return {
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to load config:', error);
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

      const configManager = new ConfigManager();
      await configManager.saveConfig('./api-snapshot.config.json', config);
      
      return {
        success: true,
        message: 'Configuration updated successfully',
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
    try {
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig('./api-snapshot.config.json');
      
      return {
        success: true,
        data: config.endpoints,
        count: config.endpoints.length,
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
}

export { configRoutes };