import chalk from 'chalk';
import { BaseCommand } from './base-command.js';
import { CommandOption, CommandContext, SnapshotService } from '../core/interfaces.js';
import { ServiceKeys } from '../core/container.js';

export interface CaptureOptions {
  config?: string;
  endpoint?: string;
  baseline?: boolean;
}

export class CaptureCommand extends BaseCommand {
  name = 'capture';
  description = 'Capture snapshots of configured API endpoints';
  options: CommandOption[] = [
    { flags: '-c, --config <path>', description: 'Path to configuration file', defaultValue: './api-snapshot.config.json' },
    { flags: '-e, --endpoint <name>', description: 'Capture only specific endpoint' },
    { flags: '-b, --baseline', description: 'Save as baseline snapshot' }
  ];

  async execute(options: CaptureOptions, context: CommandContext): Promise<void> {
    try {
      const snapshotService = await this.resolveService<SnapshotService>(context, ServiceKeys.SNAPSHOT_SERVICE);

      context.logger.info('Starting snapshot capture...');

      // If specific endpoint is requested, find it from config
      let results;
      if (options.endpoint) {
        if (!context.config) {
          console.log(chalk.red(`❌ Configuration not available in context`));
          process.exit(1);
        }
        
        const endpoint = context.config.endpoints.find(e => e.name === options.endpoint);
        
        if (!endpoint) {
          console.log(chalk.red(`❌ Endpoint '${options.endpoint}' not found in configuration`));
          process.exit(1);
        }
        
        results = [await snapshotService.captureSnapshot(endpoint)];
      } else {
        results = await snapshotService.captureAll(options.baseline);
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      
      console.log(chalk.green(`📸 Captured ${successful} snapshot(s)`));
      if (failed > 0) {
        console.log(chalk.red(`❌ ${failed} failed`));
      }
      
      if (options.baseline) {
        console.log(chalk.blue('📌 Saved as baseline'));
      }

      if (failed > 0) {
        process.exit(1);
      }
      
    } catch (error) {
      context.logger.error('Capture failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}