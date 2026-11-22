import { SnapshotComparison, SnapshotDiff } from './types.js';
import chalk from 'chalk';
import { dirname } from 'path';

export interface ReportOptions {
  format: 'table' | 'json' | 'text' | 'markdown';
  includeDetails?: boolean;
  onlyBreaking?: boolean;
}

export class Reporter {
  generateReport(comparisons: SnapshotComparison[], options: ReportOptions = { format: 'table' }): string {
    const filteredComparisons = options.onlyBreaking 
      ? comparisons.filter(c => c.differences.some(d => d.severity === 'breaking'))
      : comparisons;

    switch (options.format) {
      case 'json':
        return this.generateJsonReport(filteredComparisons);
      case 'markdown':
        return this.generateMarkdownReport(filteredComparisons, options.includeDetails);
      case 'text':
        return this.generateTextReport(filteredComparisons, options.includeDetails);
      default:
        return this.generateTableReport(filteredComparisons, options.includeDetails);
    }
  }

  private generateJsonReport(comparisons: SnapshotComparison[]): string {
    return JSON.stringify({
      summary: this.generateSummary(comparisons),
      comparisons,
      generatedAt: new Date().toISOString()
    }, null, 2);
  }

  private generateMarkdownReport(comparisons: SnapshotComparison[], includeDetails?: boolean): string {
    const summary = this.generateSummary(comparisons);
    let report = '# API Snapshot Comparison Report\n\n';
    
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    report += '## Summary\n\n';
    report += `- **Total Endpoints:** ${summary.totalEndpoints}\n`;
    report += `- **Changed Endpoints:** ${summary.changedEndpoints}\n`;
    report += `- **Breaking Changes:** ${summary.breakingChanges}\n`;
    report += `- **Non-breaking Changes:** ${summary.nonBreakingChanges}\n`;
    report += `- **Informational Changes:** ${summary.informationalChanges}\n\n`;

    if (summary.breakingChanges > 0) {
      report += '🚨 **Breaking changes detected!**\n\n';
    } else {
      report += '✅ **No breaking changes detected**\n\n';
    }

    report += '## Details\n\n';
    
    for (const comparison of comparisons) {
      report += `### ${comparison.endpoint}\n\n`;
      
      if (!comparison.hasChanges) {
        report += '✅ No changes detected\n\n';
        continue;
      }

      const breaking = comparison.differences.filter(d => d.severity === 'breaking');
      const nonBreaking = comparison.differences.filter(d => d.severity === 'non-breaking');
      const informational = comparison.differences.filter(d => d.severity === 'informational');

      if (breaking.length > 0) {
        report += `🚨 **${breaking.length} breaking change(s):**\n\n`;
        breaking.forEach(diff => {
          report += `- \`${diff.path}\`: ${diff.type}\n`;
          if (includeDetails && diff.oldValue !== undefined) {
            report += `  - Old: \`${JSON.stringify(diff.oldValue)}\`\n`;
          }
          if (includeDetails && diff.newValue !== undefined) {
            report += `  - New: \`${JSON.stringify(diff.newValue)}\`\n`;
          }
        });
        report += '\n';
      }

      if (nonBreaking.length > 0) {
        report += `⚠️ **${nonBreaking.length} non-breaking change(s):**\n\n`;
        nonBreaking.forEach(diff => {
          report += `- \`${diff.path}\`: ${diff.type}\n`;
        });
        report += '\n';
      }

      if (informational.length > 0) {
        report += `ℹ️ **${informational.length} informational change(s):**\n\n`;
        informational.forEach(diff => {
          report += `- \`${diff.path}\`: ${diff.type}\n`;
        });
        report += '\n';
      }
    }

    return report;
  }

  private generateTextReport(comparisons: SnapshotComparison[], includeDetails?: boolean): string {
    const summary = this.generateSummary(comparisons);
    let report = 'API Snapshot Comparison Report\n';
    report += '='.repeat(35) + '\n\n';
    
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += 'Summary:\n';
    report += `---------\n`;
    report += `Total Endpoints: ${summary.totalEndpoints}\n`;
    report += `Changed Endpoints: ${summary.changedEndpoints}\n`;
    report += `Breaking Changes: ${summary.breakingChanges}\n`;
    report += `Non-breaking Changes: ${summary.nonBreakingChanges}\n`;
    report += `Informational Changes: ${summary.informationalChanges}\n\n`;

    if (summary.breakingChanges > 0) {
      report += '🚨 Breaking changes detected!\n\n';
    } else {
      report += '✅ No breaking changes detected\n\n';
    }

    report += 'Details:\n';
    report += '--------\n\n';
    
    for (const comparison of comparisons) {
      report += `${comparison.endpoint}:\n`;
      
      if (!comparison.hasChanges) {
        report += '  ✅ No changes detected\n\n';
        continue;
      }

      const breaking = comparison.differences.filter(d => d.severity === 'breaking');
      const nonBreaking = comparison.differences.filter(d => d.severity === 'non-breaking');
      const informational = comparison.differences.filter(d => d.severity === 'informational');

      if (breaking.length > 0) {
        report += `  🚨 ${breaking.length} breaking change(s):\n`;
        breaking.forEach(diff => {
          report += `    • ${diff.path}: ${diff.type}\n`;
          if (includeDetails) {
            if (diff.oldValue !== undefined) {
              report += `      Old: ${JSON.stringify(diff.oldValue)}\n`;
            }
            if (diff.newValue !== undefined) {
              report += `      New: ${JSON.stringify(diff.newValue)}\n`;
            }
          }
        });
      }

      if (nonBreaking.length > 0) {
        report += `  ⚠️  ${nonBreaking.length} non-breaking change(s):\n`;
        nonBreaking.forEach(diff => {
          report += `    • ${diff.path}: ${diff.type}\n`;
        });
      }

      if (informational.length > 0) {
        report += `  ℹ️  ${informational.length} informational change(s):\n`;
        informational.forEach(diff => {
          report += `    • ${diff.path}: ${diff.type}\n`;
        });
      }

      report += '\n';
    }

    return report;
  }

  private generateTableReport(comparisons: SnapshotComparison[], includeDetails?: boolean): string {
    const summary = this.generateSummary(comparisons);
    let report = '';
    
    // Summary table
    report += chalk.bold('📊 Summary\n');
    report += `Total Endpoints:        ${summary.totalEndpoints}\n`;
    report += `Changed Endpoints:      ${summary.changedEndpoints}\n`;
    report += `Breaking Changes:       ${chalk.red(summary.breakingChanges)}\n`;
    report += `Non-breaking Changes:   ${chalk.yellow(summary.nonBreakingChanges)}\n`;
    report += `Informational Changes:  ${chalk.blue(summary.informationalChanges)}\n\n`;

    if (summary.breakingChanges > 0) {
      report += chalk.red('🚨 Breaking changes detected!\n\n');
    } else {
      report += chalk.green('✅ No breaking changes detected\n\n');
    }

    // Details for each endpoint
    for (const comparison of comparisons) {
      report += chalk.bold(`🔍 ${comparison.endpoint}\n`);
      
      if (!comparison.hasChanges) {
        report += chalk.green('  ✅ No changes detected\n\n');
        continue;
      }

      const breaking = comparison.differences.filter(d => d.severity === 'breaking');
      const nonBreaking = comparison.differences.filter(d => d.severity === 'non-breaking');
      const informational = comparison.differences.filter(d => d.severity === 'informational');

      if (breaking.length > 0) {
        report += chalk.red(`  🚨 ${breaking.length} breaking change(s):\n`);
        breaking.forEach(diff => {
          report += chalk.red(`    • ${diff.path}: ${diff.type}\n`);
          if (includeDetails) {
            if (diff.oldValue !== undefined) {
              report += chalk.gray(`      Old: ${JSON.stringify(diff.oldValue)}\n`);
            }
            if (diff.newValue !== undefined) {
              report += chalk.gray(`      New: ${JSON.stringify(diff.newValue)}\n`);
            }
          }
        });
      }

      if (nonBreaking.length > 0) {
        report += chalk.yellow(`  ⚠️  ${nonBreaking.length} non-breaking change(s):\n`);
        nonBreaking.forEach(diff => {
          report += chalk.yellow(`    • ${diff.path}: ${diff.type}\n`);
        });
      }

      if (informational.length > 0) {
        report += chalk.blue(`  ℹ️  ${informational.length} informational change(s):\n`);
        informational.forEach(diff => {
          report += chalk.blue(`    • ${diff.path}: ${diff.type}\n`);
        });
      }

      report += '\n';
    }

    return report;
  }

  private generateSummary(comparisons: SnapshotComparison[]) {
    let breakingChanges = 0;
    let nonBreakingChanges = 0;
    let informationalChanges = 0;
    let changedEndpoints = 0;

    for (const comparison of comparisons) {
      if (comparison.hasChanges) {
        changedEndpoints++;
      }

      for (const diff of comparison.differences) {
        switch (diff.severity) {
          case 'breaking':
            breakingChanges++;
            break;
          case 'non-breaking':
            nonBreakingChanges++;
            break;
          case 'informational':
            informationalChanges++;
            break;
        }
      }
    }

    return {
      totalEndpoints: comparisons.length,
      changedEndpoints,
      breakingChanges,
      nonBreakingChanges,
      informationalChanges
    };
  }

  async saveReport(report: string, filePath: string): Promise<void> {
    const fs = await import('fs-extra');
    await fs.ensureDir(dirname(filePath));
    await fs.writeFile(filePath, report, 'utf-8');
  }
}