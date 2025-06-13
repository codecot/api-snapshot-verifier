import { promises as fs } from 'fs';
import * as path from 'path';
import { StorageProvider } from '../core/interfaces.js';
import { ApiSnapshot } from '../types.js';

export class FileSystemStorageProvider implements StorageProvider {
  constructor(
    private snapshotDir: string,
    private baselineDir?: string
  ) {}

  async saveSnapshot(snapshot: ApiSnapshot, baseline = false): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Sanitize endpoint name to prevent path traversal
    const sanitizedEndpointName = snapshot.endpoint.name.replace(/[^a-zA-Z0-9_\- ]/g, '_');
    const filename = `${sanitizedEndpointName}-${timestamp}.json`;
    
    const targetDir = baseline && this.baselineDir ? this.baselineDir : this.snapshotDir;
    const filePath = path.join(targetDir, filename);
    
    await this.ensureDirectoryExists(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2));
    
    return filePath;
  }

  async loadSnapshot(filePath: string): Promise<ApiSnapshot> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load snapshot from ${filePath}: ${error instanceof Error ? error.message : error}`);
    }
  }

  async listSnapshots(endpointName?: string): Promise<string[]> {
    const snapshots: string[] = [];
    
    // List snapshots from main directory
    if (await this.directoryExists(this.snapshotDir)) {
      const mainSnapshots = await this.listSnapshotsInDirectory(this.snapshotDir, endpointName);
      snapshots.push(...mainSnapshots);
    }
    
    // List snapshots from baseline directory
    if (this.baselineDir && await this.directoryExists(this.baselineDir)) {
      const baselineSnapshots = await this.listSnapshotsInDirectory(this.baselineDir, endpointName);
      snapshots.push(...baselineSnapshots);
    }
    
    return snapshots.sort((a, b) => {
      // Sort by modification time (newest first)
      return fs.stat(b).then(statB => 
        fs.stat(a).then(statA => statB.mtime.getTime() - statA.mtime.getTime())
      ) as any;
    });
  }

  async deleteSnapshot(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete snapshot ${filePath}: ${error instanceof Error ? error.message : error}`);
    }
  }

  async cleanupSnapshots(endpointName: string, keepCount: number): Promise<number> {
    const allSnapshots = await this.listSnapshots(endpointName);
    const endpointSnapshots = allSnapshots.filter(snapshot => 
      path.basename(snapshot).startsWith(`${endpointName}-`)
    );
    
    if (endpointSnapshots.length <= keepCount) {
      return 0;
    }

    // Sort by modification time (oldest first for deletion)
    const sortedSnapshots = await Promise.all(
      endpointSnapshots.map(async snapshot => ({
        path: snapshot,
        mtime: (await fs.stat(snapshot)).mtime
      }))
    );
    
    sortedSnapshots.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
    
    const snapshotsToDelete = sortedSnapshots.slice(0, -keepCount);
    
    for (const snapshot of snapshotsToDelete) {
      await this.deleteSnapshot(snapshot.path);
    }
    
    return snapshotsToDelete.length;
  }

  private async listSnapshotsInDirectory(directory: string, endpointName?: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directory);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      if (endpointName) {
        const filteredFiles = jsonFiles.filter(file => file.startsWith(`${endpointName}-`));
        return filteredFiles.map(file => path.join(directory, file));
      }
      
      return jsonFiles.map(file => path.join(directory, file));
    } catch (error) {
      return [];
    }
  }

  private async ensureDirectoryExists(directory: string): Promise<void> {
    try {
      await fs.access(directory);
    } catch {
      await fs.mkdir(directory, { recursive: true });
    }
  }

  private async directoryExists(directory: string): Promise<boolean> {
    try {
      const stat = await fs.stat(directory);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}