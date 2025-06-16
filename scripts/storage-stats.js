#!/usr/bin/env node

/**
 * Display storage statistics for snapshots
 */

import { ImprovedStorageProvider } from '../dist/services/improved-storage-provider.js';
import { promises as fs } from 'fs';
import path from 'path';

async function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function displayStorageStats() {
  console.log('📊 Snapshot Storage Statistics\n');

  const spaces = ['default', 'development', 'production', 'staging'];
  let totalStats = {
    endpoints: 0,
    snapshots: 0,
    size: 0
  };

  for (const space of spaces) {
    const spacePath = space === 'default' ? './snapshots' : `./snapshots/${space}`;
    
    if (!await fs.access(spacePath).then(() => true).catch(() => false)) {
      continue;
    }

    console.log(`📁 Space: ${space}`);
    console.log('─'.repeat(40));

    const storage = new ImprovedStorageProvider(spacePath);
    
    try {
      const stats = await storage.getStorageStats();
      
      totalStats.endpoints += stats.totalEndpoints;
      totalStats.snapshots += stats.totalSnapshots;
      totalStats.size += stats.totalSize;

      console.log(`  Total Endpoints: ${stats.totalEndpoints}`);
      console.log(`  Total Snapshots: ${stats.totalSnapshots}`);
      console.log(`  Total Size: ${await formatBytes(stats.totalSize)}`);
      console.log('');

      if (stats.endpointStats.length > 0) {
        console.log('  Endpoint Details:');
        for (const epStat of stats.endpointStats) {
          console.log(`    ${epStat.endpointId}:`);
          console.log(`      Snapshots: ${epStat.snapshotCount}`);
          if (epStat.oldestSnapshot) {
            console.log(`      Oldest: ${epStat.oldestSnapshot}`);
            console.log(`      Newest: ${epStat.newestSnapshot}`);
          }
        }
      }
      console.log('');
    } catch (error) {
      console.log(`  Error reading stats: ${error.message}\n`);
    }
  }

  console.log('═'.repeat(40));
  console.log('📈 Total Summary:');
  console.log(`  Total Endpoints: ${totalStats.endpoints}`);
  console.log(`  Total Snapshots: ${totalStats.snapshots}`);
  console.log(`  Total Size: ${await formatBytes(totalStats.size)}`);
}

// Run stats
displayStorageStats().catch(console.error);