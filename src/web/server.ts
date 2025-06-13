import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import fastifySocketIO from 'fastify-socket.io';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

import { Application } from '../core/application.js';
import { DatabaseConfigManager } from '../database/database-config-manager.js';
import { LogLevel, ConsoleLogger } from '../core/logger.js';

// Import API routes
import { configRoutes } from './routes/config-simple.js';
import { snapshotRoutes } from './routes/snapshots-simple.js';
import { pluginRoutes } from './routes/plugins-simple.js';
import { statusRoutes } from './routes/status.js';

// Load environment variables
dotenv.config();

export interface WebServerConfig {
  port: number;
  host: string;
  logLevel: LogLevel;
  corsOrigin?: string | string[];
  enableRateLimit?: boolean;
}

export class WebServer {
  private app: FastifyInstance;
  private coreApp!: Application;
  private logger: ConsoleLogger;

  constructor(private config: WebServerConfig) {
    this.app = Fastify({
      logger: false, // We'll use our custom logger
      bodyLimit: 10 * 1024 * 1024 // 10MB limit
    });
    
    this.logger = new ConsoleLogger({
      level: config.logLevel,
      prefix: 'web-server'
    });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing web server...');

    // Initialize core application
    await this.initializeCoreApplication();

    // Setup middleware
    await this.setupMiddleware();

    // Setup routes
    await this.setupRoutes();

    // Setup WebSocket handlers
    this.setupWebSocketHandlers();

    // Setup error handling
    this.setupErrorHandling();

    this.logger.info('Web server initialized successfully');
  }

  private async initializeCoreApplication(): Promise<void> {
    try {
      // Use database config manager instead of file-based config
      const configManager = new DatabaseConfigManager();
      
      // Create minimal config for the Application - the actual endpoints come from the database
      const config = {
        endpoints: [],
        snapshotDir: process.env.SNAPSHOT_DIR || './snapshots',
        baselineDir: process.env.BASELINE_DIR || './baselines',
        environment: process.env.NODE_ENV || 'development',
        plugins: {
          auth: { providers: [] },
          formatters: { default: 'table' },
          storage: { provider: 'filesystem' },
          diff: { engine: 'json' }
        },
        rules: [
          {
            path: 'response.headers.date',
            ignore: true
          },
          {
            path: 'response.headers.x-request-id',
            ignore: true
          }
        ]
      };
      
      this.coreApp = new Application({
        config,
        logLevel: this.config.logLevel
      });

      await this.coreApp.initialize();
      this.logger.info('Core application initialized with database backend');
    } catch (error) {
      this.logger.error('Failed to initialize core application:', error);
      throw error;
    }
  }

  private async setupMiddleware(): Promise<void> {
    // Security middleware
    await this.app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    });

    // CORS
    await this.app.register(cors, {
      origin: this.config.corsOrigin || true,
      credentials: true
    });

    // Compression
    await this.app.register(compress);

    // Socket.IO
    await this.app.register(fastifySocketIO, {
      cors: {
        origin: this.config.corsOrigin || "*",
        methods: ["GET", "POST"]
      }
    });

    // Request logging hook
    this.app.addHook('onRequest', async (request, reply) => {
      this.logger.info(`${request.method} ${request.url} - ${request.ip}`);
    });

    // Add core application to request context
    this.app.decorateRequest('coreApp', null);
    this.app.decorateRequest('logger', null);
    
    this.app.addHook('preHandler', async (request: any, reply) => {
      request.coreApp = this.coreApp;
      request.logger = this.logger;
    });
  }

  private async setupRoutes(): Promise<void> {
    // Swagger documentation
    await this.app.register(swagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'API Snapshot Verifier API',
          description: 'RESTful API for managing API snapshots and comparisons',
          version: '1.0.0'
        }
      }
    });

    await this.app.register(swaggerUi, {
      routePrefix: '/api-docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject, request, reply) => {
        return swaggerObject;
      },
      transformSpecificationClone: true
    });

    // API routes
    await this.app.register(configRoutes, { prefix: '/api/config' });
    await this.app.register(snapshotRoutes, { prefix: '/api/snapshots' });
    await this.app.register(pluginRoutes, { prefix: '/api/plugins' });
    await this.app.register(statusRoutes, { prefix: '/api/status' });
    
    // Parameter management routes
    const { parameterRoutes } = await import('./routes/parameters.js');
    await this.app.register(parameterRoutes, { prefix: '/api/parameters' });
    
    // Space management routes
    const { spacesRoutes } = await import('./routes/spaces.js');
    await this.app.register(spacesRoutes, { prefix: '/api/spaces' });
    
    // Server management routes - Disabled: Now using localStorage
    // const { serversRoutes } = await import('./routes/servers.js');
    // await this.app.register(serversRoutes, { prefix: '/api/servers' });

    // Health check
    this.app.get('/health', async (request, reply) => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      };
    });

    // API documentation
    this.app.get('/api', async (request, reply) => {
      return {
        name: 'API Snapshot Verifier API',
        version: '1.0.0',
        description: 'RESTful API for managing API snapshots and comparisons',
        documentation: {
          swagger: '/api-docs',
          openapi: '/api-docs/json'
        },
        endpoints: {
          '/api/config': 'Configuration management',
          '/api/snapshots': 'Snapshot operations',
          '/api/plugins': 'Plugin management',
          '/api/status': 'System status and metrics',
          '/health': 'Health check'
        },
        websocket: '/socket.io'
      };
    });

    // 404 handler
    this.app.setNotFoundHandler(async (request, reply) => {
      reply.status(404).send({
        error: 'Not Found',
        message: `Route ${request.url} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupWebSocketHandlers(): void {
    this.logger.info('🔌 Setting up WebSocket handlers...');
    
    (this.app as any).io.on('connection', (socket: any) => {
      this.logger.info(`🔗 WebSocket client connected: ${socket.id}`);

      // Join rooms for real-time updates
      socket.on('join:snapshots', () => {
        socket.join('snapshots');
        this.logger.info(`📡 Client ${socket.id} joined snapshots room`);
      });

      socket.on('join:comparisons', () => {
        socket.join('comparisons');
        this.logger.info(`📡 Client ${socket.id} joined comparisons room`);
      });

      socket.on('disconnect', (reason: string) => {
        this.logger.info(`❌ WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
      });

      socket.on('error', (error: any) => {
        this.logger.error(`🚫 WebSocket error for client ${socket.id}:`, error);
      });
    });

    (this.app as any).io.on('connect_error', (error: any) => {
      this.logger.error('🚫 WebSocket connection error:', error);
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.setErrorHandler(async (error, request, reply) => {
      this.logger.error('Unhandled error:', error);

      const isDevelopment = process.env.NODE_ENV === 'development';

      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: error.stack })
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      this.shutdown().then(() => process.exit(1));
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown().then(() => process.exit(1));
    });
  }

  async start(): Promise<void> {
    try {
      await this.app.listen({
        port: this.config.port,
        host: this.config.host
      });

      this.logger.info(`🚀 Web server started at http://${this.config.host}:${this.config.port}`);
      this.logger.info(`📊 API documentation available at http://${this.config.host}:${this.config.port}/api-docs`);
      this.logger.info(`💾 WebSocket server running on http://${this.config.host}:${this.config.port}/socket.io/`);
      this.logger.info(`🔌 WebSocket endpoint: ws://${this.config.host}:${this.config.port}/socket.io/`);
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down web server...');

    // Close Fastify server (this also closes WebSocket connections)
    await this.app.close();
    this.logger.info('HTTP server closed');

    // Shutdown core application
    if (this.coreApp) {
      await this.coreApp.shutdown();
    }

    this.logger.info('Web server shutdown complete');
  }

  getApp(): FastifyInstance {
    return this.app;
  }

  getIO(): SocketServer {
    return (this.app as any).io;
  }
}