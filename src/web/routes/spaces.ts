import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseService } from '../../database/database-service.js';

const dbService = new DatabaseService();

async function spacesRoutes(fastify: FastifyInstance) {
  // Get all spaces with statistics
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const spaces = dbService.listSpacesWithStats();
      return { spaces };
    } catch (error) {
      console.error('Error fetching spaces:', error);
      reply.status(500);
      return { error: 'Failed to fetch spaces' };
    }
  });

  // Get a single space with statistics
  fastify.get('/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const spaceId = parseInt(request.params.id);
      const space = dbService.getSpaceById(spaceId);
      
      if (!space) {
        reply.status(404);
        return { error: 'Space not found' };
      }
      
      const stats = dbService.getSpaceStats(spaceId);
      return { ...space, stats };
    } catch (error) {
      console.error('Error fetching space:', error);
      reply.status(500);
      return { error: 'Failed to fetch space' };
    }
  });

  // Delete a space (cascade deletes endpoints, parameters, snapshots)
  fastify.delete('/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const spaceId = parseInt(request.params.id);
      const space = dbService.getSpaceById(spaceId);
      
      if (!space) {
        reply.status(404);
        return { error: 'Space not found' };
      }
      
      const success = dbService.deleteSpace(spaceId);
      
      if (success) {
        // Emit WebSocket event for real-time updates
        const io = (fastify as any).io;
        if (io) {
          io.emit('space:deleted', { spaceId, spaceName: space.name });
        }
        
        return { message: `Space '${space.name}' deleted successfully` };
      } else {
        reply.status(500);
        return { error: 'Failed to delete space' };
      }
    } catch (error) {
      console.error('Error deleting space:', error);
      reply.status(500);
      return { error: 'Failed to delete space' };
    }
  });

  // Delete multiple spaces
  fastify.post('/delete-batch', async (request: FastifyRequest<{
    Body: { spaceIds: number[] }
  }>, reply: FastifyReply) => {
    try {
      const { spaceIds } = request.body;
      
      if (!Array.isArray(spaceIds) || spaceIds.length === 0) {
        reply.status(400);
        return { error: 'Invalid request: spaceIds must be a non-empty array' };
      }
      
      const results = dbService.transaction(() => {
        const deleted: string[] = [];
        const failed: string[] = [];
        
        for (const id of spaceIds) {
          const space = dbService.getSpaceById(id);
          if (!space) {
            failed.push(`Space with ID ${id} not found`);
            continue;
          }
          
          const success = dbService.deleteSpace(id);
          if (success) {
            deleted.push(space.name);
          } else {
            failed.push(space.name);
          }
        }
        
        return { deleted, failed };
      });
      
      // Emit WebSocket event for real-time updates
      const io = (fastify as any).io;
      if (io && results.deleted.length > 0) {
        io.emit('spaces:deleted', { 
          deletedSpaces: results.deleted,
          count: results.deleted.length 
        });
      }
      
      return {
        message: `Deleted ${results.deleted.length} spaces`,
        deleted: results.deleted,
        failed: results.failed
      };
    } catch (error) {
      console.error('Error in batch delete:', error);
      reply.status(500);
      return { error: 'Failed to delete spaces' };
    }
  });

  // Update space description
  fastify.patch('/:id', async (request: FastifyRequest<{
    Params: { id: string },
    Body: { description?: string, display_name?: string }
  }>, reply: FastifyReply) => {
    try {
      const spaceId = parseInt(request.params.id);
      const { description, display_name } = request.body;
      
      const space = dbService.getSpaceById(spaceId);
      if (!space) {
        reply.status(404);
        return { error: 'Space not found' };
      }
      
      const updates: any = {};
      if (description !== undefined) updates.description = description;
      if (display_name !== undefined) updates.display_name = display_name;
      
      const success = dbService.updateSpace(spaceId, updates);
      
      if (success) {
        const updatedSpace = dbService.getSpaceById(spaceId);
        
        // Emit WebSocket event for real-time updates
        const io = (fastify as any).io;
        if (io) {
          io.emit('space:updated', { space: updatedSpace });
        }
        
        return updatedSpace;
      } else {
        reply.status(500);
        return { error: 'Failed to update space' };
      }
    } catch (error) {
      console.error('Error updating space:', error);
      reply.status(500);
      return { error: 'Failed to update space' };
    }
  });
}

export { spacesRoutes };