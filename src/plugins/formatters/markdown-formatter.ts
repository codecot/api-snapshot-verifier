import { OutputFormatter, FormatOptions } from '../../core/interfaces.js';
import { SnapshotComparison } from '../../types.js';

export class MarkdownFormatter implements OutputFormatter {
  name = 'markdown';

  format(comparisons: SnapshotComparison[], options: FormatOptions = {}): string {
    if (comparisons.length === 0) {
      return '# API Snapshot Comparison\n\nNo comparisons to display.';
    }

    const output: string[] = [];
    output.push('# 🧪 API Snapshot Comparison Report');
    output.push('');
    output.push(`**Generated:** ${new Date().toISOString()}`);
    output.push('');

    // Summary section
    const totalComparisons = comparisons.filter(c => c !== null).length;
    const changedEndpoints = comparisons.filter(c => c && c.hasChanges).length;
    const breakingCount = comparisons.reduce((acc, c) => 
      acc + (c ? c.differences.filter(d => d.severity === 'breaking').length : 0), 0);

    output.push('## 📊 Summary');
    output.push('');
    output.push(`- **Endpoints checked:** ${totalComparisons}`);
    output.push(`- **Endpoints with changes:** ${changedEndpoints}`);
    output.push(`- **Breaking changes:** ${breakingCount}`);
    output.push('');

    if (breakingCount > 0) {
      output.push('> ⚠️ **Warning:** Breaking changes detected!');
      output.push('');
    }

    // Detailed results
    output.push('## 🔍 Detailed Results');
    output.push('');

    for (const comparison of comparisons) {
      if (!comparison) continue;

      if (!comparison.hasChanges && options.summary) continue;

      output.push(`### \`${comparison.endpoint}\``);
      output.push('');

      if (!comparison.hasChanges) {
        output.push('✅ **No changes detected**');
        output.push('');
        continue;
      }

      const breaking = comparison.differences.filter(d => d.severity === 'breaking');
      const nonBreaking = comparison.differences.filter(d => d.severity === 'non-breaking');
      const informational = comparison.differences.filter(d => d.severity === 'informational');

      if (breaking.length > 0) {
        output.push(`🚨 **${breaking.length} Breaking Changes**`);
        output.push('');
        if (!options.summary) {
          breaking.forEach(diff => {
            output.push(`- **${diff.path}**: \`${diff.type}\``);
            if (options.details && diff.oldValue !== undefined && diff.newValue !== undefined) {
              output.push(`  - **Old:** \`${JSON.stringify(diff.oldValue)}\``);
              output.push(`  - **New:** \`${JSON.stringify(diff.newValue)}\``);
            }
          });
          output.push('');
        }
      }

      if (!options.onlyBreaking) {
        if (nonBreaking.length > 0) {
          output.push(`⚠️ **${nonBreaking.length} Non-Breaking Changes**`);
          output.push('');
          if (!options.summary && options.details) {
            nonBreaking.forEach(diff => {
              output.push(`- **${diff.path}**: \`${diff.type}\``);
              if (diff.oldValue !== undefined && diff.newValue !== undefined) {
                output.push(`  - **Old:** \`${JSON.stringify(diff.oldValue)}\``);
                output.push(`  - **New:** \`${JSON.stringify(diff.newValue)}\``);
              }
            });
            output.push('');
          }
        }

        if (informational.length > 0) {
          output.push(`ℹ️ **${informational.length} Informational Changes**`);
          output.push('');
          if (!options.summary && options.details) {
            informational.forEach(diff => {
              output.push(`- **${diff.path}**: \`${diff.type}\``);
              if (diff.oldValue !== undefined && diff.newValue !== undefined) {
                output.push(`  - **Old:** \`${JSON.stringify(diff.oldValue)}\``);
                output.push(`  - **New:** \`${JSON.stringify(diff.newValue)}\``);
              }
            });
            output.push('');
          }
        }
      }

      output.push('---');
      output.push('');
    }

    return output.join('\n');
  }

  supportsOptions(options: string[]): boolean {
    const supportedOptions = ['details', 'onlyBreaking', 'summary'];
    return options.every(option => supportedOptions.includes(option));
  }
}