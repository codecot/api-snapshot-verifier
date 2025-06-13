#!/usr/bin/env node

import { MigrationService } from '../database/migration-service.js';
import { DatabaseService } from '../database/database-service.js';

async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes('--cleanup');
  const dryRun = args.includes('--dry-run');
  const dbPath = args.find(arg => arg.startsWith('--db='))?.split('=')[1] || './snapshots.db';

  console.log('🔄 API Snapshot Verifier - Database Migration');
  console.log('============================================');
  console.log(`Database path: ${dbPath}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Cleanup after migration: ${shouldCleanup}`);
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('');
  }

  const migration = new MigrationService(dbPath);

  try {
    // Create backup before migration
    if (!dryRun) {
      console.log('💾 Creating backup of current configuration...');
      const backupPath = migration.createBackup();
      console.log(`✅ Backup created at: ${backupPath}`);
      console.log('');
    }

    // Show current database stats (if database exists)
    try {
      const db = new DatabaseService(dbPath);
      const initialStats = db.getStats();
      console.log('📊 Current database state:');
      console.log(`  Spaces: ${initialStats.spaces}`);
      console.log(`  Endpoints: ${initialStats.endpoints}`);
      console.log(`  Parameters: ${initialStats.parameters}`);
      console.log(`  Snapshots: ${initialStats.snapshots}`);
      console.log('');
      db.close();
    } catch (error) {
      console.log('📊 Database does not exist yet - will be created');
      console.log('');
    }

    if (dryRun) {
      console.log('🔍 DRY RUN - Would perform the following actions:');
      console.log('  1. Initialize SQLite database schema');
      console.log('  2. Migrate direct config files (development.json, etc.)');
      console.log('  3. Migrate space mapping files');
      console.log('  4. Migrate space parameter files');
      if (shouldCleanup) {
        console.log('  5. Clean up old configuration files');
      }
      console.log('');
      console.log('To perform actual migration, run without --dry-run flag');
      return;
    }

    // Perform migration
    const result = await migration.migrateAllData();

    // Show results
    console.log('');
    console.log('📊 Migration Results:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Migrated Spaces: ${result.migratedSpaces}`);
    console.log(`  Migrated Endpoints: ${result.migratedEndpoints}`);
    console.log(`  Migrated Parameters: ${result.migratedParameters}`);
    
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
      console.log('');
      console.log('❌ Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Show final database stats
    const db = new DatabaseService(dbPath);
    const finalStats = db.getStats();
    console.log('');
    console.log('📊 Final database state:');
    console.log(`  Spaces: ${finalStats.spaces}`);
    console.log(`  Endpoints: ${finalStats.endpoints}`);
    console.log(`  Parameters: ${finalStats.parameters}`);
    console.log(`  Snapshots: ${finalStats.snapshots}`);
    db.close();

    if (result.success && shouldCleanup) {
      console.log('');
      console.log('🧹 Cleaning up old configuration files...');
      migration.cleanupOldFiles(false); // Don't create another backup
      console.log('✅ Cleanup completed');
    }

    console.log('');
    if (result.success) {
      console.log('🎉 Migration completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Update your application to use DatabaseConfigManager');
      console.log('2. Test the new database-backed configuration');
      console.log('3. If everything works, you can remove the old config files');
    } else {
      console.log('❌ Migration failed. Check the errors above.');
      console.log('Your original configuration files are still intact.');
    }

  } catch (error) {
    console.error('💥 Migration failed with error:', error);
    process.exit(1);
  } finally {
    migration.close();
  }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('API Snapshot Verifier - Database Migration Tool');
  console.log('');
  console.log('Usage: node migrate-to-database.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run        Show what would be migrated without making changes');
  console.log('  --cleanup        Remove old configuration files after successful migration');
  console.log('  --db=<path>      Specify database file path (default: ./snapshots.db)');
  console.log('  --help, -h       Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node migrate-to-database.js --dry-run');
  console.log('  node migrate-to-database.js --db=./data/snapshots.db');
  console.log('  node migrate-to-database.js --cleanup');
  process.exit(0);
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});