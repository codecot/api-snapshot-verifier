#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { Application } from './core/application.js';
import { DatabaseConfigManager } from './database/database-config-manager.js';
import { LogLevel } from './core/logger.js';

async function loadConfig(configPath?: string, space?: string) {
  try {
    const configManager = new DatabaseConfigManager();
    return configManager.loadConfig(configPath, space);
  } catch (error) {
    console.error(chalk.red('❌ Failed to load configuration:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function createApplication(configPath?: string, space?: string, logLevel = LogLevel.INFO) {
  const config = await loadConfig(configPath, space);
  return new Application({ config, logLevel });
}

const program = new Command();

program
  .name('api-snapshot')
  .description('🧪 API Snapshot Verifier – Track & Diff Real-Time API Changes with Schema Validation')
  .version('2.0.0')
  .option('--verbose', 'Enable verbose logging')
  .option('--debug', 'Enable debug logging')
  .option('-s, --space <name>', 'Configuration space/environment to use (e.g., development, staging, production)');

program
  .command('init')
  .description('Initialize a new API snapshot configuration')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('-c, --config <path>', 'Path to configuration file (overrides space-based path)')
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.opts();
    const logLevel = globalOpts.debug ? LogLevel.DEBUG : globalOpts.verbose ? LogLevel.INFO : LogLevel.WARN;
    const space = globalOpts.space;
    
    try {
      // For init command, we create a minimal config since the file doesn't exist yet
      const minimalConfig = {
        endpoints: [],
        snapshotDir: 'snapshots',
        baselineDir: 'baselines',
        environment: space || 'development'
      };
      
      const app = new Application({ config: minimalConfig, logLevel });
      
      // Pass space information to the init command
      const initOptions = {
        ...options,
        space,
        configPath: options.config
      };
      
      await app.executeCommand('init', initOptions);
      
      if (space) {
        console.log(chalk.green(`✅ Configuration initialized for space: ${chalk.bold(space)}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Command failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('capture')
  .description('Capture snapshots of configured API endpoints')
  .option('-c, --config <path>', 'Path to configuration file (overrides space-based path)')
  .option('-e, --endpoint <name>', 'Capture only specific endpoint')
  .option('-b, --baseline', 'Save as baseline snapshot')
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.opts();
    const logLevel = globalOpts.debug ? LogLevel.DEBUG : globalOpts.verbose ? LogLevel.INFO : LogLevel.WARN;
    const space = globalOpts.space;
    
    try {
      const app = await createApplication(options.config, space, logLevel);
      
      if (space) {
        console.log(chalk.blue(`📋 Using configuration space: ${chalk.bold(space)}`));
      }
      
      await app.executeCommand('capture', options);
    } catch (error) {
      console.error(chalk.red('❌ Command failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('compare')
  .description('Compare current API responses with baseline snapshots')
  .option('-c, --config <path>', 'Path to configuration file (overrides space-based path)')
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
    const space = globalOpts.space;
    
    try {
      const app = await createApplication(options.config, space, logLevel);
      
      if (space) {
        console.log(chalk.blue(`📋 Using configuration space: ${chalk.bold(space)}`));
      }
      
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

// Space management commands
program
  .command('space')
  .description('Manage configuration spaces')
  .addCommand(
    new Command('list')
      .description('List available configuration spaces')
      .action(async () => {
        try {
          const configManager = new DatabaseConfigManager();
          const spaces = configManager.listSpaces();
          
          if (spaces.length === 0) {
            console.log(chalk.yellow('📁 No configuration spaces found'));
            console.log(chalk.blue('   Use "api-snapshot space create <name>" to create your first space'));
          } else {
            console.log(chalk.green('📁 Available configuration spaces:'));
            spaces.forEach(space => {
              console.log(`   • ${chalk.bold(space)}`);
            });
          }
        } catch (error) {
          console.error(chalk.red('❌ Failed to list spaces:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('create')
      .description('Create a new configuration space')
      .argument('<name>', 'Space name')
      .option('--copy-from <space>', 'Copy configuration from existing space')
      .option('--template <template>', 'Use predefined template (use "list-templates" to see available)')
      .option('--empty', 'Create empty space without example endpoints')
      .action(async (spaceName, options) => {
        try {
          const configManager = new DatabaseConfigManager();
          
          let config;
          let createOptions: any = { source: 'cli' };
          
          if (options.copyFrom) {
            // Load config from existing space
            config = configManager.loadConfig(undefined, options.copyFrom);
            createOptions.config = config;
            console.log(chalk.blue(`📋 Copying configuration from space: ${chalk.bold(options.copyFrom)}`));
          } else if (options.template) {
            // Use template
            createOptions.template = options.template;
            console.log(chalk.blue(`📋 Using template: ${chalk.bold(options.template)}`));
          } else if (options.empty) {
            // Create empty space
            createOptions.includeExample = false;
            console.log(chalk.blue('📋 Creating empty configuration space'));
          } else {
            // Default: include example for CLI users
            createOptions.includeExample = true;
            console.log(chalk.blue('📋 Creating space with example endpoint (use --empty for no examples)'));
          }
          
          configManager.createSpace(spaceName, createOptions);
          console.log(chalk.green(`✅ Created configuration space: ${chalk.bold(spaceName)}`));
        } catch (error) {
          console.error(chalk.red('❌ Failed to create space:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('templates')
      .description('List available configuration templates')
      .action(async () => {
        try {
          // Templates feature not yet implemented in database version
          console.log(chalk.yellow('⚠️  Templates feature is not yet implemented in the database version'));
          console.log(chalk.blue('You can create a space and manually add endpoints using the web UI or API'));
        } catch (error) {
          console.error(chalk.red('❌ Failed to list templates:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('delete')
      .description('Delete a configuration space')
      .argument('<name>', 'Space name')
      .option('-f, --force', 'Force deletion without confirmation')
      .action(async (spaceName, options) => {
        try {
          if (spaceName === 'default') {
            console.error(chalk.red('❌ Cannot delete the default space'));
            process.exit(1);
          }
          
          const configManager = new DatabaseConfigManager();
          
          if (!options.force) {
            // In a real implementation, you'd want to add a confirmation prompt here
            console.log(chalk.yellow(`⚠️  This will permanently delete space: ${chalk.bold(spaceName)}`));
            console.log(chalk.yellow('   Use --force to confirm deletion'));
            process.exit(1);
          }
          
          configManager.deleteSpace(spaceName);
          console.log(chalk.green(`✅ Deleted configuration space: ${chalk.bold(spaceName)}`));
        } catch (error) {
          console.error(chalk.red('❌ Failed to delete space:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
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
      .option('-c, --config <path>', 'Path to configuration file (overrides space-based path)')
      .action(async (options, cmd) => {
        try {
          const globalOpts = cmd.parent.parent.opts();
          const space = globalOpts.space;
          
          const config = await loadConfig(options.config, space);
          console.log(chalk.green('✅ Configuration is valid'));
          console.log(chalk.blue('📋 Configuration summary:'));
          console.log(`   Endpoints: ${config.endpoints.length}`);
          console.log(`   Snapshot directory: ${config.snapshotDir}`);
          console.log(`   Baseline directory: ${config.baselineDir || 'Not configured'}`);
          console.log(`   Environment: ${config.environment || 'Not specified'}`);
          if (space) {
            console.log(`   Space: ${chalk.bold(space)}`);
          }
        } catch (error) {
          console.error(chalk.red('❌ Configuration validation failed:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('container')
      .description('Debug dependency injection container')
      .option('-c, --config <path>', 'Path to configuration file (overrides space-based path)')
      .action(async (options, cmd) => {
        try {
          const globalOpts = cmd.parent.parent.opts();
          const space = globalOpts.space;
          
          const app = await createApplication(options.config, space, LogLevel.DEBUG);
          const container = app.getContainer();
          console.log(chalk.green('✅ Container initialized successfully'));
          console.log(chalk.blue('🔧 Container contents:'));
          // Note: This would need implementation to actually list services
          console.log('   Services registered and ready for use');
          if (space) {
            console.log(`   Using space: ${chalk.bold(space)}`);
          }
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