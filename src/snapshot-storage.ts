import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ensureDir, pathExists } from 'fs-extra';
import { ApiSnapshot } from './types.js';

export class SnapshotStorage {
  constructor(private readonly baseDir: string) {}

  async saveSnapshot(snapshot: ApiSnapshot): Promise<string> {
    const fileName = this.generateFileName(snapshot);
    const filePath = join(this.baseDir, fileName);
    
    await ensureDir(dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    
    return filePath;
  }

  async saveBaseline(snapshot: ApiSnapshot, baselineDir?: string): Promise<string> {
    const dir = baselineDir || join(this.baseDir, 'baseline');
    const fileName = `${snapshot.endpoint.name}.json`;
    const filePath = join(dir, fileName);
    
    await ensureDir(dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    
    return filePath;
  }

  async loadSnapshot(filePath: string): Promise<ApiSnapshot> {
    if (!(await pathExists(filePath))) {
      throw new Error(`Snapshot file not found: ${filePath}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as ApiSnapshot;
  }

  async loadBaseline(endpointName: string, baselineDir?: string): Promise<ApiSnapshot | null> {
    const dir = baselineDir || join(this.baseDir, 'baseline');
    const filePath = join(dir, `${endpointName}.json`);
    
    if (!(await pathExists(filePath))) {
      return null;
    }

    return this.loadSnapshot(filePath);
  }

  async listSnapshots(endpointName?: string): Promise<string[]> {
    if (!(await pathExists(this.baseDir))) {
      return [];
    }

    const files = await fs.readdir(this.baseDir);
    let snapshots = files
      .filter(file => file.endsWith('.json') && !file.startsWith('.'))
      .map(file => join(this.baseDir, file));

    if (endpointName) {
      snapshots = snapshots.filter(file => 
        file.includes(`${endpointName}_`)
      );
    }

    // Sort by modification time (newest first)
    const stats = await Promise.all(
      snapshots.map(async file => ({
        file,
        mtime: (await fs.stat(file)).mtime
      }))
    );

    return stats
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .map(({ file }) => file);
  }

  async getLatestSnapshot(endpointName: string): Promise<ApiSnapshot | null> {
    const snapshots = await this.listSnapshots(endpointName);
    
    if (snapshots.length === 0) {
      return null;
    }

    return this.loadSnapshot(snapshots[0]);
  }

  async deleteSnapshot(filePath: string): Promise<void> {
    if (await pathExists(filePath)) {
      await fs.unlink(filePath);
    }
  }

  async cleanupOldSnapshots(endpointName: string, keepCount: number = 10): Promise<number> {
    const snapshots = await this.listSnapshots(endpointName);
    
    if (snapshots.length <= keepCount) {
      return 0;
    }

    const toDelete = snapshots.slice(keepCount);
    await Promise.all(toDelete.map(file => this.deleteSnapshot(file)));
    
    return toDelete.length;
  }

  private generateFileName(snapshot: ApiSnapshot): string {
    const timestamp = new Date(snapshot.timestamp)
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5); // Remove milliseconds and 'Z'
    
    return `${snapshot.endpoint.name}_${timestamp}.json`;
  }
}