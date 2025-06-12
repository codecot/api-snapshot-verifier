#!/usr/bin/env node

import { WebServer, WebServerConfig } from './server.js';
import { LogLevel } from '../core/logger.js';

const config: WebServerConfig = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || 'localhost',
  configPath: process.env.CONFIG_PATH || './api-snapshot.config.json',
  logLevel: LogLevel.INFO,
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:3300'],
  enableRateLimit: process.env.ENABLE_RATE_LIMIT === 'true'
};

async function startServer() {
  const server = new WebServer(config);
  
  try {
    console.log('🚀 Starting API Snapshot Verifier Web Server...');
    console.log(`🌐 Server: ${config.host}:${config.port}`);
    console.log(`📁 Config path: ${config.configPath}`);
    console.log(`🌐 CORS origins: ${Array.isArray(config.corsOrigin) ? config.corsOrigin.join(', ') : config.corsOrigin}`);
    
    await server.initialize();
    await server.start();
    
    console.log('\n✅ Server started successfully!');
    console.log(`📊 API: http://${config.host}:${config.port}/api`);
    console.log(`📚 Swagger UI: http://${config.host}:${config.port}/api-docs`);
    console.log(`❤️  Health: http://${config.host}:${config.port}/health`);
    console.log(`\n💡 To start frontend on port 3300:`);
    console.log(`   VITE_BACKEND_URL=http://${config.host}:${config.port} VITE_FRONTEND_PORT=3300 npm run dev:frontend`);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    try {
      await server.shutdown();
      console.log('✅ Server shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    try {
      await server.shutdown();
      console.log('✅ Server shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
}

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();