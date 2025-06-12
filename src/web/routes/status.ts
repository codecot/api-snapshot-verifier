import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import os from 'os';

async function statusRoutes(fastify: FastifyInstance) {

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get system status
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: System status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SystemStatus'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

  // GET /api/status - Get system status
  fastify.get('/', async (request, reply) => {
    try {
      const status = {
        application: {
          name: 'API Snapshot Verifier',
          version: process.env.npm_package_version || '1.0.0',
          environment: (request as any).coreApp?.getConfig()?.environment || 'development',
          uptime: process.uptime(),
          pid: process.pid
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem(),
            usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2) + '%'
          },
          cpu: {
            cores: os.cpus().length,
            model: os.cpus()[0]?.model || 'Unknown',
            load: os.loadavg()
          }
        },
        config: {
          endpoints: (request as any).coreApp?.getConfig()?.endpoints?.length || 0,
          snapshotDir: (request as any).coreApp?.getConfig()?.snapshotDir || './snapshots',
          baselineDir: (request as any).coreApp?.getConfig()?.baselineDir || './baselines',
          plugins: {
            auth: (request as any).coreApp?.getConfig()?.plugins?.auth?.providers?.length || 0,
            formatter: (request as any).coreApp?.getConfig()?.plugins?.formatters?.default || 'table',
            storage: (request as any).coreApp?.getConfig()?.plugins?.storage?.provider || 'filesystem',
            diff: (request as any).coreApp?.getConfig()?.plugins?.diff?.engine || 'json'
          }
        },
        timestamp: new Date().toISOString()
      };
      
      return {
        success: true,
        data: status
      };
    } catch (error) {
      (request as any).logger?.error('Failed to get status:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * @swagger
 * /api/status/metrics:
 *   get:
 *     summary: Get performance metrics
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
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
 *                         requests:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             active:
 *                               type: integer
 *                             errors:
 *                               type: integer
 *                         snapshots:
 *                           type: object
 *                           properties:
 *                             captured:
 *                               type: integer
 *                             compared:
 *                               type: integer
 *                             failed:
 *                               type: integer
 *                         performance:
 *                           type: object
 *                           properties:
 *                             averageResponseTime:
 *                               type: number
 *                             p95ResponseTime:
 *                               type: number
 *                             p99ResponseTime:
 *                               type: number
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // GET /api/status/metrics - Get performance metrics
  fastify.get('/metrics', async (request, reply) => {
    try {
      const metrics = {
        requests: {
          total: 0, // Would track this in production
          active: 0,
          errors: 0
        },
        snapshots: {
          captured: 0, // Would track this
          compared: 0,
          failed: 0
        },
        performance: {
          averageResponseTime: 0, // Would calculate this
          p95ResponseTime: 0,
          p99ResponseTime: 0
        },
        timestamp: new Date().toISOString()
      };
      
      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      (request as any).logger?.error('Failed to get metrics:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

export { statusRoutes };