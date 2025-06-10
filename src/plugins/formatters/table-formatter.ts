import chalk from 'chalk';
import { OutputFormatter, FormatOptions } from '../../core/interfaces.js';
import { SnapshotComparison } from '../../types.js';

export class TableFormatter implements OutputFormatter {
  name = 'table';

  format(comparisons: SnapshotComparison[], options: FormatOptions = {}): string {
    if (comparisons.length === 0) {
      return chalk.yellow('📁 No comparisons to display');
    }

    const output: string[] = [];

    for (const comparison of comparisons) {
      if (!comparison) continue;

      if (!comparison.hasChanges && options.summary) continue;

      output.push(chalk.bold(`\n🔍 ${comparison.endpoint}`));

      if (!comparison.hasChanges) {
        output.push(chalk.green('  ✅ No changes detected'));
        continue;
      }

      const breaking = comparison.differences.filter(d => d.severity === 'breaking');
      const nonBreaking = comparison.differences.filter(d => d.severity === 'non-breaking');
      const informational = comparison.differences.filter(d => d.severity === 'informational');

      if (breaking.length > 0) {
        output.push(chalk.red(`  🚨 ${breaking.length} breaking change(s)`));
        if (!options.summary) {
          breaking.forEach(diff => {
            output.push(chalk.red(`    • ${diff.path}: ${diff.type}`));
            if (options.details && diff.oldValue !== undefined && diff.newValue !== undefined) {
              output.push(chalk.red(`      - Old: ${JSON.stringify(diff.oldValue)}`));
              output.push(chalk.red(`      + New: ${JSON.stringify(diff.newValue)}`));
            }
          });
        }
      }

      if (!options.onlyBreaking) {
        if (nonBreaking.length > 0) {
          output.push(chalk.yellow(`  ⚠️  ${nonBreaking.length} non-breaking change(s)`));
          if (!options.summary && options.details) {
            nonBreaking.forEach(diff => {
              output.push(chalk.yellow(`    • ${diff.path}: ${diff.type}`));
              if (diff.oldValue !== undefined && diff.newValue !== undefined) {
                output.push(chalk.yellow(`      - Old: ${JSON.stringify(diff.oldValue)}`));
                output.push(chalk.yellow(`      + New: ${JSON.stringify(diff.newValue)}`));
              }
            });
          }
        }

        if (informational.length > 0) {
          output.push(chalk.blue(`  ℹ️  ${informational.length} informational change(s)`));
          if (!options.summary && options.details) {
            informational.forEach(diff => {
              output.push(chalk.blue(`    • ${diff.path}: ${diff.type}`));
              if (diff.oldValue !== undefined && diff.newValue !== undefined) {
                output.push(chalk.blue(`      - Old: ${JSON.stringify(diff.oldValue)}`));
                output.push(chalk.blue(`      + New: ${JSON.stringify(diff.newValue)}`));
              }
            });
          }
        }
      }
    }

    // Summary section
    if (options.summary || options.onlyBreaking) {
      const totalComparisons = comparisons.filter(c => c !== null).length;
      const changedEndpoints = comparisons.filter(c => c && c.hasChanges).length;
      const breakingCount = comparisons.reduce((acc, c) => 
        acc + (c ? c.differences.filter(d => d.severity === 'breaking').length : 0), 0);

      output.push(chalk.bold(`\n📊 Summary:`));
      output.push(`   Endpoints checked: ${totalComparisons}`);
      output.push(`   Endpoints with changes: ${changedEndpoints}`);
      output.push(`   Breaking changes: ${breakingCount}`);
    }

    return output.join('\n');
  }

  supportsOptions(options: string[]): boolean {
    const supportedOptions = ['details', 'onlyBreaking', 'summary'];
    return options.every(option => supportedOptions.includes(option));
  }
}