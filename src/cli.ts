#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { SnapshotAgent } from './snapshot-agent.js';
import { ConfigManager } from './config.js';
import { SchemaManager } from './schema-manager.js';

// Change logging function
async function logChange(comparison: any, status: 'approved' | 'rejected' | 'pending', reason: string, fs: any) {
  const changeLogPath = './api-snapshot-changes.log.json';
  
  const changeEntry = {
    timestamp: new Date().toISOString(),
    endpoint: comparison.endpoint,
    status,
    reason,
    changesCount: comparison.differences.length,
    breakingChanges: comparison.differences.filter((d: any) => d.severity === 'breaking').length,
    nonBreakingChanges: comparison.differences.filter((d: any) => d.severity === 'non-breaking').length,
    differences: comparison.differences.map((d: any) => ({
      path: d.path,
      type: d.type,
      severity: d.severity
    }))
  };
  
  let changeLog = [];
  try {
    if (await fs.default.pathExists(changeLogPath)) {
      changeLog = await fs.default.readJson(changeLogPath);
    }
  } catch (error) {
    // Start with empty log if file doesn't exist or is corrupted
  }
  
  changeLog.push(changeEntry);
  await fs.default.writeJson(changeLogPath, changeLog, { spaces: 2 });
}

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
  .option('--details', 'Show detailed diff with old/new values')
  .option('--save-diff <path>', 'Save detailed diff to .diff.json file')
  .option('--only-breaking', 'Show only breaking changes')
  .option('--summary', 'Show summary only (no detailed differences)')
  .option('--interactive', 'Interactive approval workflow for changes')
  .option('--auto-approve', 'Automatically approve non-breaking changes')
  .action(async (options) => {
    try {
      const agent = new SnapshotAgent(options.config);
      await agent.initialize();
      
      const comparisons = options.endpoint
        ? [await agent.compareEndpoint(options.endpoint)]
        : await agent.compareAll();
      
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
        console.log(chalk.blue(`💾 Diff saved to ${options.saveDiff}`));
      }
      
      if (options.format === 'json') {
        console.log(JSON.stringify(comparisons, null, 2));
        return;
      }
      
      let hasBreakingChanges = false;
      let hasAnyChanges = false;
      
      for (const comparison of comparisons) {
        if (!comparison) continue;
        
        if (!comparison.hasChanges && options.summary) continue;
        
        console.log(chalk.bold(`\n🔍 ${comparison.endpoint}`));
        
        if (!comparison.hasChanges) {
          console.log(chalk.green('  ✅ No changes detected'));
          continue;
        }
        
        hasAnyChanges = true;
        
        const breaking = comparison.differences.filter(d => d.severity === 'breaking');
        const nonBreaking = comparison.differences.filter(d => d.severity === 'non-breaking');
        const informational = comparison.differences.filter(d => d.severity === 'informational');
        
        if (breaking.length > 0) {
          hasBreakingChanges = true;
          console.log(chalk.red(`  🚨 ${breaking.length} breaking change(s)`));
          if (!options.summary) {
            breaking.forEach(diff => {
              console.log(chalk.red(`    • ${diff.path}: ${diff.type}`));
              if (options.details && diff.oldValue !== undefined && diff.newValue !== undefined) {
                console.log(chalk.red(`      - Old: ${JSON.stringify(diff.oldValue)}`));
                console.log(chalk.red(`      + New: ${JSON.stringify(diff.newValue)}`));
              }
            });
          }
        }
        
        if (!options.onlyBreaking) {
          if (nonBreaking.length > 0) {
            console.log(chalk.yellow(`  ⚠️  ${nonBreaking.length} non-breaking change(s)`));
            if (!options.summary && options.details) {
              nonBreaking.forEach(diff => {
                console.log(chalk.yellow(`    • ${diff.path}: ${diff.type}`));
                if (diff.oldValue !== undefined && diff.newValue !== undefined) {
                  console.log(chalk.yellow(`      - Old: ${JSON.stringify(diff.oldValue)}`));
                  console.log(chalk.yellow(`      + New: ${JSON.stringify(diff.newValue)}`));
                }
              });
            }
          }
          
          if (informational.length > 0) {
            console.log(chalk.blue(`  ℹ️  ${informational.length} informational change(s)`));
            if (!options.summary && options.details) {
              informational.forEach(diff => {
                console.log(chalk.blue(`    • ${diff.path}: ${diff.type}`));
                if (diff.oldValue !== undefined && diff.newValue !== undefined) {
                  console.log(chalk.blue(`      - Old: ${JSON.stringify(diff.oldValue)}`));
                  console.log(chalk.blue(`      + New: ${JSON.stringify(diff.newValue)}`));
                }
              });
            }
          }
        }
      }
      
      // Interactive approval workflow
      if (options.interactive && hasAnyChanges) {
        const inquirer = (await import('inquirer')).default;
        const fs = await import('fs-extra');
        
        console.log(chalk.bold('\n🔍 Change Approval Workflow'));
        
        for (const comparison of comparisons) {
          if (!comparison || !comparison.hasChanges) continue;
          
          const breaking = comparison.differences.filter(d => d.severity === 'breaking');
          const nonBreaking = comparison.differences.filter(d => d.severity === 'non-breaking');
          const informational = comparison.differences.filter(d => d.severity === 'informational');
          
          console.log(chalk.bold(`\n📋 ${comparison.endpoint}:`));
          console.log(`   Breaking: ${breaking.length}, Non-breaking: ${nonBreaking.length}, Info: ${informational.length}`);
          
          // Auto-approve non-breaking if requested
          if (breaking.length === 0 && options.autoApprove) {
            console.log(chalk.green('   ✅ Auto-approved (no breaking changes)'));
            await logChange(comparison, 'approved', 'auto-approved (no breaking changes)', fs);
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
            await logChange(comparison, 'approved', 'manually approved by user', fs);
            
            if (answer.action === 'approve-and-update-baseline') {
              console.log(chalk.blue(`   📌 Updating baseline...`));
              await agent.captureEndpoint(comparison.endpoint, true);
            }
          } else if (answer.action === 'reject') {
            console.log(chalk.red(`   ❌ Rejected by user`));
            await logChange(comparison, 'rejected', 'manually rejected by user', fs);
            hasBreakingChanges = true; // Treat rejected changes as breaking
          } else {
            console.log(chalk.yellow(`   ⏭️  Skipped`));
            await logChange(comparison, 'pending', 'skipped during review', fs);
          }
        }
      }
      
      // Final summary
      if (options.summary || options.onlyBreaking) {
        const totalComparisons = comparisons.filter(c => c !== null).length;
        const changedEndpoints = comparisons.filter(c => c && c.hasChanges).length;
        const breakingCount = comparisons.reduce((acc, c) => 
          acc + (c ? c.differences.filter(d => d.severity === 'breaking').length : 0), 0);
        
        console.log(chalk.bold(`\n📊 Summary:`));
        console.log(`   Endpoints checked: ${totalComparisons}`);
        console.log(`   Endpoints with changes: ${changedEndpoints}`);
        console.log(`   Breaking changes: ${breakingCount}`);
      }
      
      if (hasBreakingChanges) {
        console.log(chalk.red('\n🚨 Breaking changes detected!'));
        process.exit(1);
      } else if (hasAnyChanges) {
        console.log(chalk.yellow('\n⚠️  Changes detected, but no breaking changes'));
        process.exit(0);
      } else {
        console.log(chalk.green('\n✅ No changes detected'));
        process.exit(0);
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
  .command('history')
  .description('View change approval history and summary')
  .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
  .option('-e, --endpoint <name>', 'Show history for specific endpoint')
  .option('--days <number>', 'Show changes from last N days', '30')
  .option('--status <status>', 'Filter by status: approved, rejected, pending')
  .option('--summary', 'Show summary only')
  .action(async (options) => {
    try {
      const fs = await import('fs-extra');
      const changeLogPath = './api-snapshot-changes.log.json';
      
      if (!await fs.default.pathExists(changeLogPath)) {
        console.log(chalk.yellow('📋 No change history found'));
        return;
      }
      
      const changeLog = await fs.default.readJson(changeLogPath);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(options.days));
      
      // Filter changes
      let filteredChanges = changeLog.filter((entry: any) => {
        const entryDate = new Date(entry.timestamp);
        const matchesDate = entryDate >= daysAgo;
        const matchesEndpoint = !options.endpoint || entry.endpoint === options.endpoint;
        const matchesStatus = !options.status || entry.status === options.status;
        return matchesDate && matchesEndpoint && matchesStatus;
      });
      
      if (filteredChanges.length === 0) {
        console.log(chalk.yellow('📋 No changes found matching the criteria'));
        return;
      }
      
      if (options.summary) {
        // Summary view
        const summary = {
          total: filteredChanges.length,
          approved: filteredChanges.filter((c: any) => c.status === 'approved').length,
          rejected: filteredChanges.filter((c: any) => c.status === 'rejected').length,
          pending: filteredChanges.filter((c: any) => c.status === 'pending').length,
          endpoints: [...new Set(filteredChanges.map((c: any) => c.endpoint))],
          breakingChanges: filteredChanges.reduce((acc: number, c: any) => acc + c.breakingChanges, 0)
        };
        
        console.log(chalk.bold(`\n📊 Change Summary (Last ${options.days} days):`));
        console.log(`   Total changes: ${summary.total}`);
        console.log(chalk.green(`   Approved: ${summary.approved}`));
        console.log(chalk.red(`   Rejected: ${summary.rejected}`));
        console.log(chalk.yellow(`   Pending: ${summary.pending}`));
        console.log(chalk.red(`   Breaking changes: ${summary.breakingChanges}`));
        console.log(`   Affected endpoints: ${summary.endpoints.length}`);
        
        if (summary.endpoints.length <= 10) {
          console.log(`     ${summary.endpoints.join(', ')}`);
        }
      } else {
        // Detailed view
        console.log(chalk.bold(`\n📋 Change History (Last ${options.days} days):`));
        
        // Group by date
        const changesByDate = filteredChanges.reduce((acc: any, change: any) => {
          const date = new Date(change.timestamp).toDateString();
          if (!acc[date]) acc[date] = [];
          acc[date].push(change);
          return acc;
        }, {});
        
        Object.entries(changesByDate)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .forEach(([date, changes]: [string, any]) => {
            console.log(chalk.bold(`\n📅 ${date}:`));
            
            changes.forEach((change: any) => {
              const statusIcons: Record<string, string> = {
                approved: '✅',
                rejected: '❌', 
                pending: '⏳'
              };
              const statusIcon = statusIcons[change.status] || '❓';
              
              const time = new Date(change.timestamp).toLocaleTimeString();
              console.log(`   ${statusIcon} ${time} - ${change.endpoint}`);
              console.log(chalk.gray(`      ${change.changesCount} changes (${change.breakingChanges} breaking)`));
              console.log(chalk.gray(`      ${change.reason}`));
              
              if (change.differences.length > 0) {
                const breakingDiffs = change.differences.filter((d: any) => d.severity === 'breaking');
                if (breakingDiffs.length > 0) {
                  console.log(chalk.red(`      Breaking: ${breakingDiffs.map((d: any) => d.path).join(', ')}`));
                }
              }
            });
          });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to read change history:'), error instanceof Error ? error.message : error);
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

program
  .command('import-schema')
  .description('Import API schema and generate endpoint configurations')
  .option('-s, --schema <path>', 'Path to OpenAPI/JSON Schema file')
  .option('-t, --type <type>', 'Schema type: openapi, json-schema', 'openapi')
  .option('-o, --output <path>', 'Output configuration file path', './api-snapshot.config.json')
  .option('--base-url <url>', 'Base URL for generated endpoints')
  .option('--merge', 'Merge with existing configuration instead of overwriting')
  .action(async (options) => {
    try {
      if (!options.schema) {
        console.log(chalk.red('❌ Schema file path is required. Use -s or --schema option.'));
        process.exit(1);
      }

      const fs = await import('fs-extra');
      const schemaManager = new SchemaManager();
      
      if (!await fs.default.pathExists(options.schema)) {
        console.log(chalk.red(`❌ Schema file not found: ${options.schema}`));
        process.exit(1);
      }

      console.log(chalk.blue(`📋 Importing ${options.type} schema from ${options.schema}...`));

      if (options.type === 'openapi') {
        const endpoints = await schemaManager.generateEndpointsFromOpenApi(options.schema, options.baseUrl);
        
        console.log(chalk.green(`✅ Generated ${endpoints.length} endpoint(s) from OpenAPI schema`));

        let config: any = {
          endpoints: [],
          snapshotDir: 'snapshots',
          baselineDir: 'baselines',
          environment: 'development'
        };

        // Merge with existing config if requested
        if (options.merge && await fs.default.pathExists(options.output)) {
          config = await fs.default.readJson(options.output);
          console.log(chalk.blue(`📝 Merging with existing configuration...`));
        }

        // Add schema validation to all endpoints
        const enhancedEndpoints = endpoints.map(endpoint => ({
          ...endpoint,
          schema: {
            type: 'openapi',
            source: options.schema,
            operationId: endpoint.schema?.operationId,
            requestValidation: true,
            responseValidation: true
          }
        }));

        if (options.merge) {
          // Add only new endpoints (avoid duplicates by name)
          const existingNames = new Set(config.endpoints.map((e: any) => e.name));
          const newEndpoints = enhancedEndpoints.filter(e => !existingNames.has(e.name));
          config.endpoints.push(...newEndpoints);
          console.log(chalk.green(`✅ Added ${newEndpoints.length} new endpoint(s)`));
        } else {
          config.endpoints = enhancedEndpoints;
        }

        await fs.default.writeJson(options.output, config, { spaces: 2 });
        console.log(chalk.green(`✅ Configuration saved to ${options.output}`));

        // Show summary
        console.log(chalk.bold('\n📊 Generated endpoints:'));
        enhancedEndpoints.forEach(endpoint => {
          console.log(`  ${endpoint.method} ${endpoint.name}`);
          console.log(chalk.gray(`    ${endpoint.url}`));
        });

      } else {
        console.log(chalk.red(`❌ Schema type "${options.type}" not yet supported. Currently supports: openapi`));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('❌ Schema import failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('validate-schema')
  .description('Validate current snapshots against their schemas')
  .option('-c, --config <path>', 'Path to configuration file', './api-snapshot.config.json')
  .option('-e, --endpoint <name>', 'Validate specific endpoint only')
  .option('--request', 'Validate request schemas only')
  .option('--response', 'Validate response schemas only')
  .action(async (options) => {
    try {
      const agent = new SnapshotAgent(options.config);
      await agent.initialize();
      
      console.log(chalk.blue('🔍 Validating snapshots against schemas...'));

      const snapshots = await agent.listSnapshots(options.endpoint);
      if (snapshots.length === 0) {
        console.log(chalk.yellow('📁 No snapshots found to validate'));
        return;
      }

      const schemaManager = new SchemaManager();
      let totalSnapshots = 0;
      let validSnapshots = 0;
      let invalidSnapshots = 0;

      for (const snapshotPath of snapshots) {
        try {
          const fs = await import('fs-extra');
          const snapshot = await fs.default.readJson(snapshotPath);
          
          if (!snapshot.endpoint.schema) {
            console.log(chalk.gray(`⏭️  ${snapshot.endpoint.name}: No schema configured`));
            continue;
          }

          totalSnapshots++;
          console.log(chalk.bold(`\n🔍 ${snapshot.endpoint.name}:`));

          let hasErrors = false;

          // Validate request if requested and data exists
          if ((!options.response || options.request) && snapshot.request?.validation) {
            const validation = snapshot.request.validation;
            if (!validation.isValid) {
              hasErrors = true;
              console.log(chalk.red(`  ❌ Request validation failed:`));
              validation.errors.forEach((error: any) => {
                console.log(chalk.red(`    • ${error.path}: ${error.message}`));
              });
            } else {
              console.log(chalk.green(`  ✅ Request validation passed`));
            }
          }

          // Validate response if requested and data exists
          if ((!options.request || options.response) && snapshot.response?.validation) {
            const validation = snapshot.response.validation;
            if (!validation.isValid) {
              hasErrors = true;
              console.log(chalk.red(`  ❌ Response validation failed:`));
              validation.errors.forEach((error: any) => {
                console.log(chalk.red(`    • ${error.path}: ${error.message}`));
              });
            } else {
              console.log(chalk.green(`  ✅ Response validation passed`));
            }
          }

          // If no validation data exists, re-validate
          if (!snapshot.request?.validation && !snapshot.response?.validation) {
            console.log(chalk.yellow(`  ⚠️  No validation data found, running fresh validation...`));
            
            if (!options.response || options.request) {
              if (snapshot.endpoint.body) {
                const requestValidation = await schemaManager.validateRequest(
                  snapshot.endpoint.body, 
                  snapshot.endpoint.schema
                );
                if (!requestValidation.isValid) {
                  hasErrors = true;
                  console.log(chalk.red(`  ❌ Request validation failed:`));
                  requestValidation.errors.forEach(error => {
                    console.log(chalk.red(`    • ${error.path}: ${error.message}`));
                  });
                } else {
                  console.log(chalk.green(`  ✅ Request validation passed`));
                }
              }
            }

            if (!options.request || options.response) {
              const responseValidation = await schemaManager.validateResponse(
                snapshot.response.data,
                snapshot.response.status,
                snapshot.endpoint.schema
              );
              if (!responseValidation.isValid) {
                hasErrors = true;
                console.log(chalk.red(`  ❌ Response validation failed:`));
                responseValidation.errors.forEach(error => {
                  console.log(chalk.red(`    • ${error.path}: ${error.message}`));
                });
              } else {
                console.log(chalk.green(`  ✅ Response validation passed`));
              }
            }
          }

          if (hasErrors) {
            invalidSnapshots++;
          } else {
            validSnapshots++;
          }

        } catch (error) {
          console.log(chalk.red(`  ❌ Failed to validate: ${error instanceof Error ? error.message : error}`));
          invalidSnapshots++;
        }
      }

      // Summary
      console.log(chalk.bold(`\n📊 Validation Summary:`));
      console.log(`  Total snapshots: ${totalSnapshots}`);
      console.log(chalk.green(`  Valid: ${validSnapshots}`));
      console.log(chalk.red(`  Invalid: ${invalidSnapshots}`));

      if (invalidSnapshots > 0) {
        console.log(chalk.red('\n🚨 Schema validation failures detected!'));
        process.exit(1);
      } else {
        console.log(chalk.green('\n✅ All snapshots pass schema validation'));
      }

    } catch (error) {
      console.error(chalk.red('❌ Schema validation failed:'), error instanceof Error ? error.message : error);
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