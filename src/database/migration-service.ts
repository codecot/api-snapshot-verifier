import { DatabaseService } from './database-service.js';
import { ConfigManager } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';
import type { Config, ApiEndpoint } from '../types.js';

export class MigrationService {
  private db: DatabaseService;
  private configManager: ConfigManager;

  constructor(dbPath?: string) {
    this.db = new DatabaseService(dbPath);
    this.configManager = new ConfigManager();
  }

  async migrateAllData(): Promise<{
    success: boolean;
    migratedSpaces: number;
    migratedEndpoints: number;
    migratedParameters: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migratedSpaces = 0;
    let migratedEndpoints = 0;
    let migratedParameters = 0;

    console.log('🔄 Starting migration from JSON files to SQLite database...');

    try {
      // Perform migration (not using transaction for now due to complexity)
      // 1. Migrate direct config files (development.json, production.json, etc.)
      const directConfigs = this.findDirectConfigFiles();
      console.log(`📁 Found ${directConfigs.length} direct config files`);

      for (const configFile of directConfigs) {
        try {
          const result = this.migrateDirectConfigFile(configFile);
          migratedSpaces += result.spaces;
          migratedEndpoints += result.endpoints;
          migratedParameters += result.parameters;
        } catch (error) {
          const message = `Failed to migrate ${configFile}: ${error instanceof Error ? error.message : error}`;
          errors.push(message);
          console.error(`❌ ${message}`);
        }
      }

      // 2. Migrate spaces from space mapping
      const spaceMappingPath = path.join('./configs', '.space-mapping.json');
      if (fs.existsSync(spaceMappingPath)) {
        try {
          const result = this.migrateSpaceMappingFiles();
          migratedSpaces += result.spaces;
          migratedEndpoints += result.endpoints;
          migratedParameters += result.parameters;
        } catch (error) {
          const message = `Failed to migrate space mapping: ${error instanceof Error ? error.message : error}`;
          errors.push(message);
          console.error(`❌ ${message}`);
        }
      }

      // 3. Migrate space parameters from space parameter files
      try {
        const paramResult = this.migrateSpaceParameterFiles();
        migratedParameters += paramResult.parameters;
      } catch (error) {
        const message = `Failed to migrate space parameters: ${error instanceof Error ? error.message : error}`;
        errors.push(message);
        console.error(`❌ ${message}`);
      }

      console.log('✅ Migration completed successfully!');
      console.log(`📊 Migrated: ${migratedSpaces} spaces, ${migratedEndpoints} endpoints, ${migratedParameters} parameters`);

      if (errors.length > 0) {
        console.log(`⚠️  ${errors.length} errors occurred during migration`);
      }

      return {
        success: true,
        migratedSpaces,
        migratedEndpoints,
        migratedParameters,
        errors
      };

    } catch (error) {
      const message = `Migration failed: ${error instanceof Error ? error.message : error}`;
      errors.push(message);
      console.error(`❌ ${message}`);

      return {
        success: false,
        migratedSpaces,
        migratedEndpoints,
        migratedParameters,
        errors
      };
    }
  }

  private findDirectConfigFiles(): string[] {
    const configsDir = './configs';
    if (!fs.existsSync(configsDir)) return [];

    return fs.readdirSync(configsDir)
      .filter(file => file.endsWith('.json') && !file.startsWith('.') && !file.startsWith('space_'))
      .map(file => path.join(configsDir, file));
  }

  private migrateDirectConfigFile(configPath: string): {
    spaces: number;
    endpoints: number;
    parameters: number;
  } {
    const filename = path.basename(configPath, '.json');
    console.log(`📄 Migrating direct config file: ${filename}`);

    // Read and parse config
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);

    // Create or get space
    let space = this.db.getSpaceByName(filename);
    if (!space) {
      space = this.db.createSpace({
        name: filename,
        display_name: filename.charAt(0).toUpperCase() + filename.slice(1),
        environment: config.environment || filename,
        snapshot_dir: config.snapshotDir || './snapshots',
        baseline_dir: config.baselineDir || './baselines'
      });
      console.log(`  ✅ Created space: ${space.name}`);
    }

    // Migrate endpoints
    let endpointCount = 0;
    for (const endpoint of config.endpoints || []) {
      try {
        this.db.createEndpoint(space.id, endpoint);
        endpointCount++;
        console.log(`  📌 Migrated endpoint: ${endpoint.name}`);
      } catch (error) {
        console.warn(`  ⚠️  Failed to migrate endpoint ${endpoint.name}: ${error}`);
      }
    }

    return {
      spaces: space ? 1 : 0,
      endpoints: endpointCount,
      parameters: 0 // Parameters will be migrated separately
    };
  }

  private migrateSpaceMappingFiles(): {
    spaces: number;
    endpoints: number;
    parameters: number;
  } {
    console.log('🗺️  Migrating space mapping files...');

    const spaceMappingPath = path.join('./configs', '.space-mapping.json');
    const mapping = JSON.parse(fs.readFileSync(spaceMappingPath, 'utf-8'));

    let totalSpaces = 0;
    let totalEndpoints = 0;

    for (const [spaceName, configFile] of Object.entries(mapping)) {
      try {
        if (typeof configFile !== 'string') continue;

        const configPath = path.join('./configs', `${configFile}.json`);
        if (!fs.existsSync(configPath)) {
          console.warn(`  ⚠️  Config file not found: ${configPath}`);
          continue;
        }

        console.log(`📄 Migrating mapped space: ${spaceName} -> ${configFile}`);

        // Read config
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config: Config = JSON.parse(configContent);

        // Create or get space
        let space = this.db.getSpaceByName(spaceName);
        if (!space) {
          space = this.db.createSpace({
            name: spaceName,
            display_name: spaceName,
            environment: config.environment || spaceName,
            snapshot_dir: config.snapshotDir || `./snapshots/${spaceName}`,
            baseline_dir: config.baselineDir || `./baselines/${spaceName}`
          });
          totalSpaces++;
          console.log(`  ✅ Created space: ${space.name}`);
        }

        // Migrate endpoints
        let endpointCount = 0;
        for (const endpoint of config.endpoints || []) {
          try {
            this.db.createEndpoint(space.id, endpoint);
            endpointCount++;
            console.log(`  📌 Migrated endpoint: ${endpoint.name}`);
          } catch (error) {
            console.warn(`  ⚠️  Failed to migrate endpoint ${endpoint.name}: ${error}`);
          }
        }

        totalEndpoints += endpointCount;

      } catch (error) {
        console.error(`  ❌ Failed to migrate space ${spaceName}: ${error}`);
      }
    }

    return {
      spaces: totalSpaces,
      endpoints: totalEndpoints,
      parameters: 0
    };
  }

  private migrateSpaceParameterFiles(): {
    parameters: number;
  } {
    console.log('🎯 Migrating space parameter files...');

    const configsDir = './configs';
    let totalParameters = 0;

    if (!fs.existsSync(configsDir)) return { parameters: 0 };

    const parameterFiles = fs.readdirSync(configsDir)
      .filter(file => file.startsWith('space_') && file.endsWith('.json'))
      .filter(file => {
        // Check if file contains parameters
        try {
          const content = fs.readFileSync(path.join(configsDir, file), 'utf-8');
          const data = JSON.parse(content);
          return data.parameters && Object.keys(data.parameters).length > 0;
        } catch {
          return false;
        }
      });

    console.log(`📁 Found ${parameterFiles.length} space parameter files`);

    for (const file of parameterFiles) {
      try {
        const filePath = path.join(configsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Extract space name from filename pattern
        const spaceIdMatch = file.match(/space_(.+)\.json$/);
        if (!spaceIdMatch) continue;

        // Find corresponding space in database
        const spaceName = this.findSpaceNameFromParameterFile(file);
        if (!spaceName) {
          console.warn(`  ⚠️  Could not find space name for parameter file: ${file}`);
          continue;
        }

        const space = this.db.getSpaceByName(spaceName);
        if (!space) {
          console.warn(`  ⚠️  Space not found: ${spaceName}`);
          continue;
        }

        console.log(`🎯 Migrating parameters for space: ${spaceName}`);

        // Migrate parameters
        let paramCount = 0;
        for (const [paramName, paramValue] of Object.entries(data.parameters)) {
          if (typeof paramValue === 'string') {
            this.db.createSpaceParameter(space.id, paramName, paramValue);
            paramCount++;
            console.log(`  🔧 Migrated parameter: ${paramName} = ${paramValue}`);
          }
        }

        totalParameters += paramCount;

      } catch (error) {
        console.error(`  ❌ Failed to migrate parameter file ${file}: ${error}`);
      }
    }

    return { parameters: totalParameters };
  }

  private findSpaceNameFromParameterFile(filename: string): string | null {
    // Look up in space mapping to find the space name that maps to this file
    try {
      const spaceMappingPath = path.join('./configs', '.space-mapping.json');
      if (!fs.existsSync(spaceMappingPath)) return null;

      const mapping = JSON.parse(fs.readFileSync(spaceMappingPath, 'utf-8'));
      const fileId = filename.replace('.json', '');

      for (const [spaceName, mappedFile] of Object.entries(mapping)) {
        if (mappedFile === fileId) {
          return spaceName;
        }
      }
    } catch (error) {
      console.warn(`Failed to read space mapping: ${error}`);
    }

    return null;
  }

  // Create backup of current configuration
  createBackup(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `./backups/pre-migration-${timestamp}`;
    
    console.log(`💾 Creating backup at: ${backupDir}`);
    
    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups', { recursive: true });
    }
    
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Copy configs directory
    if (fs.existsSync('./configs')) {
      this.copyDirectory('./configs', path.join(backupDir, 'configs'));
    }
    
    console.log(`✅ Backup created successfully`);
    return backupDir;
  }

  private copyDirectory(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src);
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      
      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // Clean up old config files after successful migration
  cleanupOldFiles(keepBackup: boolean = true): void {
    if (keepBackup) {
      this.createBackup();
    }

    console.log('🧹 Cleaning up old configuration files...');

    // Remove space mapping file
    const spaceMappingPath = path.join('./configs', '.space-mapping.json');
    if (fs.existsSync(spaceMappingPath)) {
      fs.unlinkSync(spaceMappingPath);
      console.log('  🗑️  Removed space mapping file');
    }

    // Remove space_* files
    const configsDir = './configs';
    if (fs.existsSync(configsDir)) {
      const spaceFiles = fs.readdirSync(configsDir)
        .filter(file => file.startsWith('space_') && file.endsWith('.json'));
      
      for (const file of spaceFiles) {
        fs.unlinkSync(path.join(configsDir, file));
        console.log(`  🗑️  Removed space file: ${file}`);
      }
    }

    console.log('✅ Cleanup completed');
  }

  close(): void {
    this.db.close();
  }
}