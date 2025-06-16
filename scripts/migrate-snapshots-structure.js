#!/usr/bin/env node

/**
 * Migration script to move existing flat snapshot structure to new organized structure
 * From: snapshots/{space}/{endpoint-name}_{timestamp}.json
 * To: snapshots/{space}/ep-{id}/run-{timestamp}.json
 */

import { promises as fs } from 'fs';
import path from 'path';
import { DatabaseService } from '../dist/database/database-service.js';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

async function log(message) {
  if (VERBOSE || DRY_RUN) {
    console.log(message);
  }
}

async function migrateSnapshots() {
  console.log('🔄 Starting snapshot structure migration...');
  if (DRY_RUN) {
    console.log('📋 DRY RUN MODE - No files will be moved');
  }

  const dbService = new DatabaseService();
  const baseDir = './snapshots';
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    // Check if snapshots directory exists
    if (!await fs.access(baseDir).then(() => true).catch(() => false)) {
      console.log('❌ No snapshots directory found');
      return;
    }

    const entries = await fs.readdir(baseDir);

    for (const entry of entries) {
      const entryPath = path.join(baseDir, entry);
      const stat = await fs.stat(entryPath);

      if (stat.isDirectory()) {
        // This is a space directory
        const spaceName = entry;
        console.log(`\n📁 Processing space: ${spaceName}`);

        // Get space from database
        const spaceRecord = dbService.getSpaceByName(spaceName === 'default' ? 'default' : spaceName);
        if (!spaceRecord) {
          console.log(`⚠️  Space '${spaceName}' not found in database, skipping...`);
          continue;
        }

        // Get all endpoints for this space
        const endpoints = dbService.getEndpointsBySpaceId(spaceRecord.id);
        const endpointMap = new Map(endpoints.map(ep => [ep.name, ep.id]));

        // Process files in space directory
        const files = await fs.readdir(entryPath);
        const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('.'));

        for (const file of jsonFiles) {
          const filePath = path.join(entryPath, file);
          
          // Skip if this is already in new structure
          if (file.startsWith('run-')) {
            await log(`✅ File already migrated: ${file}`);
            skippedCount++;
            continue;
          }

          try {
            // Parse filename to extract endpoint name
            // Format: {endpoint-name}_{timestamp}.json or {endpoint-name}_{timestamp}_failed.json
            const match = file.match(/^(.+?)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)(|_failed)\.json$/);
            if (!match) {
              await log(`⚠️  Cannot parse filename: ${file}`);
              skippedCount++;
              continue;
            }

            const endpointName = match[1];
            const timestamp = match[2];
            const isFailed = match[3] === '_failed';

            // Get endpoint ID
            const endpointId = endpointMap.get(endpointName);
            if (!endpointId) {
              await log(`⚠️  Endpoint '${endpointName}' not found in database for space '${spaceName}'`);
              skippedCount++;
              continue;
            }

            // Create new directory structure
            const endpointFolder = `ep-${endpointId.toString().padStart(3, '0')}`;
            const newDir = path.join(entryPath, endpointFolder);
            
            // Convert timestamp to milliseconds
            const date = new Date(timestamp.replace(/-/g, ':').replace('T', ' ').replace('Z', ''));
            const runId = `run-${date.getTime()}${isFailed ? '-failed' : ''}`;
            const newFileName = `${runId}.json`;
            const newPath = path.join(newDir, newFileName);

            if (DRY_RUN) {
              console.log(`Would move: ${filePath}`);
              console.log(`        to: ${newPath}`);
            } else {
              // Create directory if it doesn't exist
              await fs.mkdir(newDir, { recursive: true });
              
              // Move file
              await fs.rename(filePath, newPath);
              await log(`✅ Moved: ${file} -> ${endpointFolder}/${newFileName}`);
            }

            migratedCount++;
          } catch (error) {
            console.error(`❌ Error processing ${file}:`, error.message);
            errorCount++;
          }
        }
      } else if (entry.endsWith('.json')) {
        // Legacy file in root directory
        console.log(`⚠️  Found legacy file in root: ${entry}`);
        // Handle if needed
      }
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Migrated: ${migratedCount} files`);
    console.log(`⏭️  Skipped: ${skippedCount} files`);
    console.log(`❌ Errors: ${errorCount} files`);

  } finally {
    dbService.close();
  }
}

// Run migration
migrateSnapshots().catch(console.error);