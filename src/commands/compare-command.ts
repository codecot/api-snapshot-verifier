import chalk from 'chalk';
import { BaseCommand } from './base-command.js';
import { CommandOption, CommandContext, OutputFormatter, SnapshotService } from '../core/interfaces.js';
import { ServiceKeys } from '../core/container.js';
import { GenericRegistry } from '../core/registry.js';

export interface CompareOptions {
  config?: string;
  endpoint?: string;
  format: string;
  details?: boolean;
  onlyBreaking?: boolean;
  summary?: boolean;
  saveDiff?: string;
  interactive?: boolean;
  autoApprove?: boolean;
}

export class CompareCommand extends BaseCommand {
  name = 'compare';
  description = 'Compare current API responses with baseline snapshots';
  options: CommandOption[] = [
    { flags: '-c, --config <path>', description: 'Path to configuration file', defaultValue: './api-snapshot.config.json' },
    { flags: '-e, --endpoint <name>', description: 'Compare only specific endpoint' },
    { flags: '--format <type>', description: 'Output format: table, json, markdown', defaultValue: 'table' },
    { flags: '--details', description: 'Show detailed diff with old/new values' },
    { flags: '--only-breaking', description: 'Show only breaking changes' },
    { flags: '--summary', description: 'Show summary only (no detailed differences)' },
    { flags: '--save-diff <path>', description: 'Save detailed diff to JSON file' },
    { flags: '--interactive', description: 'Interactive approval workflow for changes' },
    { flags: '--auto-approve', description: 'Automatically approve non-breaking changes' }
  ];

  async execute(options: CompareOptions, context: CommandContext): Promise<void> {
    try {
      const snapshotService = await this.resolveService<SnapshotService>(context, ServiceKeys.STORAGE);
      const formatterRegistry = await this.resolveService<GenericRegistry<OutputFormatter>>(context, ServiceKeys.FORMATTER_REGISTRY);

      context.logger.info('Starting comparison...');

      // Perform comparison
      const comparisons = options.endpoint
        ? [await snapshotService.compareSnapshots(options.endpoint)]
        : await snapshotService.compareAll();

      // Save diff file if requested
      if (options.saveDiff) {
        const fs = await import('fs-extra');
        const diffData = {
          timestamp: new Date().toISOString(),
          comparisons: comparisons.filter(c => c !== null),
          summary: {
            totalEndpoints: comparisons.length,
            endpointsWithChanges: comparisons.filter(c => c && c.hasChanges).length,
            breakingChanges: comparisons.some(c => c && c.differences.some(d => d.severity === 'breaking'))
          }
        };
        await fs.default.writeJson(options.saveDiff, diffData, { spaces: 2 });
        context.logger.info(`Diff saved to ${options.saveDiff}`);
      }

      // Format and display results
      const formatter = formatterRegistry.get(options.format);
      if (!formatter) {
        throw new Error(`Unknown format: ${options.format}. Available: ${formatterRegistry.list().join(', ')}`);
      }

      const formatOptions = {
        details: options.details,
        onlyBreaking: options.onlyBreaking,
        summary: options.summary
      };

      const output = formatter.format(comparisons.filter(c => c !== null), formatOptions);
      console.log(output);

      // Handle interactive approval workflow
      if (options.interactive) {
        await this.handleInteractiveApproval(comparisons.filter(c => c !== null), options, context);
      }

      // Determine exit code
      const hasBreakingChanges = comparisons.some(c => 
        c && c.differences.some(d => d.severity === 'breaking')
      );

      if (hasBreakingChanges) {
        context.logger.error('Breaking changes detected!');
        process.exit(1);
      } else {
        const hasAnyChanges = comparisons.some(c => c && c.hasChanges);
        if (hasAnyChanges) {
          context.logger.warn('Changes detected, but no breaking changes');
        } else {
          context.logger.info('No changes detected');
        }
      }

    } catch (error) {
      context.logger.error('Comparison failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async handleInteractiveApproval(comparisons: any[], options: CompareOptions, context: CommandContext): Promise<void> {
    const inquirer = (await import('inquirer')).default;
    const fs = await import('fs-extra');
    
    context.logger.info('Starting interactive approval workflow...');
    
    for (const comparison of comparisons) {
      if (!comparison || !comparison.hasChanges) continue;
      
      const breaking = comparison.differences.filter((d: any) => d.severity === 'breaking');
      const nonBreaking = comparison.differences.filter((d: any) => d.severity === 'non-breaking');
      
      console.log(chalk.bold(`\n📋 ${comparison.endpoint}:`));
      console.log(`   Breaking: ${breaking.length}, Non-breaking: ${nonBreaking.length}`);
      
      // Auto-approve non-breaking if requested
      if (breaking.length === 0 && options.autoApprove) {
        console.log(chalk.green('   ✅ Auto-approved (no breaking changes)'));
        continue;
      }
      
      const actions = ['approve', 'reject', 'skip'];
      if (breaking.length === 0) actions.push('approve-and-update-baseline');
      
      const answer = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: `Action for ${comparison.endpoint}:`,
        choices: [
          { name: '✅ Approve changes', value: 'approve' },
          { name: '❌ Reject changes', value: 'reject' },
          { name: '⏭️  Skip (decide later)', value: 'skip' },
          ...(breaking.length === 0 ? [{ name: '📌 Approve and update baseline', value: 'approve-and-update-baseline' }] : [])
        ]
      }]);
      
      if (answer.action === 'approve' || answer.action === 'approve-and-update-baseline') {
        console.log(chalk.green(`   ✅ Approved by user`));
        
        if (answer.action === 'approve-and-update-baseline') {
          console.log(chalk.blue(`   📌 Updating baseline...`));
          // Note: This would need integration with the snapshot service
        }
      } else if (answer.action === 'reject') {
        console.log(chalk.red(`   ❌ Rejected by user`));
      } else {
        console.log(chalk.yellow(`   ⏭️  Skipped`));
      }
    }
  }
}