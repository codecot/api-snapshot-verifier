import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

async function pluginRoutes(fastify: FastifyInstance) {

/**
 * @swagger
 * /api/plugins:
 *   get:
 *     summary: List all registered plugins
 *     tags: [Plugins]
 *     responses:
 *       200:
 *         description: Plugins retrieved successfully
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
 *                         auth:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Plugin'
 *                         storage:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Plugin'
 *                         diff:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Plugin'
 *                         formatters:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Plugin'
 *                         validators:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Plugin'
 *                     count:
 *                       type: integer
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

  // GET /api/plugins - List all registered plugins
  fastify.get('/', async (request: FastifyRequest & { logger?: any }, reply: FastifyReply) => {
    try {
      // Mock plugin data
      const plugins = {
        auth: [
          { name: 'bearer', type: 'auth', enabled: true },
          { name: 'api-key', type: 'auth', enabled: true }
        ],
        storage: [
          { name: 'filesystem', type: 'storage', enabled: true }
        ],
        diff: [
          { name: 'json', type: 'diff', enabled: true }
        ],
        formatters: [
          { name: 'table', type: 'formatter', enabled: true },
          { name: 'json', type: 'formatter', enabled: true },
          { name: 'markdown', type: 'formatter', enabled: true }
        ],
        validators: []
      };
      
      return {
        success: true,
        data: plugins,
        count: Object.values(plugins).reduce((sum, category) => sum + category.length, 0)
      };
    } catch (error) {
      (request as any).logger?.error('Failed to list plugins:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to list plugins',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/plugins/{type}/{name}:
 *   get:
 *     summary: Get specific plugin details
 *     tags: [Plugins]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [auth, storage, diff, formatter, validator]
 *         description: Plugin type
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Plugin name
 *     responses:
 *       200:
 *         description: Plugin details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Plugin'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/plugins/:type/:name - Get specific plugin details
  fastify.get<{ Params: { type: string, name: string } }>('/:type/:name', async (request, reply) => {
    try {
      const { type, name } = request.params;
      
      // Mock plugin details
      const plugin = {
        name,
        type,
        enabled: true,
        metadata: {
          description: `${type} plugin: ${name}`,
          version: '1.0.0'
        }
      };
      
      return {
        success: true,
        data: plugin
      };
    } catch (error) {
      (request as any).logger?.error('Failed to get plugin:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get plugin',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

export { pluginRoutes };