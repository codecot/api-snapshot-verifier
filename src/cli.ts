#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { SnapshotAgent } from './snapshot-agent.js';
import { ConfigManager } from './config.js';

const program = new Command();

program
  .name('api-snapshot')
  .description('🧪 API Snapshot Verifier – Track & Diff Real-Time API Changes')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new API snapshot configuration')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      const defaultConfig = configManager.createDefaultConfig();
      
      const fs = await import('fs-extra');
      const configPath = './api-snapshot.config.json';
      
      if (await fs.pathExists(configPath) && !options.force) {
        console.log(chalk.yellow('⚠️  Configuration already exists. Use --force to overwrite.'));
        return;
      }
      
      await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
      console.log(chalk.green('✅ Created api-snapshot.config.json'));
      console.log(chalk.blue('📝 Edit the configuration file to add your API endpoints.'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('capture')
  .description('Capture snapshots of configured API endpoints')
  .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
  .option('-e, --endpoint <name>', 'Capture only specific endpoint')
  .option('-b, --baseline', 'Save as baseline snapshot')
  .action(async (options) => {
    try {
      const agent = new SnapshotAgent(options.config);
      await agent.initialize();
      
      const results = options.endpoint 
        ? await agent.captureEndpoint(options.endpoint, options.baseline)
        : await agent.captureAll(options.baseline);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      
      console.log(chalk.green(`📸 Captured ${successful} snapshot(s)`));
      if (failed > 0) {
        console.log(chalk.red(`❌ ${failed} failed`));
      }
      
      if (options.baseline) {
        console.log(chalk.blue('📌 Saved as baseline'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Capture failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('compare')
  .description('Compare current API responses with baseline snapshots')
  .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
  .option('-e, --endpoint <name>', 'Compare only specific endpoint')
  .option('--format <type>', 'Output format: table, json, text', 'table')
  .action(async (options) => {
    try {
      const agent = new SnapshotAgent(options.config);
      await agent.initialize();
      
      const comparisons = options.endpoint
        ? [await agent.compareEndpoint(options.endpoint)]
        : await agent.compareAll();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(comparisons, null, 2));
        return;
      }
      
      let hasBreakingChanges = false;
      
      for (const comparison of comparisons) {
        if (!comparison) continue;
        
        console.log(chalk.bold(`\n🔍 ${comparison.endpoint}`));
        
        if (!comparison.hasChanges) {
          console.log(chalk.green('  ✅ No changes detected'));
          continue;
        }
        
        const breaking = comparison.differences.filter(d => d.severity === 'breaking');
        const nonBreaking = comparison.differences.filter(d => d.severity === 'non-breaking');
        const informational = comparison.differences.filter(d => d.severity === 'informational');
        
        if (breaking.length > 0) {
          hasBreakingChanges = true;
          console.log(chalk.red(`  🚨 ${breaking.length} breaking change(s)`));
          breaking.forEach(diff => {
            console.log(chalk.red(`    • ${diff.path}: ${diff.type}`));
          });
        }
        
        if (nonBreaking.length > 0) {
          console.log(chalk.yellow(`  ⚠️  ${nonBreaking.length} non-breaking change(s)`));
        }
        
        if (informational.length > 0) {
          console.log(chalk.blue(`  ℹ️  ${informational.length} informational change(s)`));
        }
      }
      
      if (hasBreakingChanges) {
        console.log(chalk.red('\n🚨 Breaking changes detected!'));
        process.exit(1);
      } else {
        console.log(chalk.green('\n✅ No breaking changes detected'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Comparison failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List stored snapshots')
  .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
  .option('-e, --endpoint <name>', 'List snapshots for specific endpoint')
  .action(async (options) => {
    try {
      const agent = new SnapshotAgent(options.config);
      await agent.initialize();
      
      const snapshots = await agent.listSnapshots(options.endpoint);
      
      if (snapshots.length === 0) {
        console.log(chalk.yellow('📁 No snapshots found'));
        return;
      }
      
      console.log(chalk.bold(`📁 Found ${snapshots.length} snapshot(s):`));
      snapshots.forEach(snapshot => {
        console.log(`  ${snapshot}`);
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to list snapshots:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Clean up old snapshots')
  .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
  .option('-e, --endpoint <name>', 'Clean snapshots for specific endpoint')
  .option('-k, --keep <count>', 'Number of snapshots to keep per endpoint', '10')
  .action(async (options) => {
    try {
      const agent = new SnapshotAgent(options.config);
      await agent.initialize();
      
      const keepCount = parseInt(options.keep);
      const cleaned = await agent.cleanupSnapshots(options.endpoint, keepCount);
      
      console.log(chalk.green(`🧹 Cleaned up ${cleaned} old snapshot(s)`));
      
    } catch (error) {
      console.error(chalk.red('❌ Cleanup failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();