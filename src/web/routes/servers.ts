import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseConfigManager } from '../../database/database-config-manager.js';
import { testBackendConnection } from '../../web/frontend/src/config/index.js';

const dbConfigManager = new DatabaseConfigManager();

export async function serversRoutes(fastify: FastifyInstance) {
  // GET /api/servers - List all saved servers
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const servers = dbConfigManager.database.getSavedServers();
      
      // Parse JSON fields
      const parsedServers = servers.map(server => ({
        ...server,
        auth_config: server.auth_config ? JSON.parse(server.auth_config) : null,
        server_info: server.server_info ? JSON.parse(server.server_info) : null,
        is_default: Boolean(server.is_default),
        is_locked: Boolean(server.is_locked)
      }));
      
      return {
        success: true,
        data: parsedServers,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get saved servers:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to retrieve saved servers',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // POST /api/servers - Add a new server
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { url, name, description, environment, auth_config, test_connection } = request.body as {
        url: string;
        name: string;
        description?: string;
        environment?: string;
        auth_config?: any;
        test_connection?: boolean;
      };
      
      if (!url || !name) {
        reply.status(400);
        return {
          success: false,
          error: 'Missing required fields',
          message: 'URL and name are required',
          timestamp: new Date().toISOString()
        };
      }
      
      // Check if server already exists
      const existing = dbConfigManager.database.getSavedServerByUrl(url);
      if (existing) {
        reply.status(409);
        return {
          success: false,
          error: 'Server already exists',
          message: `A server with URL ${url} already exists`,
          timestamp: new Date().toISOString()
        };
      }
      
      let serverInfo = null;
      
      // Test connection if requested
      if (test_connection) {
        try {
          // We need to make an HTTP request to test the connection
          const testUrl = `${url}/api/config/server-info`;
          const response = await fetch(testUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              serverInfo = data.data;
            }
          }
        } catch (testError) {
          console.error('Connection test failed:', testError);
          // Continue anyway - server might be down temporarily
        }
      }
      
      // Create the server
      const newServer = dbConfigManager.database.createSavedServer({
        url,
        name,
        description,
        environment,
        auth_config,
        server_info: serverInfo
      });
      
      // Parse JSON fields for response
      newServer.auth_config = newServer.auth_config ? JSON.parse(newServer.auth_config) : null;
      newServer.server_info = newServer.server_info ? JSON.parse(newServer.server_info) : null;
      newServer.is_default = Boolean(newServer.is_default);
      newServer.is_locked = Boolean(newServer.is_locked);
      
      return {
        success: true,
        data: newServer,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to create server:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to create server',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // PUT /api/servers/:id - Update a server
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const updates = request.body as Partial<{
        name: string;
        description: string;
        environment: string;
        auth_config: any;
        server_info: any;
      }>;
      
      const success = dbConfigManager.database.updateSavedServer(parseInt(id), updates);
      
      if (!success) {
        reply.status(404);
        return {
          success: false,
          error: 'Server not found',
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: true,
        message: 'Server updated successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to update server:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to update server',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // POST /api/servers/:id/set-default - Set a server as default
  fastify.post('/:id/set-default', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const success = dbConfigManager.database.setDefaultServer(parseInt(id));
      
      if (!success) {
        reply.status(404);
        return {
          success: false,
          error: 'Server not found',
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: true,
        message: 'Default server updated successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to set default server:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to set default server',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // POST /api/servers/:id/test - Test connection to a server
  fastify.post('/:id/test', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const server = dbConfigManager.database.getSavedServerById(parseInt(id));
      if (!server) {
        reply.status(404);
        return {
          success: false,
          error: 'Server not found',
          timestamp: new Date().toISOString()
        };
      }
      
      // Test the connection
      const startTime = Date.now();
      let serverInfo = null;
      let success = false;
      let error = null;
      
      try {
        const testUrl = `${server.url}/api/config/server-info`;
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            serverInfo = data.data;
            success = true;
          }
        } else {
          error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (testError) {
        error = testError instanceof Error ? testError.message : 'Connection failed';
      }
      
      const responseTime = Date.now() - startTime;
      
      // Record the connection attempt
      dbConfigManager.database.recordServerConnection(parseInt(id), {
        responseTime,
        success,
        error: error || undefined,
        serverInfo
      });
      
      // Update server info if successful
      if (success && serverInfo) {
        dbConfigManager.database.updateSavedServer(parseInt(id), {
          server_info: serverInfo,
          last_connected_at: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: {
          connected: success,
          responseTime,
          error,
          serverInfo
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to test server connection:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to test connection',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // GET /api/servers/:id/history - Get connection history for a server
  fastify.get('/:id/history', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { limit = '10' } = request.query as { limit?: string };
      
      const parsedLimit = parseInt(limit) || 10;
      const history = dbConfigManager.database.getServerConnectionHistory(
        parseInt(id), 
        parsedLimit
      );
      
      return {
        success: true,
        data: history,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get connection history:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to retrieve connection history',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

  // DELETE /api/servers/:id - Delete a server
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const success = dbConfigManager.database.deleteSavedServer(parseInt(id));
      
      if (!success) {
        reply.status(404);
        return {
          success: false,
          error: 'Server not found or is locked',
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: true,
        message: 'Server deleted successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to delete server:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to delete server',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });
}