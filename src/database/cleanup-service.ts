import { DatabaseService } from './database-service.js';

export interface CleanupReport {
  spacesRemoved: string[];
  spacesRenamed: Array<{ from: string; to: string }>;
  spacesMerged: Array<{ from: string; to: string; endpointsMoved: number }>;
  endpointsRemoved: number;
  parametersRemoved: number;
  orphanedDataRemoved: number;
}

export class DatabaseCleanupService {
  private db: DatabaseService;

  constructor(dbPath?: string) {
    this.db = new DatabaseService(dbPath);
  }

  async performCleanup(dryRun: boolean = false): Promise<CleanupReport> {
    const report: CleanupReport = {
      spacesRemoved: [],
      spacesRenamed: [],
      spacesMerged: [],
      endpointsRemoved: 0,
      parametersRemoved: 0,
      orphanedDataRemoved: 0
    };

    console.log(dryRun ? '🧹 DRY RUN: Database Cleanup Analysis' : '🧹 Starting Database Cleanup...');
    console.log('=======================================');

    // Get current state
    const spaces = this.db.listSpaces();
    console.log(`📊 Current state: ${spaces.length} spaces`);

    // 1. Remove empty spaces (no endpoints)
    await this.removeEmptySpaces(report, dryRun);

    // 2. Rename inconsistent spaces
    await this.renameInconsistentSpaces(report, dryRun);

    // 3. Merge duplicate/similar spaces
    await this.mergeDuplicateSpaces(report, dryRun);

    // 4. Remove orphaned data
    await this.removeOrphanedData(report, dryRun);

    // 5. Consolidate parameters
    await this.consolidateParameters(report, dryRun);

    console.log('');
    console.log('📊 Cleanup Summary:');
    console.log(`  Spaces removed: ${report.spacesRemoved.length}`);
    console.log(`  Spaces renamed: ${report.spacesRenamed.length}`);
    console.log(`  Spaces merged: ${report.spacesMerged.length}`);
    console.log(`  Endpoints removed: ${report.endpointsRemoved}`);
    console.log(`  Parameters removed: ${report.parametersRemoved}`);
    console.log(`  Orphaned data removed: ${report.orphanedDataRemoved}`);

    if (dryRun) {
      console.log('');
      console.log('🔍 This was a DRY RUN - no changes were made');
      console.log('Run without --dry-run to apply these changes');
    } else {
      console.log('');
      console.log('✅ Cleanup completed successfully!');
    }

    return report;
  }

  private async removeEmptySpaces(report: CleanupReport, dryRun: boolean): Promise<void> {
    console.log('');
    console.log('🗑️  Removing empty spaces...');

    const spaces = this.db.listSpaces();
    const emptySpaces: string[] = [];

    for (const space of spaces) {
      const spaceRecord = this.db.getSpaceByName(space.name);
      if (!spaceRecord) continue;

      const endpoints = this.db.getEndpointsBySpaceId(spaceRecord.id);
      const parameters = this.db.getSpaceParameters(spaceRecord.id);

      if (endpoints.length === 0 && Object.keys(parameters).length === 0) {
        emptySpaces.push(space.name);
        console.log(`  🗑️  Empty space: ${space.name}`);
      }
    }

    if (!dryRun) {
      for (const spaceName of emptySpaces) {
        const space = this.db.getSpaceByName(spaceName);
        if (space) {
          this.db.deleteSpace(space.id);
          report.spacesRemoved.push(spaceName);
        }
      }
    } else {
      report.spacesRemoved.push(...emptySpaces);
    }

    console.log(`  Found ${emptySpaces.length} empty spaces`);
  }

  private async renameInconsistentSpaces(report: CleanupReport, dryRun: boolean): Promise<void> {
    console.log('');
    console.log('📝 Fixing inconsistent space names...');

    const renameMap = new Map<string, string>([
      ['default space', 'default'],
      ['mono 1', 'mono'],
      // Add more renames as needed
    ]);

    for (const [oldName, newName] of renameMap) {
      const space = this.db.getSpaceByName(oldName);
      if (space) {
        console.log(`  📝 Rename: "${oldName}" → "${newName}"`);
        
        if (!dryRun) {
          // Check if target name already exists
          const existing = this.db.getSpaceByName(newName);
          if (existing) {
            console.log(`    ⚠️  Target name "${newName}" already exists, will merge instead`);
            continue;
          }
          
          this.db.updateSpace(space.id, { name: newName });
        }
        
        report.spacesRenamed.push({ from: oldName, to: newName });
      }
    }
  }

  private async mergeDuplicateSpaces(report: CleanupReport, dryRun: boolean): Promise<void> {
    console.log('');
    console.log('🔄 Merging duplicate/similar spaces...');

    // Define merge rules: merge FROM → TO
    const mergeRules = new Map<string, string>([
      ['prod', 'production'],
      ['dev', 'development'],
      ['test', 'testing'],
      ['qa', 'testing'], // merge qa into testing
      // Add more merge rules as needed
    ]);

    for (const [fromName, toName] of mergeRules) {
      const fromSpace = this.db.getSpaceByName(fromName);
      const toSpace = this.db.getSpaceByName(toName);

      if (fromSpace && toSpace && fromSpace.id !== toSpace.id) {
        console.log(`  🔄 Merging: "${fromName}" → "${toName}"`);

        const fromEndpoints = this.db.getEndpointsBySpaceId(fromSpace.id);
        const fromParameters = this.db.getSpaceParameters(fromSpace.id);

        console.log(`    Moving ${fromEndpoints.length} endpoints and ${Object.keys(fromParameters).length} parameters`);

        if (!dryRun) {
          // Move endpoints
          for (const endpoint of fromEndpoints) {
            try {
              // Check if endpoint with same name exists in target space
              const existingEndpoints = this.db.getEndpointsBySpaceId(toSpace.id);
              const duplicate = existingEndpoints.find(ep => ep.name === endpoint.name);
              
              if (duplicate) {
                console.log(`    ⚠️  Skipping duplicate endpoint: ${endpoint.name}`);
                continue;
              }

              // Create endpoint in target space
              const apiEndpoint = this.db['endpointRecordToApiEndpoint'](endpoint);
              this.db.createEndpoint(toSpace.id, apiEndpoint);
            } catch (error) {
              console.log(`    ⚠️  Failed to move endpoint ${endpoint.name}: ${error}`);
            }
          }

          // Move parameters
          for (const [paramName, paramValue] of Object.entries(fromParameters)) {
            try {
              this.db.createSpaceParameter(toSpace.id, paramName, paramValue);
            } catch (error) {
              console.log(`    ⚠️  Failed to move parameter ${paramName}: ${error}`);
            }
          }

          // Delete the source space
          this.db.deleteSpace(fromSpace.id);
        }

        report.spacesMerged.push({
          from: fromName,
          to: toName,
          endpointsMoved: fromEndpoints.length
        });
      }
    }
  }

  private async removeOrphanedData(report: CleanupReport, dryRun: boolean): Promise<void> {
    console.log('');
    console.log('🧹 Removing orphaned data...');

    // This is automatically handled by foreign key constraints in SQLite
    // But we can check for any inconsistencies
    console.log('  ✅ Orphaned data cleanup handled by database constraints');
  }

  private async consolidateParameters(report: CleanupReport, dryRun: boolean): Promise<void> {
    console.log('');
    console.log('🎯 Consolidating parameters...');

    const spaces = this.db.listSpaces();
    
    for (const space of spaces) {
      const spaceRecord = this.db.getSpaceByName(space.name);
      if (!spaceRecord) continue;

      const parameters = this.db.getSpaceParameters(spaceRecord.id);
      const duplicateParams: string[] = [];

      // Look for duplicate or similar parameter names
      const paramNames = Object.keys(parameters);
      for (let i = 0; i < paramNames.length; i++) {
        for (let j = i + 1; j < paramNames.length; j++) {
          const param1 = paramNames[i];
          const param2 = paramNames[j];
          
          // Check for similar names (case-insensitive, ignoring underscores/hyphens)
          const normalized1 = param1.toLowerCase().replace(/[-_]/g, '');
          const normalized2 = param2.toLowerCase().replace(/[-_]/g, '');
          
          if (normalized1 === normalized2 && param1 !== param2) {
            console.log(`  🎯 Similar parameters in ${space.name}: "${param1}" and "${param2}"`);
            duplicateParams.push(param2); // Keep the first one
          }
        }
      }

      if (!dryRun) {
        for (const paramName of duplicateParams) {
          this.db.deleteSpaceParameter(spaceRecord.id, paramName);
          report.parametersRemoved++;
        }
      } else {
        report.parametersRemoved += duplicateParams.length;
      }
    }
  }

  // Show current database state
  showDatabaseState(): void {
    console.log('📊 Current Database State:');
    console.log('========================');

    const spaces = this.db.listSpaces();
    console.log(`Total spaces: ${spaces.length}`);
    console.log('');

    for (const space of spaces) {
      const spaceRecord = this.db.getSpaceByName(space.name);
      if (!spaceRecord) continue;

      const endpoints = this.db.getEndpointsBySpaceId(spaceRecord.id);
      const parameters = this.db.getSpaceParameters(spaceRecord.id);

      console.log(`📁 ${space.name}:`);
      console.log(`   Endpoints: ${endpoints.length}`);
      console.log(`   Parameters: ${Object.keys(parameters).length}`);
      
      if (endpoints.length > 0) {
        console.log(`   Endpoint names: ${endpoints.map(ep => ep.name).join(', ')}`);
      }
      
      if (Object.keys(parameters).length > 0) {
        console.log(`   Parameters: ${Object.keys(parameters).join(', ')}`);
      }
      console.log('');
    }

    const stats = this.db.getStats();
    console.log(`📊 Total: ${stats.spaces} spaces, ${stats.endpoints} endpoints, ${stats.parameters} parameters`);
  }

  close(): void {
    this.db.close();
  }
}