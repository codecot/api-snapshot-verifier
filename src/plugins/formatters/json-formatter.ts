import { OutputFormatter, FormatOptions } from '../../core/interfaces.js';
import { SnapshotComparison } from '../../types.js';

export class JsonFormatter implements OutputFormatter {
  name = 'json';

  format(comparisons: SnapshotComparison[], options: FormatOptions = {}): string {
    const filteredComparisons = comparisons.filter(c => c !== null);
    
    if (options.onlyBreaking) {
      const breakingComparisons = filteredComparisons.map(comparison => ({
        ...comparison,
        differences: comparison.differences.filter(d => d.severity === 'breaking')
      })).filter(c => c.differences.length > 0);
      
      return JSON.stringify(breakingComparisons, null, 2);
    }

    if (options.summary) {
      const summary = this.generateSummary(filteredComparisons);
      return JSON.stringify(summary, null, 2);
    }

    return JSON.stringify(filteredComparisons, null, 2);
  }

  supportsOptions(options: string[]): boolean {
    const supportedOptions = ['onlyBreaking', 'summary'];
    return options.every(option => supportedOptions.includes(option));
  }

  private generateSummary(comparisons: SnapshotComparison[]) {
    const totalEndpoints = comparisons.length;
    const changedEndpoints = comparisons.filter(c => c.hasChanges).length;
    
    const breakingChanges = comparisons.reduce((acc, c) => 
      acc + c.differences.filter(d => d.severity === 'breaking').length, 0);
    
    const nonBreakingChanges = comparisons.reduce((acc, c) => 
      acc + c.differences.filter(d => d.severity === 'non-breaking').length, 0);
    
    const informationalChanges = comparisons.reduce((acc, c) => 
      acc + c.differences.filter(d => d.severity === 'informational').length, 0);

    const endpointSummaries = comparisons.map(c => ({
      endpoint: c.endpoint,
      hasChanges: c.hasChanges,
      breakingChanges: c.differences.filter(d => d.severity === 'breaking').length,
      nonBreakingChanges: c.differences.filter(d => d.severity === 'non-breaking').length,
      informationalChanges: c.differences.filter(d => d.severity === 'informational').length
    }));

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalEndpoints,
        changedEndpoints,
        breakingChanges,
        nonBreakingChanges,
        informationalChanges,
        hasBreakingChanges: breakingChanges > 0
      },
      endpoints: endpointSummaries
    };
  }
}