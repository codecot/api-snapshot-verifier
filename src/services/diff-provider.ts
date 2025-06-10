import { DiffProvider, DiffRule } from '../core/interfaces.js';
import { ApiSnapshot, SnapshotComparison, SnapshotDiff, ValidationResult } from '../types.js';
import { diffJson } from 'diff';

export class JsonDiffProvider implements DiffProvider {
  name = 'json';

  compare(baseline: ApiSnapshot, current: ApiSnapshot, rules: DiffRule[] = []): SnapshotComparison {
    const differences: SnapshotDiff[] = [];
    
    // Compare status codes
    if (baseline.response.status !== current.response.status) {
      differences.push({
        path: 'response.status',
        type: 'changed',
        oldValue: baseline.response.status,
        newValue: current.response.status,
        severity: this.determineStatusSeverity(baseline.response.status, current.response.status)
      });
    }

    // Compare response data
    const dataDiffs = this.compareData(baseline.response.data, current.response.data, 'response.data');
    differences.push(...dataDiffs);

    // Compare headers (excluding sensitive ones)
    const headerDiffs = this.compareHeaders(baseline.response.headers, current.response.headers);
    differences.push(...headerDiffs);

    // Compare schema validation results
    const schemaDiffs = this.compareSchemaValidation(baseline, current);
    differences.push(...schemaDiffs);

    // Apply rules to filter or modify severity
    const filteredDiffs = this.applyRules(differences, rules);

    return {
      endpoint: baseline.endpoint.name,
      baseline,
      current,
      differences: filteredDiffs,
      hasChanges: filteredDiffs.length > 0
    };
  }

  generateTextDiff(baseline: ApiSnapshot, current: ApiSnapshot): string {
    const baselineJson = JSON.stringify(baseline.response.data, null, 2);
    const currentJson = JSON.stringify(current.response.data, null, 2);
    
    const diff = diffJson(baselineJson, currentJson);
    
    return diff.map(part => {
      if (part.added) return `+ ${part.value}`;
      if (part.removed) return `- ${part.value}`;
      return `  ${part.value}`;
    }).join('');
  }

  private compareData(oldData: any, newData: any, basePath: string): SnapshotDiff[] {
    const differences: SnapshotDiff[] = [];
    
    if (typeof oldData !== typeof newData) {
      differences.push({
        path: basePath,
        type: 'changed',
        oldValue: oldData,
        newValue: newData,
        severity: 'breaking'
      });
      return differences;
    }

    if (oldData === null || newData === null) {
      if (oldData !== newData) {
        differences.push({
          path: basePath,
          type: 'changed',
          oldValue: oldData,
          newValue: newData,
          severity: 'breaking'
        });
      }
      return differences;
    }

    if (Array.isArray(oldData) && Array.isArray(newData)) {
      return this.compareArrays(oldData, newData, basePath);
    }

    if (typeof oldData === 'object' && typeof newData === 'object') {
      return this.compareObjects(oldData, newData, basePath);
    }

    if (oldData !== newData) {
      differences.push({
        path: basePath,
        type: 'changed',
        oldValue: oldData,
        newValue: newData,
        severity: this.determinePrimitiveSeverity(basePath, oldData, newData)
      });
    }

    return differences;
  }

  private compareObjects(oldObj: Record<string, any>, newObj: Record<string, any>, basePath: string): SnapshotDiff[] {
    const differences: SnapshotDiff[] = [];
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      const currentPath = `${basePath}.${key}`;
      
      if (!(key in oldObj)) {
        differences.push({
          path: currentPath,
          type: 'added',
          newValue: newObj[key],
          severity: 'non-breaking'
        });
      } else if (!(key in newObj)) {
        differences.push({
          path: currentPath,
          type: 'removed',
          oldValue: oldObj[key],
          severity: 'breaking'
        });
      } else {
        const subDiffs = this.compareData(oldObj[key], newObj[key], currentPath);
        differences.push(...subDiffs);
      }
    }

    return differences;
  }

  private compareArrays(oldArray: any[], newArray: any[], basePath: string): SnapshotDiff[] {
    const differences: SnapshotDiff[] = [];

    // Compare array lengths
    if (oldArray.length !== newArray.length) {
      differences.push({
        path: `${basePath}.length`,
        type: 'changed',
        oldValue: oldArray.length,
        newValue: newArray.length,
        severity: 'non-breaking'
      });
    }

    // Compare elements (up to the shorter array length)
    const minLength = Math.min(oldArray.length, newArray.length);
    for (let i = 0; i < minLength; i++) {
      const elementDiffs = this.compareData(oldArray[i], newArray[i], `${basePath}[${i}]`);
      differences.push(...elementDiffs);
    }

    return differences;
  }

  private compareHeaders(oldHeaders: Record<string, string>, newHeaders: Record<string, string>): SnapshotDiff[] {
    const differences: SnapshotDiff[] = [];
    const importantHeaders = ['content-type', 'content-length', 'cache-control'];
    
    for (const header of importantHeaders) {
      if (oldHeaders[header] !== newHeaders[header]) {
        differences.push({
          path: `response.headers.${header}`,
          type: 'changed',
          oldValue: oldHeaders[header],
          newValue: newHeaders[header],
          severity: header === 'content-type' ? 'breaking' : 'informational'
        });
      }
    }

    return differences;
  }

  private compareSchemaValidation(baseline: ApiSnapshot, current: ApiSnapshot): SnapshotDiff[] {
    const differences: SnapshotDiff[] = [];

    // Compare request validation results
    if (baseline.request?.validation || current.request?.validation) {
      const baselineValid = baseline.request?.validation?.isValid ?? true;
      const currentValid = current.request?.validation?.isValid ?? true;
      
      if (baselineValid !== currentValid) {
        differences.push({
          path: 'request.validation.isValid',
          type: 'changed',
          oldValue: baselineValid,
          newValue: currentValid,
          severity: currentValid ? 'non-breaking' : 'breaking'
        });
      }
    }

    // Compare response validation results
    if (baseline.response?.validation || current.response?.validation) {
      const baselineValid = baseline.response?.validation?.isValid ?? true;
      const currentValid = current.response?.validation?.isValid ?? true;
      
      if (baselineValid !== currentValid) {
        differences.push({
          path: 'response.validation.isValid',
          type: 'changed',
          oldValue: baselineValid,
          newValue: currentValid,
          severity: currentValid ? 'non-breaking' : 'breaking'
        });
      }

      // Detect new validation errors (schema contract violations)
      if (current.response?.validation?.errors) {
        const baselineErrorPaths = new Set(baseline.response?.validation?.errors?.map(e => e.path) ?? []);
        
        for (const error of current.response.validation.errors) {
          if (!baselineErrorPaths.has(error.path)) {
            differences.push({
              path: `response.validation.errors.${error.path}`,
              type: 'added',
              newValue: error.message,
              severity: 'breaking'
            });
          }
        }
      }
    }

    return differences;
  }

  private determineStatusSeverity(oldStatus: number, newStatus: number): 'breaking' | 'non-breaking' | 'informational' {
    // 2xx to 4xx/5xx is breaking
    if (oldStatus >= 200 && oldStatus < 300 && (newStatus >= 400 || newStatus < 200)) {
      return 'breaking';
    }
    
    // 4xx/5xx to 2xx is non-breaking (improvement)
    if ((oldStatus >= 400 || oldStatus < 200) && newStatus >= 200 && newStatus < 300) {
      return 'non-breaking';
    }

    return 'informational';
  }

  private determinePrimitiveSeverity(path: string, oldValue: any, newValue: any): 'breaking' | 'non-breaking' | 'informational' {
    // ID changes are usually breaking
    if (path.toLowerCase().includes('id')) {
      return 'breaking';
    }

    // Null to value or value to null
    if ((oldValue === null) !== (newValue === null)) {
      return 'breaking';
    }

    return 'non-breaking';
  }

  private applyRules(differences: SnapshotDiff[], rules: DiffRule[]): SnapshotDiff[] {
    return differences.filter(diff => {
      const rule = rules.find(r => diff.path.startsWith(r.path));
      
      if (rule) {
        if (rule.ignore) {
          return false;
        }
        if (rule.severity) {
          diff.severity = rule.severity;
        }
      }
      
      return true;
    });
  }
}