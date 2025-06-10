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
      
      if (await fs.default.pathExists(configPath) && !options.force) {
        console.log(chalk.yellow('⚠️  Configuration already exists. Use --force to overwrite.'));
        return;
      }
      
      await fs.default.writeJson(configPath, defaultConfig, { spaces: 2 });
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
  .command('add')
  .description('Add a new endpoint to the configuration')
  .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
  .option('-n, --name <name>', 'Endpoint name')
  .option('-u, --url <url>', 'Endpoint URL')
  .option('-m, --method <method>', 'HTTP method', 'GET')
  .option('--auth-token', 'Add Authorization Bearer token from environment')
  .option('--api-key <header>', 'Add custom API key header (e.g., "X-API-Key")')
  .option('--content-type <type>', 'Set Content-Type header', 'application/json')
  .option('--body <json>', 'JSON body for POST/PUT/PATCH requests')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '5000')
  .action(async (options) => {
    try {
      const fs = await import('fs-extra');
      const inquirer = (await import('inquirer')).default;
      
      if (!await fs.default.pathExists(options.config)) {
        console.log(chalk.red('❌ Configuration file not found. Run "api-snapshot init" first.'));
        process.exit(1);
      }
      
      const config = await fs.default.readJson(options.config);
      
      // Interactive prompts if options not provided
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Endpoint name:',
          when: !options.name,
          validate: (input) => {
            if (!input.trim()) return 'Name is required';
            if (config.endpoints.some((e: any) => e.name === input.trim())) {
              return 'Endpoint name already exists';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'url',
          message: 'Endpoint URL:',
          when: !options.url,
          validate: (input) => {
            if (!input.trim()) return 'URL is required';
            try {
              new URL(input.trim());
              return true;
            } catch {
              return 'Please enter a valid URL';
            }
          }
        },
        {
          type: 'list', 
          name: 'method',
          message: 'HTTP method:',
          choices: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          default: 'GET',
          when: !options.method
        },
        {
          type: 'confirm',
          name: 'needsAuth',
          message: 'Does this endpoint require authentication?',
          default: false,
          when: !options.authToken && !options.apiKey
        },
        {
          type: 'list',
          name: 'authType',
          message: 'Authentication type:',
          choices: [
            { name: 'Bearer Token (Authorization: Bearer ${API_TOKEN})', value: 'bearer' },
            { name: 'API Key Header', value: 'apikey' }
          ],
          when: (answers) => answers.needsAuth && !options.authToken && !options.apiKey
        },
        {
          type: 'input',
          name: 'apiKeyHeader',
          message: 'API Key header name (e.g., X-API-Key):',
          when: (answers) => answers.authType === 'apikey' && !options.apiKey,
          validate: (input) => input.trim() ? true : 'Header name is required'
        },
        {
          type: 'input',
          name: 'body', 
          message: 'Request body (JSON):',
          when: (answers) => {
            const method = options.method || answers.method;
            return ['POST', 'PUT', 'PATCH'].includes(method) && !options.body;
          },
          validate: (input) => {
            if (!input.trim()) return true; // Optional
            try {
              JSON.parse(input.trim());
              return true;
            } catch {
              return 'Please enter valid JSON or leave empty';
            }
          }
        },
        {
          type: 'input',
          name: 'timeout',
          message: 'Request timeout (ms):',
          default: '5000',
          when: !options.timeout,
          validate: (input) => {
            const num = parseInt(input);
            return !isNaN(num) && num > 0 ? true : 'Please enter a positive number';
          }
        }
      ]);
      
      // Build endpoint configuration
      const endpoint: any = {
        name: options.name || answers.name,
        url: options.url || answers.url,
        method: options.method || answers.method
      };
      
      // Add headers if needed
      const headers: Record<string, string> = {};
      
      // Handle authentication
      if (options.authToken || answers.authType === 'bearer') {
        headers['Authorization'] = 'Bearer ${API_TOKEN}';
      }
      
      if (options.apiKey || answers.authType === 'apikey') {
        const headerName = options.apiKey || answers.apiKeyHeader;
        headers[headerName] = '${API_KEY}';
      }
      
      // Handle content type for POST/PUT/PATCH
      const method = endpoint.method;
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        headers['Content-Type'] = options.contentType;
        if (!headers['Accept']) {
          headers['Accept'] = 'application/json';
        }
      }
      
      // Add headers to endpoint if any exist
      if (Object.keys(headers).length > 0) {
        endpoint.headers = headers;
      }
      
      // Add body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const bodyStr = options.body || answers.body;
        if (bodyStr && bodyStr.trim()) {
          try {
            endpoint.body = JSON.parse(bodyStr.trim());
          } catch (error) {
            console.log(chalk.red('❌ Invalid JSON body provided'));
            process.exit(1);
          }
        }
      }
      
      // Add timeout if specified
      const timeout = parseInt(options.timeout || answers.timeout || '5000');
      if (timeout !== 5000) {
        endpoint.timeout = timeout;
      }
      
      // Validate if provided via options
      if (options.name && config.endpoints.some((e: any) => e.name === options.name)) {
        console.log(chalk.red('❌ Endpoint name already exists'));
        process.exit(1);
      }
      
      if (options.url) {
        try {
          new URL(options.url);
        } catch {
          console.log(chalk.red('❌ Invalid URL provided'));
          process.exit(1);
        }
      }
      
      config.endpoints.push(endpoint);
      await fs.default.writeJson(options.config, config, { spaces: 2 });
      
      console.log(chalk.green(`✅ Added endpoint "${endpoint.name}"`));
      console.log(chalk.blue(`   ${endpoint.method} ${endpoint.url}`));
      
      if (endpoint.headers) {
        console.log(chalk.gray('   Headers:'));
        Object.entries(endpoint.headers).forEach(([key, value]) => {
          console.log(chalk.gray(`     ${key}: ${value}`));
        });
      }
      
      if (endpoint.body) {
        console.log(chalk.gray('   Body: JSON object'));
      }
      
      if (endpoint.timeout && endpoint.timeout !== 5000) {
        console.log(chalk.gray(`   Timeout: ${endpoint.timeout}ms`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to add endpoint:'), error instanceof Error ? error.message : error);
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