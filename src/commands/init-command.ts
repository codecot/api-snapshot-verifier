import chalk from 'chalk';
import { BaseCommand } from './base-command.js';
import { CommandOption, CommandContext } from '../core/interfaces.js';

export interface InitOptions {
  force?: boolean;
}

export class InitCommand extends BaseCommand {
  name = 'init';
  description = 'Initialize a new API snapshot configuration';
  options: CommandOption[] = [
    { flags: '-f, --force', description: 'Overwrite existing configuration' }
  ];

  async execute(options: InitOptions, context: CommandContext): Promise<void> {
    try {
      const fs = await import('fs-extra');
      const configPath = './api-snapshot.config.json';
      
      if (await fs.default.pathExists(configPath) && !options.force) {
        console.log(chalk.yellow('⚠️  Configuration already exists. Use --force to overwrite.'));
        return;
      }
      
      const defaultConfig = this.createDefaultConfig();
      await fs.default.writeJson(configPath, defaultConfig, { spaces: 2 });
      
      console.log(chalk.green('✅ Created api-snapshot.config.json'));
      console.log(chalk.blue('📝 Edit the configuration file to add your API endpoints.'));
      
    } catch (error) {
      context.logger.error('Failed to initialize:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private createDefaultConfig() {
    return {
      endpoints: [
        {
          name: 'example-api',
          url: 'https://api.example.com/health',
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      ],
      snapshotDir: 'snapshots',
      baselineDir: 'baselines',
      environment: 'development',
      plugins: {
        auth: {
          providers: []
        },
        formatters: {
          default: 'table'
        },
        storage: {
          provider: 'filesystem'
        },
        diff: {
          engine: 'json'
        }
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
  }
}