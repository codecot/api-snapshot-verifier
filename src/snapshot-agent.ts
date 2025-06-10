import { ConfigManager } from './config.js';
import { SnapshotCapturer } from './snapshot-capturer.js';
import { SnapshotStorage } from './snapshot-storage.js';
import { DiffEngine } from './diff-engine.js';
import { 
  Config, 
  ApiEndpoint, 
  ApiSnapshot, 
  SnapshotResult, 
  SnapshotComparison 
} from './types.js';

export class SnapshotAgent {
  private config!: Config;
  private configManager: ConfigManager;
  private capturer: SnapshotCapturer;
  private storage!: SnapshotStorage;
  private diffEngine!: DiffEngine;

  constructor(private readonly configPath: string = './api-snapshot.config.json') {
    this.configManager = new ConfigManager();
    this.capturer = new SnapshotCapturer();
  }

  async initialize(): Promise<void> {
    this.config = this.configManager.loadConfig(this.configPath);
    this.storage = new SnapshotStorage(this.config.snapshotDir);
    this.diffEngine = new DiffEngine(this.config.rules);
  }

  async captureAll(saveAsBaseline: boolean = false): Promise<SnapshotResult[]> {
    const results = await this.capturer.captureMultipleSnapshots(this.config.endpoints);
    
    for (const result of results) {
      if (result.success && result.snapshot) {
        await this.storage.saveSnapshot(result.snapshot);
        
        if (saveAsBaseline) {
          await this.storage.saveBaseline(result.snapshot, this.config.baselineDir);
        }
      }
    }
    
    return results;
  }

  async captureEndpoint(endpointName: string, saveAsBaseline: boolean = false): Promise<SnapshotResult[]> {
    const endpoint = this.findEndpoint(endpointName);
    const result = await this.capturer.captureSnapshot(endpoint);
    
    if (result.success && result.snapshot) {
      await this.storage.saveSnapshot(result.snapshot);
      
      if (saveAsBaseline) {
        await this.storage.saveBaseline(result.snapshot, this.config.baselineDir);
      }
    }
    
    return [result];
  }

  async compareAll(): Promise<(SnapshotComparison | null)[]> {
    const comparisons: (SnapshotComparison | null)[] = [];
    
    for (const endpoint of this.config.endpoints) {
      const comparison = await this.compareEndpoint(endpoint.name);
      comparisons.push(comparison);
    }
    
    return comparisons;
  }

  async compareEndpoint(endpointName: string): Promise<SnapshotComparison | null> {
    const endpoint = this.findEndpoint(endpointName);
    
    // Load baseline
    const baseline = await this.storage.loadBaseline(endpointName, this.config.baselineDir);
    if (!baseline) {
      throw new Error(`No baseline found for endpoint: ${endpointName}. Run 'capture --baseline' first.`);
    }
    
    // Capture current snapshot
    const currentResult = await this.capturer.captureSnapshot(endpoint);
    if (!currentResult.success || !currentResult.snapshot) {
      throw new Error(`Failed to capture current snapshot: ${currentResult.error}`);
    }
    
    // Compare snapshots
    const comparison = this.diffEngine.compareSnapshots(baseline, currentResult.snapshot);
    
    return comparison;
  }

  async listSnapshots(endpointName?: string): Promise<string[]> {
    return this.storage.listSnapshots(endpointName);
  }

  async cleanupSnapshots(endpointName?: string, keepCount: number = 10): Promise<number> {
    if (endpointName) {
      return this.storage.cleanupOldSnapshots(endpointName, keepCount);
    }
    
    let totalCleaned = 0;
    for (const endpoint of this.config.endpoints) {
      const cleaned = await this.storage.cleanupOldSnapshots(endpoint.name, keepCount);
      totalCleaned += cleaned;
    }
    
    return totalCleaned;
  }

  async getLatestSnapshot(endpointName: string): Promise<ApiSnapshot | null> {
    return this.storage.getLatestSnapshot(endpointName);
  }

  async getBaseline(endpointName: string): Promise<ApiSnapshot | null> {
    return this.storage.loadBaseline(endpointName, this.config.baselineDir);
  }

  getConfig(): Config {
    return this.config;
  }

  private findEndpoint(name: string): ApiEndpoint {
    const endpoint = this.config.endpoints.find(ep => ep.name === name);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${name}`);
    }
    return endpoint;
  }
}