import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ensureDir, pathExists } from 'fs-extra';
import { ApiSnapshot } from '../types.js';
import { StorageProvider } from '../core/interfaces.js';

/**
 * Improved storage provider that organizes snapshots by endpoint ID
 * Structure: snapshots/{space}/endpoint-{id}/run-{timestamp}.json
 */
export class ImprovedStorageProvider implements StorageProvider {
  constructor(
    private readonly snapshotDir: string = './snapshots',
    private readonly baselineDir: string = './baselines'
  ) {}

  /**
   * Generate a short unique ID for endpoints if needed
   * Format: 8 alphanumeric characters
   */
  private generateShortId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Format endpoint folder name
   * If we have a numeric ID from DB, use ep-XXX format
   * Otherwise generate a short random ID
   */
  private getEndpointFolder(endpointId: number | string, endpointName?: string): string {
    if (typeof endpointId === 'number') {
      // Format as ep-001, ep-042, etc.
      return `ep-${endpointId.toString().padStart(3, '0')}`;
    } else if (endpointId) {
      // Use provided string ID
      return `endpoint-${endpointId}`;
    } else {
      // Generate new short ID
      return `endpoint-${this.generateShortId()}`;
    }
  }

  /**
   * Generate run ID based on timestamp
   * Format: run-{timestamp}
   */
  private generateRunId(): string {
    return `run-${Date.now()}`;
  }

  private endpointIdMap: Map<string, number | string> = new Map();
  
  /**
   * Set endpoint ID for a given endpoint name
   */
  setEndpointId(endpointName: string, endpointId: number | string) {
    this.endpointIdMap.set(endpointName, endpointId);
  }
  
  /**
   * Save snapshot with improved directory structure
   */
  async saveSnapshot(
    snapshot: ApiSnapshot, 
    baseline: boolean = false
  ): Promise<string> {
    if (baseline) {
      return this.saveBaseline(snapshot);
    }

    // Get endpoint ID from our map or use the name
    const endpointId = this.endpointIdMap.get(snapshot.endpoint.name) || snapshot.endpoint.name;
    
    // Determine endpoint folder
    const endpointFolder = this.getEndpointFolder(
      endpointId,
      snapshot.endpoint.name
    );
    
    // Generate run ID
    const runId = this.generateRunId();
    const fileName = `${runId}.json`;
    
    // Build full path: snapshots/{space}/endpoint-{id}/run-{timestamp}.json
    const filePath = join(this.snapshotDir, endpointFolder, fileName);
    
    // Ensure directory exists
    await ensureDir(dirname(filePath));
    
    // Write snapshot
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    
    // Also create a metadata file for quick lookups
    const metadataPath = join(this.snapshotDir, endpointFolder, '.metadata.json');
    const metadata = {
      endpointId: endpointId,
      endpointName: snapshot.endpoint.name,
      lastSnapshot: runId,
      lastSnapshotTime: snapshot.timestamp,
      totalSnapshots: await this.countSnapshots(endpointFolder)
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    
    return filePath;
  }

  /**
   * Save baseline snapshot
   */
  async saveBaseline(snapshot: ApiSnapshot): Promise<string> {
    const fileName = `${snapshot.endpoint.name}.json`;
    const filePath = join(this.baselineDir, fileName);
    
    await ensureDir(dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    
    return filePath;
  }

  /**
   * Load snapshot from path
   */
  async loadSnapshot(filePath: string): Promise<ApiSnapshot> {
    if (!(await pathExists(filePath))) {
      throw new Error(`Snapshot file not found: ${filePath}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as ApiSnapshot;
  }

  /**
   * Load baseline for endpoint
   */
  async loadBaseline(endpointName: string): Promise<ApiSnapshot | null> {
    const filePath = join(this.baselineDir, `${endpointName}.json`);
    
    if (!(await pathExists(filePath))) {
      return null;
    }

    return this.loadSnapshot(filePath);
  }

  /**
   * List snapshots with improved structure
   */
  async listSnapshots(endpointId?: string | number): Promise<string[]> {
    if (!(await pathExists(this.snapshotDir))) {
      return [];
    }

    const snapshots: string[] = [];

    if (endpointId) {
      // List snapshots for specific endpoint
      const endpointFolder = this.getEndpointFolder(endpointId);
      const endpointPath = join(this.snapshotDir, endpointFolder);
      
      if (await pathExists(endpointPath)) {
        const files = await fs.readdir(endpointPath);
        const snapshotFiles = files
          .filter(file => file.startsWith('run-') && file.endsWith('.json'))
          .map(file => join(endpointPath, file));
        snapshots.push(...snapshotFiles);
      }
    } else {
      // List all snapshots across all endpoints
      const endpointDirs = await fs.readdir(this.snapshotDir);
      
      for (const dir of endpointDirs) {
        if (dir.startsWith('ep-') || dir.startsWith('endpoint-')) {
          const endpointPath = join(this.snapshotDir, dir);
          const stat = await fs.stat(endpointPath);
          
          if (stat.isDirectory()) {
            const files = await fs.readdir(endpointPath);
            const snapshotFiles = files
              .filter(file => file.startsWith('run-') && file.endsWith('.json'))
              .map(file => join(endpointPath, file));
            snapshots.push(...snapshotFiles);
          }
        }
      }
    }

    // Sort by timestamp (newest first)
    return snapshots.sort((a, b) => {
      const timestampA = this.extractTimestamp(a);
      const timestampB = this.extractTimestamp(b);
      return timestampB - timestampA;
    });
  }

  /**
   * Extract timestamp from run ID
   */
  private extractTimestamp(filePath: string): number {
    const match = filePath.match(/run-(\d+)\.json$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Count snapshots in endpoint folder
   */
  private async countSnapshots(endpointFolder: string): Promise<number> {
    const endpointPath = join(this.snapshotDir, endpointFolder);
    
    if (!(await pathExists(endpointPath))) {
      return 0;
    }

    const files = await fs.readdir(endpointPath);
    return files.filter(file => file.startsWith('run-') && file.endsWith('.json')).length;
  }

  /**
   * Get latest snapshot for endpoint
   */
  async getLatestSnapshot(endpointId: string | number): Promise<ApiSnapshot | null> {
    const snapshots = await this.listSnapshots(endpointId);
    
    if (snapshots.length === 0) {
      return null;
    }

    return this.loadSnapshot(snapshots[0]);
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(filePath: string): Promise<void> {
    if (await pathExists(filePath)) {
      await fs.unlink(filePath);
      
      // Check if directory is empty and remove if so
      const dir = dirname(filePath);
      const files = await fs.readdir(dir);
      const remainingSnapshots = files.filter(f => f.startsWith('run-') && f.endsWith('.json'));
      
      if (remainingSnapshots.length === 0) {
        // Remove metadata file if exists
        const metadataPath = join(dir, '.metadata.json');
        if (await pathExists(metadataPath)) {
          await fs.unlink(metadataPath);
        }
        
        // Remove empty directory
        await fs.rmdir(dir);
      }
    }
  }

  /**
   * Cleanup old snapshots - implementation of StorageProvider interface
   */
  async cleanupSnapshots(endpointName: string, keepCount: number = 10): Promise<number> {
    // Get endpoint ID from our map or use the name
    const endpointId = this.endpointIdMap.get(endpointName) || endpointName;
    return this.cleanupOldSnapshots(endpointId, keepCount);
  }
  
  /**
   * Cleanup old snapshots with per-endpoint retention (internal method)
   */
  private async cleanupOldSnapshots(endpointId: string | number, keepCount: number = 10): Promise<number> {
    const snapshots = await this.listSnapshots(endpointId);
    
    if (snapshots.length <= keepCount) {
      return 0;
    }

    const toDelete = snapshots.slice(keepCount);
    await Promise.all(toDelete.map(file => this.deleteSnapshot(file)));
    
    return toDelete.length;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalEndpoints: number;
    totalSnapshots: number;
    totalSize: number;
    endpointStats: Array<{
      endpointId: string;
      snapshotCount: number;
      oldestSnapshot: string | null;
      newestSnapshot: string | null;
    }>;
  }> {
    const stats = {
      totalEndpoints: 0,
      totalSnapshots: 0,
      totalSize: 0,
      endpointStats: [] as any[]
    };

    if (!(await pathExists(this.snapshotDir))) {
      return stats;
    }

    const endpointDirs = await fs.readdir(this.snapshotDir);
    
    for (const dir of endpointDirs) {
      if (dir.startsWith('ep-') || dir.startsWith('endpoint-')) {
        const endpointPath = join(this.snapshotDir, dir);
        const stat = await fs.stat(endpointPath);
        
        if (stat.isDirectory()) {
          stats.totalEndpoints++;
          
          const files = await fs.readdir(endpointPath);
          const snapshotFiles = files.filter(f => f.startsWith('run-') && f.endsWith('.json'));
          
          const endpointStat = {
            endpointId: dir,
            snapshotCount: snapshotFiles.length,
            oldestSnapshot: null as string | null,
            newestSnapshot: null as string | null
          };
          
          if (snapshotFiles.length > 0) {
            const sorted = snapshotFiles.sort((a, b) => {
              const timestampA = this.extractTimestamp(a);
              const timestampB = this.extractTimestamp(b);
              return timestampA - timestampB;
            });
            
            endpointStat.oldestSnapshot = sorted[0];
            endpointStat.newestSnapshot = sorted[sorted.length - 1];
            
            // Calculate total size
            for (const file of snapshotFiles) {
              const filePath = join(endpointPath, file);
              const fileStat = await fs.stat(filePath);
              stats.totalSize += fileStat.size;
            }
          }
          
          stats.totalSnapshots += snapshotFiles.length;
          stats.endpointStats.push(endpointStat);
        }
      }
    }

    return stats;
  }
}