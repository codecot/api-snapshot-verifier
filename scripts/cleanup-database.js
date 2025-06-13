#!/usr/bin/env node

import { DatabaseCleanupService } from '../dist/database/cleanup-service.js';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const showState = args.includes('--show-state') || args.includes('-s');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
Database Cleanup Tool
====================

Usage: node scripts/cleanup-database.js [options]

Options:
  --dry-run, -d     Show what would be changed without making any modifications
  --show-state, -s  Show current database state before cleanup
  --help, -h        Show this help message

Examples:
  node scripts/cleanup-database.js --dry-run      # Preview changes
  node scripts/cleanup-database.js --show-state  # Show current state and cleanup
  node scripts/cleanup-database.js               # Perform actual cleanup
`);
    process.exit(0);
  }

  console.log('🗃️  Database Cleanup Tool');
  console.log('========================\n');

  const cleanup = new DatabaseCleanupService();

  try {
    if (showState) {
      cleanup.showDatabaseState();
      console.log('\n');
    }

    const report = await cleanup.performCleanup(dryRun);

    if (!dryRun && (report.spacesRemoved.length > 0 || report.spacesRenamed.length > 0 || report.spacesMerged.length > 0)) {
      console.log('\n📊 Final database state:');
      console.log('========================');
      cleanup.showDatabaseState();
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    cleanup.close();
  }
}

main().catch(console.error);