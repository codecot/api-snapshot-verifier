#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { Application } from './core/application.js';
import { ConfigManager } from './config.js';
import { LogLevel } from './core/logger.js';

async function loadConfig(configPath: string) {
  try {
    const configManager = new ConfigManager();
    return await configManager.loadConfig(configPath);
  } catch (error) {
    console.error(chalk.red('❌ Failed to load configuration:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function createApplication(configPath: string, logLevel = LogLevel.INFO) {
  const config = await loadConfig(configPath);
  return new Application({ config, logLevel });
}

const program = new Command();

program
  .name('api-snapshot')
  .description('🧪 API Snapshot Verifier – Track & Diff Real-Time API Changes with Schema Validation')
  .version('2.0.0')
  .option('--verbose', 'Enable verbose logging')
  .option('--debug', 'Enable debug logging');

program
  .command('init')
  .description('Initialize a new API snapshot configuration')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.opts();
    const logLevel = globalOpts.debug ? LogLevel.DEBUG : globalOpts.verbose ? LogLevel.INFO : LogLevel.WARN;
    
    try {
      // For init command, we create a minimal config since the file doesn't exist yet
      const minimalConfig = {
        endpoints: [],
        snapshotDir: 'snapshots',
        baselineDir: 'baselines',
        environment: 'development'
      };
      
      const app = new Application({ config: minimalConfig, logLevel });
      await app.executeCommand('init', options);
    } catch (error) {
      console.error(chalk.red('❌ Command failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('capture')
  .description('Capture snapshots of configured API endpoints')
  .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
  .option('-e, --endpoint <name>', 'Capture only specific endpoint')
  .option('-b, --baseline', 'Save as baseline snapshot')
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.opts();
    const logLevel = globalOpts.debug ? LogLevel.DEBUG : globalOpts.verbose ? LogLevel.INFO : LogLevel.WARN;
    
    try {
      const app = await createApplication(options.config, logLevel);
      await app.executeCommand('capture', options);
    } catch (error) {
      console.error(chalk.red('❌ Command failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('compare')
  .description('Compare current API responses with baseline snapshots')
  .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
  .option('-e, --endpoint <name>', 'Compare only specific endpoint')
  .option('--format <type>', 'Output format: table, json, markdown', 'table')
  .option('--details', 'Show detailed diff with old/new values')
  .option('--only-breaking', 'Show only breaking changes')
  .option('--summary', 'Show summary only (no detailed differences)')
  .option('--save-diff <path>', 'Save detailed diff to JSON file')
  .option('--interactive', 'Interactive approval workflow for changes')
  .option('--auto-approve', 'Automatically approve non-breaking changes')
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.opts();
    const logLevel = globalOpts.debug ? LogLevel.DEBUG : globalOpts.verbose ? LogLevel.INFO : LogLevel.WARN;
    
    try {
      const app = await createApplication(options.config, logLevel);
      await app.executeCommand('compare', options);
    } catch (error) {
      console.error(chalk.red('❌ Command failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Plugin management commands
program
  .command('plugin')
  .description('Manage plugins')
  .addCommand(
    new Command('list')
      .description('List installed plugins')
      .action(async () => {
        console.log(chalk.blue('📦 Plugin management coming soon...'));
      })
  )
  .addCommand(
    new Command('install')
      .description('Install a plugin')
      .argument('<plugin>', 'Plugin name or path')
      .action(async (plugin) => {
        console.log(chalk.blue(`📦 Installing plugin: ${plugin} (coming soon...)`));
      })
  );

// Registry management commands
program
  .command('registry')
  .description('Manage component registries')
  .addCommand(
    new Command('list')
      .description('List available components')
      .option('--type <type>', 'Component type: auth, formatter, storage, diff')
      .action(async (options) => {
        console.log(chalk.blue('🔧 Registry management coming soon...'));
      })
  );

// Development and debug commands
program
  .command('debug')
  .description('Debug and development utilities')
  .addCommand(
    new Command('config')
      .description('Validate and debug configuration')
      .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
      .action(async (options) => {
        try {
          const config = await loadConfig(options.config);
          console.log(chalk.green('✅ Configuration is valid'));
          console.log(chalk.blue('📋 Configuration summary:'));
          console.log(`   Endpoints: ${config.endpoints.length}`);
          console.log(`   Snapshot directory: ${config.snapshotDir}`);
          console.log(`   Baseline directory: ${config.baselineDir || 'Not configured'}`);
          console.log(`   Environment: ${config.environment || 'Not specified'}`);
        } catch (error) {
          console.error(chalk.red('❌ Configuration validation failed:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('container')
      .description('Debug dependency injection container')
      .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
      .action(async (options) => {
        try {
          const app = await createApplication(options.config, LogLevel.DEBUG);
          const container = app.getContainer();
          console.log(chalk.green('✅ Container initialized successfully'));
          console.log(chalk.blue('🔧 Container contents:'));
          // Note: This would need implementation to actually list services
          console.log('   Services registered and ready for use');
        } catch (error) {
          console.error(chalk.red('❌ Container debug failed:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  );

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Parse command line arguments
program.parse();