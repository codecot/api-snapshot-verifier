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
      const { space } = request.query as { space?: string };
      const targetSpace = space || 'default';
      
      // Check if the space exists first
      const { DatabaseConfigManager } = await import('../../database/database-config-manager.js');
      const { DatabaseService } = await import('../../database/database-service.js');
      const configManager = new DatabaseConfigManager();
      const dbService = new DatabaseService();
      
      const spaceExists = configManager.spaceExists(targetSpace);
      
      if (!spaceExists) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${targetSpace}' does not exist. Create it first using POST /api/config/spaces`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get space ID for database queries
      const spaceRecord = dbService.getSpaceByName(targetSpace);
      const snapshots = [];
      const addedSnapshotIds = new Set<string>(); // Track added snapshots to avoid duplicates
      
      // First, try to get snapshots from database
      if (spaceRecord) {
        const dbSnapshots = dbService.getSnapshotsBySpaceId(spaceRecord.id, 100);
        
        // Get endpoint details for each snapshot
        for (const dbSnapshot of dbSnapshots) {
          const endpoint = dbService.getEndpointById(dbSnapshot.endpoint_id);
          if (endpoint) {
            const snapshotId = dbSnapshot.filename.replace('.json', '');
            snapshots.push({
              id: dbSnapshot.id.toString(), // Use database ID as string
              filename: snapshotId, // Keep filename for reference
              endpoint: endpoint.name,
              timestamp: dbSnapshot.created_at,
              status: dbSnapshot.status,
              url: endpoint.url,
              method: endpoint.method,
              responseStatus: dbSnapshot.response_status,
              error: dbSnapshot.error,
              duration: dbSnapshot.duration
            });
            addedSnapshotIds.add(snapshotId);
          }
        }
      }
      
      // Also try to read from filesystem to include any legacy snapshots
      // that might not be in the database yet
      {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const { ImprovedStorageProvider } = await import('../../services/improved-storage-provider.js');
          
          // Check multiple possible locations
          const possibleDirs = [
            './snapshots', // Default location
            `./snapshots/${targetSpace}`, // Space-specific location
            `./snapshots/${targetSpace.replace(/[^a-zA-Z0-9_-]/g, '_')}` // Sanitized space location
          ];
          
          for (const baseDir of possibleDirs) {
            if (fs.existsSync(baseDir)) {
              // Check for new structure: endpoint folders
              const entries = fs.readdirSync(baseDir);
              
              for (const entry of entries) {
                const entryPath = path.join(baseDir, entry);
                const stat = fs.statSync(entryPath);
                
                // Handle new directory structure
                if (stat.isDirectory() && (entry.startsWith('ep-') || entry.startsWith('endpoint-'))) {
                  // Read snapshots from endpoint directory
                  const snapshotFiles = fs.readdirSync(entryPath)
                    .filter(file => file.startsWith('run-') && file.endsWith('.json'))
                    .sort((a, b) => {
                      // Extract timestamps and sort
                      const timestampA = parseInt(a.match(/run-(\d+)/)?.[1] || '0');
                      const timestampB = parseInt(b.match(/run-(\d+)/)?.[1] || '0');
                      return timestampB - timestampA;
                    });
                  
                  for (const file of snapshotFiles) {
                    try {
                      const filePath = path.join(entryPath, file);
                      const fileContent = fs.readFileSync(filePath, 'utf-8');
                      const snapshotData = JSON.parse(fileContent);
                      
                      if (spaceRecord) {
                        const endpoints = dbService.getEndpointsBySpaceId(spaceRecord.id);
                        const belongsToSpace = endpoints.some(ep => ep.name === snapshotData.endpoint?.name);
                        
                        if (belongsToSpace) {
                          const snapshotId = file.replace('.json', '');
                          if (!addedSnapshotIds.has(snapshotId)) {
                            snapshots.push({
                              id: snapshotId,
                              filename: snapshotId,
                              endpoint: snapshotData.endpoint?.name || 'unknown',
                              timestamp: snapshotData.timestamp,
                              status: (snapshotData.response?.status >= 200 && snapshotData.response?.status < 300) ? 'success' : 'error',
                              url: snapshotData.endpoint?.url,
                              method: snapshotData.endpoint?.method,
                              responseStatus: snapshotData.response?.status,
                              error: snapshotData.error,
                              duration: snapshotData.response?.duration
                            });
                            addedSnapshotIds.add(snapshotId);
                          }
                        }
                      }
                    } catch (parseError) {
                      console.warn(`Failed to parse snapshot file ${file}:`, parseError);
                    }
                  }
                }
                // Also handle legacy flat structure
                else if (!stat.isDirectory() && entry.endsWith('.json')) {
                  try {
                    const fileContent = fs.readFileSync(entryPath, 'utf-8');
                    const snapshotData = JSON.parse(fileContent);
                    
                    if (spaceRecord) {
                      const endpoints = dbService.getEndpointsBySpaceId(spaceRecord.id);
                      const belongsToSpace = endpoints.some(ep => ep.name === snapshotData.endpoint?.name);
                      
                      if (belongsToSpace) {
                        const snapshotId = entry.replace('.json', '');
                        if (!addedSnapshotIds.has(snapshotId)) {
                          snapshots.push({
                            id: snapshotId,
                            filename: snapshotId,
                            endpoint: snapshotData.endpoint?.name || 'unknown',
                            timestamp: snapshotData.timestamp,
                            status: (snapshotData.response?.status >= 200 && snapshotData.response?.status < 300) ? 'success' : 'error',
                            url: snapshotData.endpoint?.url,
                            method: snapshotData.endpoint?.method,
                            responseStatus: snapshotData.response?.status,
                            error: snapshotData.error,
                            duration: snapshotData.response?.duration
                          });
                          addedSnapshotIds.add(snapshotId);
                        }
                      }
                    }
                  } catch (parseError) {
                    console.warn(`Failed to parse snapshot file ${entry}:`, parseError);
                  }
                }
              }
            }
          }
        } catch (fsError) {
          console.warn('Failed to read snapshot files:', fsError);
        }
      }
      
      // Sort by timestamp (newest first)
      snapshots.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      
      // Close database connection
      dbService.close();
      
      return {
        success: true,
        data: snapshots,
        count: snapshots.length,
        space: targetSpace,
        timestamp: new Date().toISOString()
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
  // GET /api/snapshots/:id - Get specific snapshot with full content
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Get snapshot metadata from database
      const { DatabaseService } = await import('../../database/database-service.js');
      const dbService = new DatabaseService();
      
      try {
        // Check if ID is numeric (database ID) or contains underscore (filename-based)
        const isNumericId = /^\d+$/.test(id);
        let snapshotRecord: any = null;
        
        if (isNumericId) {
          // Query by database ID
          snapshotRecord = dbService.db.prepare(`
            SELECT 
              s.*,
              e.name as endpoint_name,
              e.url as endpoint_url,
              e.method as endpoint_method,
              sp.name as space_name
            FROM snapshots s
            JOIN endpoints e ON s.endpoint_id = e.id
            JOIN spaces sp ON s.space_id = sp.id
            WHERE s.id = ?
          `).get(parseInt(id)) as any;
        } else {
          // Query by filename (for backward compatibility)
          const filename = id.endsWith('.json') ? id : `${id}.json`;
          snapshotRecord = dbService.db.prepare(`
            SELECT 
              s.*,
              e.name as endpoint_name,
              e.url as endpoint_url,
              e.method as endpoint_method,
              sp.name as space_name
            FROM snapshots s
            JOIN endpoints e ON s.endpoint_id = e.id
            JOIN spaces sp ON s.space_id = sp.id
            WHERE s.filename = ?
          `).get(filename) as any;
        }
        
        if (!snapshotRecord) {
          reply.status(404);
          return {
            success: false,
            error: 'Snapshot not found',
            message: `No snapshot found with ID ${id}`
          };
        }
        
        // Read the actual snapshot file
        const fs = await import('fs');
        const path = await import('path');
        
        // Build file path based on space
        const spaceName = snapshotRecord.space_name;
        const filename = snapshotRecord.filename;
        
        // Sanitize space name to match how it's stored
        const sanitizedSpace = spaceName.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        let filePath: string;
        if (sanitizedSpace === 'default' || spaceName === 'default' || spaceName === 'default space') {
          filePath = path.join('./snapshots', filename);
        } else {
          filePath = path.join('./snapshots', sanitizedSpace, filename);
        }
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          // Try alternative paths
          const alternativePaths = [
            path.join('./snapshots', filename),
            path.join('./snapshots', spaceName, filename),
            path.join('./snapshots', sanitizedSpace, filename)
          ];
          
          let found = false;
          for (const altPath of alternativePaths) {
            if (fs.existsSync(altPath)) {
              filePath = altPath;
              found = true;
              break;
            }
          }
          
          if (!found) {
            reply.status(404);
            return {
              success: false,
              error: 'Snapshot file not found',
              message: `File ${filename} not found in any expected location`,
              debug: {
                triedPaths: [filePath, ...alternativePaths]
              }
            };
          }
        }
        
        // Read and parse the snapshot file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const snapshotData = JSON.parse(fileContent);
        
        // Return combined metadata and content
        return {
          success: true,
          data: {
            // Metadata from database
            id: snapshotRecord.id,
            filename: snapshotRecord.filename,
            status: snapshotRecord.status,
            created_at: snapshotRecord.created_at,
            space_name: snapshotRecord.space_name,
            endpoint_name: snapshotRecord.endpoint_name,
            endpoint_url: snapshotRecord.endpoint_url,
            endpoint_method: snapshotRecord.endpoint_method,
            response_status: snapshotRecord.response_status,
            duration: snapshotRecord.duration,
            file_size: snapshotRecord.file_size,
            
            // Full snapshot content from file
            snapshot: snapshotData
          }
        };
        
      } finally {
        dbService.close();
      }
      
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

  // GET /api/snapshots/:id/response - Get just the API response data from a snapshot
  fastify.get<{ Params: { id: string } }>('/:id/response', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Get snapshot metadata from database
      const { DatabaseService } = await import('../../database/database-service.js');
      const dbService = new DatabaseService();
      
      try {
        // Query snapshot with space info
        const snapshotRecord = dbService.db.prepare(`
          SELECT 
            s.*,
            sp.name as space_name
          FROM snapshots s
          JOIN spaces sp ON s.space_id = sp.id
          WHERE s.id = ?
        `).get(parseInt(id)) as any;
        
        if (!snapshotRecord) {
          reply.status(404);
          return {
            success: false,
            error: 'Snapshot not found',
            message: `No snapshot found with ID ${id}`
          };
        }
        
        // Read the actual snapshot file
        const fs = await import('fs');
        const path = await import('path');
        
        // Build file path based on space
        const spaceName = snapshotRecord.space_name;
        const filename = snapshotRecord.filename;
        const sanitizedSpace = spaceName.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        let filePath: string;
        if (sanitizedSpace === 'default' || spaceName === 'default' || spaceName === 'default space') {
          filePath = path.join('./snapshots', filename);
        } else {
          filePath = path.join('./snapshots', sanitizedSpace, filename);
        }
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          // Try alternative paths
          const alternativePaths = [
            path.join('./snapshots', filename),
            path.join('./snapshots', spaceName, filename),
            path.join('./snapshots', sanitizedSpace, filename)
          ];
          
          for (const altPath of alternativePaths) {
            if (fs.existsSync(altPath)) {
              filePath = altPath;
              break;
            }
          }
        }
        
        // Read and parse the snapshot file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const snapshotData = JSON.parse(fileContent);
        
        // Return just the response data
        return {
          success: true,
          data: snapshotData.response?.data || null,
          metadata: {
            id: snapshotRecord.id,
            status: snapshotData.response?.status,
            duration: snapshotData.response?.duration,
            timestamp: snapshotData.timestamp
          }
        };
        
      } finally {
        dbService.close();
      }
      
    } catch (error) {
      (request as any).logger?.error('Failed to get snapshot response:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get snapshot response',
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
  // POST /api/snapshots/capture - Capture new snapshots (default space or with query param)
  fastify.post('/capture', async (request: FastifyRequest & { logger?: any }, reply: FastifyReply) => {
    try {
      const { space } = request.query as { space?: string };
      const { endpoints } = request.body as { endpoints?: string[] };
      const targetSpace = space || 'default';
      
      // Check if the space exists first
      const { DatabaseConfigManager } = await import('../../database/database-config-manager.js');
      const configManager = new DatabaseConfigManager();
      
      if (!configManager.spaceExists(targetSpace)) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${targetSpace}' does not exist. Create it first using POST /api/config/spaces`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get the core application from request context
      const coreApp = (request as any).coreApp;
      if (!coreApp) {
        reply.status(500);
        return {
          success: false,
          error: 'Core application not available',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        };
      }
      
      // Load configuration for the specific space
      const spaceConfig = configManager.loadConfig(undefined, targetSpace);
      
      // Filter endpoints if specific ones are requested
      let endpointsToCapture = spaceConfig.endpoints;
      if (endpoints && endpoints.length > 0) {
        endpointsToCapture = spaceConfig.endpoints.filter(endpoint => 
          endpoints.includes(endpoint.name)
        );
        
        if (endpointsToCapture.length === 0) {
          reply.status(400);
          return {
            success: false,
            error: 'No matching endpoints found',
            message: `None of the requested endpoints [${endpoints.join(', ')}] exist in space '${targetSpace}'`,
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Create a space-aware snapshot service
      const { ServiceKeys } = await import('../../core/container.js');
      const { DefaultSnapshotService } = await import('../../services/snapshot-service.js');
      
      // Get dependencies from container
      const httpClient = await coreApp.getContainer().resolve(ServiceKeys.HTTP_CLIENT);
      const storageProvider = await coreApp.getContainer().resolve(ServiceKeys.STORAGE);
      const authRegistry = await coreApp.getContainer().resolve(ServiceKeys.AUTH_REGISTRY);
      const schemaManager = await coreApp.getContainer().resolve(ServiceKeys.SCHEMA_MANAGER);
      
      // Create space-specific snapshot service
      const snapshotService = new DefaultSnapshotService(
        httpClient,
        storageProvider,
        authRegistry,
        schemaManager,
        endpointsToCapture,
        (request as any).logger || console,
        targetSpace
      );
      
      (request as any).logger?.info(`Starting snapshot capture for space '${targetSpace}' with ${endpointsToCapture.length} endpoint(s):`, endpointsToCapture.map(e => e.name));
      
      // Start capture process asynchronously
      const capturePromise = (async () => {
        const results = [];
        
        for (const endpoint of endpointsToCapture) {
          // Get database info upfront for both success and failure cases
          const { DatabaseService } = await import('../../database/database-service.js');
          const dbService = new DatabaseService();
          const spaceRecord = dbService.getSpaceByName(targetSpace);
          let endpointId: number | undefined;
          
          if (spaceRecord) {
            const endpointRecords = dbService.getEndpointsBySpaceId(spaceRecord.id);
            const endpointRecord = endpointRecords.find(ep => ep.name === endpoint.name);
            endpointId = endpointRecord?.id;
          }
          
          try {
            const result = await snapshotService.captureSnapshot(endpoint);
            
            if (result.success && result.snapshot) {
              // Get the storage provider from the snapshot service
              const storage = storageProvider as any;
              
              // If it's the ImprovedStorageProvider, set the endpoint ID
              if (storage.setEndpointId && endpointId) {
                storage.setEndpointId(endpoint.name, endpointId);
              }
              
              // Save the snapshot
              const filePath = await storage.saveSnapshot(result.snapshot, false);
              console.log(`📁 Snapshot saved to: ${filePath} for space: ${targetSpace}`);
              
              // Record snapshot in database
              try {
                if (spaceRecord && endpointId) {
                  const filename = filePath.split('/').pop() || `run-${Date.now()}.json`;
                  dbService.createSnapshot(
                    spaceRecord.id,
                    endpointId,
                    filename,
                    'success',
                    {
                      response_status: result.snapshot.response?.status,
                      duration: result.snapshot.response?.duration,
                      file_size: JSON.stringify(result.snapshot).length
                    }
                  );
                  console.log(`📊 Snapshot recorded in database for endpoint '${endpoint.name}' (ID: ${endpointId})`);
                }
              } catch (dbError) {
                console.warn(`Failed to record snapshot in database:`, dbError);
              }
              
              results.push({
                endpoint: endpoint.name,
                success: true,
                snapshotId: `${endpoint.name}_${Date.now()}`,
                timestamp: result.snapshot.timestamp
              });
              
              (request as any).logger?.info(`✅ Snapshot captured for endpoint '${endpoint.name}' in space '${targetSpace}'`);
            } else {
              // Record failed snapshot in database
              try {
                if (spaceRecord && endpointId) {
                  const filename = `run-${Date.now()}-failed.json`;
                  dbService.createSnapshot(
                    spaceRecord.id,
                    endpointId,
                    filename,
                    'error',
                    {
                      error: result.error || 'Unknown error'
                    }
                  );
                  console.log(`📊 Failed snapshot recorded in database for endpoint '${endpoint.name}' (ID: ${endpointId})`);
                }
              } catch (dbError) {
                console.warn(`Failed to record failed snapshot in database:`, dbError);
              }
              
              results.push({
                endpoint: endpoint.name,
                success: false,
                error: result.error || 'Unknown error'
              });
              
              (request as any).logger?.warn(`❌ Failed to capture snapshot for endpoint '${endpoint.name}' in space '${targetSpace}': ${result.error}`);
            }
          } catch (error) {
            results.push({
              endpoint: endpoint.name,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            (request as any).logger?.error(`❌ Error capturing snapshot for endpoint '${endpoint.name}' in space '${targetSpace}':`, error);
          } finally {
            // Always close the database connection
            dbService.close();
          }
        }
        
        return results;
      })();
      
      // Emit WebSocket event when capture starts
      if ((fastify as any).io) {
        (fastify as any).io.to('snapshots').emit('capture:started', {
          space: targetSpace,
          endpoints: endpointsToCapture.map(e => e.name),
          timestamp: new Date().toISOString()
        });
        
        // Emit completion event when done
        capturePromise.then((results) => {
          (fastify as any).io.to('snapshots').emit('capture:complete', {
            space: targetSpace,
            results,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            timestamp: new Date().toISOString()
          });
        }).catch((error) => {
          (fastify as any).io.to('snapshots').emit('capture:error', {
            space: targetSpace,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        });
      }
      
      // Return immediate response
      const response = {
        success: true,
        message: `Snapshot capture started for space '${targetSpace}' with ${endpointsToCapture.length} endpoint(s)`,
        jobId: Date.now().toString(),
        space: targetSpace,
        endpoints: endpointsToCapture.map(e => e.name),
        timestamp: new Date().toISOString()
      };
      
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
 * /api/snapshots/capture/{space}:
 *   post:
 *     summary: Capture new snapshots for specific space
 *     tags: [Snapshots]
 *     parameters:
 *       - in: path
 *         name: space
 *         required: true
 *         schema:
 *           type: string
 *         description: Space/environment name
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
 *                     space:
 *                       type: string
 *                       description: Space name
 *                     endpoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Endpoints being captured
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
  // POST /api/snapshots/capture/:space - Capture new snapshots for specific space
  fastify.post<{ Params: { space: string } }>('/capture/:space', async (request, reply) => {
    try {
      const { space } = request.params;
      const { endpoints } = request.body as { endpoints?: string[] };
      
      // Check if the space exists first
      const { DatabaseConfigManager } = await import('../../database/database-config-manager.js');
      const configManager = new DatabaseConfigManager();
      
      if (!configManager.spaceExists(space)) {
        reply.status(404);
        return {
          success: false,
          error: 'Space not found',
          message: `Space '${space}' does not exist. Create it first using POST /api/config/spaces`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get the core application from request context
      const coreApp = (request as any).coreApp;
      if (!coreApp) {
        reply.status(500);
        return {
          success: false,
          error: 'Core application not available',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        };
      }
      
      // Load configuration for the specific space
      const spaceConfig = configManager.loadConfig(undefined, space);
      
      // Filter endpoints if specific ones are requested
      let endpointsToCapture = spaceConfig.endpoints;
      if (endpoints && endpoints.length > 0) {
        endpointsToCapture = spaceConfig.endpoints.filter(endpoint => 
          endpoints.includes(endpoint.name)
        );
        
        if (endpointsToCapture.length === 0) {
          reply.status(400);
          return {
            success: false,
            error: 'No matching endpoints found',
            message: `None of the requested endpoints [${endpoints.join(', ')}] exist in space '${space}'`,
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Create a space-aware snapshot service
      const { ServiceKeys } = await import('../../core/container.js');
      const { DefaultSnapshotService } = await import('../../services/snapshot-service.js');
      
      // Get dependencies from container
      const httpClient = await coreApp.getContainer().resolve(ServiceKeys.HTTP_CLIENT);
      const storageProvider = await coreApp.getContainer().resolve(ServiceKeys.STORAGE);
      const authRegistry = await coreApp.getContainer().resolve(ServiceKeys.AUTH_REGISTRY);
      const schemaManager = await coreApp.getContainer().resolve(ServiceKeys.SCHEMA_MANAGER);
      
      // Create space-specific snapshot service
      const snapshotService = new DefaultSnapshotService(
        httpClient,
        storageProvider,
        authRegistry,
        schemaManager,
        endpointsToCapture,
        (request as any).logger || console,
        space
      );
      
      (request as any).logger?.info(`Starting snapshot capture for space '${space}' with ${endpointsToCapture.length} endpoint(s):`, endpointsToCapture.map(e => e.name));
      
      // Start capture process asynchronously
      const capturePromise = (async () => {
        const results = [];
        
        for (const endpoint of endpointsToCapture) {
          try {
            const result = await snapshotService.captureSnapshot(endpoint);
            
            if (result.success && result.snapshot) {
              // Save the snapshot using space-specific storage provider
              const { FileSystemStorageProvider } = await import('../../services/storage-provider.js');
              
              // Sanitize space name to prevent path traversal
              const sanitizedSpace = space.replace(/[^a-zA-Z0-9_-]/g, '_');
              if (sanitizedSpace !== space) {
                (request as any).logger?.warn(`Space name sanitized from '${space}' to '${sanitizedSpace}'`);
              }
              
              const spaceAwareStorage = new FileSystemStorageProvider(
                sanitizedSpace !== 'default' ? `./snapshots/${sanitizedSpace}` : './snapshots',
                sanitizedSpace !== 'default' ? `./snapshots/${sanitizedSpace}/baseline` : './snapshots/baseline'
              );
              
              const filePath = await spaceAwareStorage.saveSnapshot(result.snapshot, false);
              console.log(`📁 Snapshot saved to: ${filePath} for space: ${space}`);
              
              // Record snapshot in database
              try {
                const { DatabaseService } = await import('../../database/database-service.js');
                const dbService = new DatabaseService();
                const spaceRecord = dbService.getSpaceByName(space);
                
                if (spaceRecord) {
                  const endpointRecords = dbService.getEndpointsBySpaceId(spaceRecord.id);
                  const endpointRecord = endpointRecords.find(ep => ep.name === endpoint.name);
                  
                  if (endpointRecord) {
                    const filename = filePath.split('/').pop() || `${endpoint.name}_${Date.now()}.json`;
                    dbService.createSnapshot(
                      spaceRecord.id,
                      endpointRecord.id,
                      filename,
                      'success',
                      {
                        response_status: result.snapshot.response?.status,
                        duration: result.snapshot.response?.duration,
                        file_size: JSON.stringify(result.snapshot).length
                      }
                    );
                    console.log(`📊 Snapshot recorded in database for endpoint '${endpoint.name}'`);
                  }
                }
                dbService.close();
              } catch (dbError) {
                console.warn(`Failed to record snapshot in database:`, dbError);
              }
              
              results.push({
                endpoint: endpoint.name,
                success: true,
                snapshotId: `${endpoint.name}_${Date.now()}`,
                timestamp: result.snapshot.timestamp
              });
              
              (request as any).logger?.info(`✅ Snapshot captured for endpoint '${endpoint.name}' in space '${space}'`);
            } else {
              // Record failed snapshot in database
              try {
                const { DatabaseService } = await import('../../database/database-service.js');
                const dbService = new DatabaseService();
                const spaceRecord = dbService.getSpaceByName(space);
                
                if (spaceRecord) {
                  const endpointRecords = dbService.getEndpointsBySpaceId(spaceRecord.id);
                  const endpointRecord = endpointRecords.find(ep => ep.name === endpoint.name);
                  
                  if (endpointRecord) {
                    const filename = `${endpoint.name}_${Date.now()}_failed.json`;
                    dbService.createSnapshot(
                      spaceRecord.id,
                      endpointRecord.id,
                      filename,
                      'error',
                      {
                        error: result.error || 'Unknown error'
                      }
                    );
                    console.log(`📊 Failed snapshot recorded in database for endpoint '${endpoint.name}'`);
                  }
                }
                dbService.close();
              } catch (dbError) {
                console.warn(`Failed to record failed snapshot in database:`, dbError);
              }
              
              results.push({
                endpoint: endpoint.name,
                success: false,
                error: result.error || 'Unknown error'
              });
              
              (request as any).logger?.warn(`❌ Failed to capture snapshot for endpoint '${endpoint.name}' in space '${space}': ${result.error}`);
            }
          } catch (error) {
            results.push({
              endpoint: endpoint.name,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            (request as any).logger?.error(`❌ Error capturing snapshot for endpoint '${endpoint.name}' in space '${space}':`, error);
          }
        }
        
        return results;
      })();
      
      // Emit WebSocket event when capture starts
      if ((fastify as any).io) {
        (fastify as any).io.to('snapshots').emit('capture:started', {
          space,
          endpoints: endpointsToCapture.map(e => e.name),
          timestamp: new Date().toISOString()
        });
        
        // Emit completion event when done
        capturePromise.then((results) => {
          (fastify as any).io.to('snapshots').emit('capture:complete', {
            space,
            results,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            timestamp: new Date().toISOString()
          });
        }).catch((error) => {
          (fastify as any).io.to('snapshots').emit('capture:error', {
            space,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        });
      }
      
      // Return immediate response
      const response = {
        success: true,
        message: `Snapshot capture started for space '${space}' with ${endpointsToCapture.length} endpoint(s)`,
        jobId: Date.now().toString(),
        space,
        endpoints: endpointsToCapture.map(e => e.name),
        timestamp: new Date().toISOString()
      };
      
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