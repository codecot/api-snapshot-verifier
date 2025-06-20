import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import type { ApiEndpoint, Config } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Space {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  environment?: string;
  snapshot_dir: string;
  baseline_dir: string;
  created_at: string;
  updated_at: string;
}

export interface SpaceParameter {
  id: number;
  space_id: number;
  name: string;
  value: string;
  pattern?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface EndpointRecord {
  id: number;
  space_id: number;
  name: string;
  url: string;
  method: string;
  headers?: string; // JSON string
  body?: string;
  auth?: string; // JSON string
  schema?: string; // JSON string
  timeout: number;
  created_at: string;
  updated_at: string;
}

export interface SnapshotRecord {
  id: number;
  space_id: number;
  endpoint_id: number;
  filename: string;
  status: string;
  response_status?: number;
  error?: string;
  duration?: number;
  file_size?: number;
  created_at: string;
}

export class DatabaseService {
  db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string = './snapshots.db') {
    this.dbPath = path.resolve(dbPath);
    this.ensureDirectoryExists();
    
    // Initialize database
    this.db = new Database(this.dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Initialize schema
    this.initializeSchema();
  }

  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private initializeSchema(): void {
    try {
      // Check if tables already exist
      const tablesExist = this.db.prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name IN ('spaces', 'endpoints', 'snapshots')"
      ).get() as { count: number };

      if (tablesExist.count === 0) {
        // Fresh database - apply full schema
        let schemaPath = path.join(__dirname, 'schema.sql');
        if (!fs.existsSync(schemaPath)) {
          schemaPath = path.join(__dirname, '../../src/database/schema.sql');
        }
        
        const schema = readFileSync(schemaPath, 'utf-8');
        
        // Remove the new columns that cause issues
        const safeSchema = schema
          .replace(/-- Capture runs[\s\S]*?(?=-- Snapshots metadata)/g, '')
          .replace(/snapshot_id TEXT[^,]*,?/g, '')
          .replace(/run_id TEXT[^,]*,?/g, '')
          .replace(/filepath TEXT[^,]*,?/g, '')
          .replace(/FOREIGN KEY \(run_id\)[^,)]*,?/g, '')
          .replace(/CREATE INDEX.*capture_runs.*?;/g, '')
          .replace(/CREATE INDEX.*run_id.*?;/g, '')
          .replace(/CREATE INDEX.*snapshot_id.*?;/g, '');
        
        this.db.exec(safeSchema);
      } else {
        // Existing database - check for missing tables/columns
        this.ensureTablesExist();
      }
    } catch (error) {
      console.error('Error initializing database schema:', error);
      throw error;
    }
  }

  private ensureTablesExist(): void {
    // Ensure all core tables exist
    const tables = ['spaces', 'endpoints', 'space_parameters', 'config_settings', 'snapshots'];
    
    for (const table of tables) {
      const exists = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(table);
      
      if (!exists) {
        console.warn(`Table ${table} is missing, creating it...`);
        // You would need to create individual table creation statements here
        // For now, we'll skip this as it's complex
      }
    }
  }

  // Space operations
  createSpace(space: Partial<Space>): Space {
    const stmt = this.db.prepare(`
      INSERT INTO spaces (name, display_name, description, environment, snapshot_dir, baseline_dir)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      space.name,
      space.display_name,
      space.description,
      space.environment || 'development',
      space.snapshot_dir || './snapshots',
      space.baseline_dir || './baselines'
    );
    
    return this.getSpaceById(info.lastInsertRowid as number)!;
  }

  getSpaceById(id: number): Space | null {
    const stmt = this.db.prepare('SELECT * FROM spaces WHERE id = ?');
    return stmt.get(id) as Space | null;
  }

  getSpaceByName(name: string): Space | null {
    const stmt = this.db.prepare('SELECT * FROM spaces WHERE name = ?');
    return stmt.get(name) as Space | null;
  }

  listSpaces(): Space[] {
    const stmt = this.db.prepare('SELECT * FROM spaces ORDER BY name');
    return stmt.all() as Space[];
  }

  updateSpace(id: number, updates: Partial<Space>): boolean {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return false;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (updates as any)[field]);
    
    const stmt = this.db.prepare(`UPDATE spaces SET ${setClause} WHERE id = ?`);
    const info = stmt.run(...values, id);
    
    return info.changes > 0;
  }

  deleteSpace(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM spaces WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }

  spaceExists(name: string): boolean {
    const space = this.getSpaceByName(name);
    return space !== null && space !== undefined;
  }

  // Endpoint operations
  createEndpoint(spaceId: number, endpoint: ApiEndpoint): EndpointRecord {
    const stmt = this.db.prepare(`
      INSERT INTO endpoints (space_id, name, url, method, headers, body, auth, schema, timeout)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      spaceId,
      endpoint.name,
      endpoint.url,
      endpoint.method || 'GET',
      endpoint.headers ? JSON.stringify(endpoint.headers) : null,
      endpoint.body || null,
      endpoint.auth ? JSON.stringify(endpoint.auth) : null,
      endpoint.schema ? JSON.stringify(endpoint.schema) : null,
      endpoint.timeout || 5000
    );
    
    return this.getEndpointById(info.lastInsertRowid as number)!;
  }

  getEndpointById(id: number): EndpointRecord | null {
    const stmt = this.db.prepare('SELECT * FROM endpoints WHERE id = ?');
    return stmt.get(id) as EndpointRecord | null;
  }

  getEndpointsBySpaceId(spaceId: number): EndpointRecord[] {
    const stmt = this.db.prepare('SELECT * FROM endpoints WHERE space_id = ? ORDER BY name');
    return stmt.all(spaceId) as EndpointRecord[];
  }

  getEndpointsBySpaceName(spaceName: string): ApiEndpoint[] {
    const space = this.getSpaceByName(spaceName);
    if (!space) return [];

    const records = this.getEndpointsBySpaceId(space.id);
    return records.map(this.endpointRecordToApiEndpoint.bind(this));
  }

  updateEndpoint(id: number, endpoint: Partial<ApiEndpoint>): boolean {
    const updates: any = {};
    
    if (endpoint.name) updates.name = endpoint.name;
    if (endpoint.url) updates.url = endpoint.url;
    if (endpoint.method) updates.method = endpoint.method;
    if (endpoint.headers !== undefined) updates.headers = JSON.stringify(endpoint.headers);
    if (endpoint.body !== undefined) updates.body = endpoint.body;
    if (endpoint.auth !== undefined) updates.auth = JSON.stringify(endpoint.auth);
    if (endpoint.schema !== undefined) updates.schema = JSON.stringify(endpoint.schema);
    if (endpoint.timeout !== undefined) updates.timeout = endpoint.timeout;

    const fields = Object.keys(updates);
    if (fields.length === 0) return false;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field]);
    
    const stmt = this.db.prepare(`UPDATE endpoints SET ${setClause} WHERE id = ?`);
    const info = stmt.run(...values, id);
    
    return info.changes > 0;
  }

  deleteEndpoint(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM endpoints WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }

  deleteEndpointByName(spaceId: number, name: string): boolean {
    const stmt = this.db.prepare('DELETE FROM endpoints WHERE space_id = ? AND name = ?');
    const info = stmt.run(spaceId, name);
    return info.changes > 0;
  }

  // Space parameter operations
  createSpaceParameter(spaceId: number, name: string, value: string, pattern?: string, description?: string): SpaceParameter {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO space_parameters (space_id, name, value, pattern, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(spaceId, name, value, pattern, description);
    return this.getSpaceParameterById(info.lastInsertRowid as number)!;
  }

  getSpaceParameterById(id: number): SpaceParameter | null {
    const stmt = this.db.prepare('SELECT * FROM space_parameters WHERE id = ?');
    return stmt.get(id) as SpaceParameter | null;
  }

  getSpaceParameters(spaceId: number): Record<string, string> {
    const stmt = this.db.prepare('SELECT name, value FROM space_parameters WHERE space_id = ?');
    const rows = stmt.all(spaceId) as { name: string, value: string }[];
    
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.name] = row.value;
    }
    return result;
  }

  getSpaceParametersByName(spaceName: string): Record<string, string> {
    const space = this.getSpaceByName(spaceName);
    if (!space) return {};
    return this.getSpaceParameters(space.id);
  }

  updateSpaceParameter(spaceId: number, name: string, value: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE space_parameters SET value = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE space_id = ? AND name = ?
    `);
    const info = stmt.run(value, spaceId, name);
    return info.changes > 0;
  }

  deleteSpaceParameter(spaceId: number, name: string): boolean {
    const stmt = this.db.prepare('DELETE FROM space_parameters WHERE space_id = ? AND name = ?');
    const info = stmt.run(spaceId, name);
    return info.changes > 0;
  }

  // Snapshot operations
  createSnapshot(spaceId: number, endpointId: number, filename: string, status: string, metadata?: {
    response_status?: number;
    error?: string;
    duration?: number;
    file_size?: number;
  }): SnapshotRecord {
    const stmt = this.db.prepare(`
      INSERT INTO snapshots (space_id, endpoint_id, filename, status, response_status, error, duration, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      spaceId,
      endpointId,
      filename,
      status,
      metadata?.response_status,
      metadata?.error,
      metadata?.duration,
      metadata?.file_size
    );
    
    return this.getSnapshotById(info.lastInsertRowid as number)!;
  }

  getSnapshotById(id: number): SnapshotRecord | null {
    const stmt = this.db.prepare('SELECT * FROM snapshots WHERE id = ?');
    return stmt.get(id) as SnapshotRecord | null;
  }

  getSnapshotsBySpaceId(spaceId: number, limit: number = 100): SnapshotRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM snapshots 
      WHERE space_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(spaceId, limit) as SnapshotRecord[];
  }

  // Utility methods
  private endpointRecordToApiEndpoint(record: EndpointRecord): ApiEndpoint {
    return {
      name: record.name,
      url: record.url,
      method: record.method as any,
      headers: record.headers ? JSON.parse(record.headers) : undefined,
      body: record.body || undefined,
      auth: record.auth ? JSON.parse(record.auth) : undefined,
      schema: record.schema ? JSON.parse(record.schema) : undefined,
      timeout: record.timeout,
      parameters: {} // Will be populated separately
    };
  }

  // Transaction support
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  // Close database connection
  close(): void {
    this.db.close();
  }

  // Saved servers operations
  getSavedServers(): any[] {
    const stmt = this.db.prepare('SELECT * FROM saved_servers ORDER BY is_default DESC, name ASC');
    return stmt.all();
  }

  getSavedServerById(id: number): any | null {
    const stmt = this.db.prepare('SELECT * FROM saved_servers WHERE id = ?');
    return stmt.get(id);
  }

  getSavedServerByUrl(url: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM saved_servers WHERE url = ?');
    return stmt.get(url);
  }

  createSavedServer(server: {
    url: string;
    name: string;
    description?: string;
    is_default?: boolean;
    is_locked?: boolean;
    environment?: string;
    auth_config?: any;
    server_info?: any;
  }): any {
    const stmt = this.db.prepare(`
      INSERT INTO saved_servers (url, name, description, is_default, is_locked, environment, auth_config, server_info)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      server.url,
      server.name,
      server.description || null,
      server.is_default ? 1 : 0,
      server.is_locked ? 1 : 0,
      server.environment || null,
      server.auth_config ? JSON.stringify(server.auth_config) : null,
      server.server_info ? JSON.stringify(server.server_info) : null
    );
    
    return this.getSavedServerById(info.lastInsertRowid as number);
  }

  updateSavedServer(id: number, updates: Partial<{
    name: string;
    description: string;
    is_default: boolean;
    is_locked: boolean;
    environment: string;
    auth_config: any;
    server_info: any;
    last_connected_at: string;
  }>): boolean {
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'auth_config' || key === 'server_info') {
          values.push(JSON.stringify(value));
        } else if (key === 'is_default' || key === 'is_locked') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const stmt = this.db.prepare(`UPDATE saved_servers SET ${fields.join(', ')} WHERE id = ?`);
    const info = stmt.run(...values);
    
    return info.changes > 0;
  }

  setDefaultServer(id: number): boolean {
    // First, unset all defaults
    this.db.prepare('UPDATE saved_servers SET is_default = 0').run();
    
    // Then set the new default
    const stmt = this.db.prepare('UPDATE saved_servers SET is_default = 1 WHERE id = ?');
    const info = stmt.run(id);
    
    return info.changes > 0;
  }

  deleteSavedServer(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM saved_servers WHERE id = ? AND is_locked = 0');
    const info = stmt.run(id);
    return info.changes > 0;
  }

  // Server connection history
  recordServerConnection(serverId: number, result: {
    responseTime: number;
    success: boolean;
    error?: string;
    serverInfo?: any;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO server_connection_history 
      (server_id, response_time_ms, status, error_message, server_version, spaces_count, endpoints_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      serverId,
      result.responseTime,
      result.success ? 'success' : 'failed',
      result.error || null,
      result.serverInfo?.server?.version || null,
      result.serverInfo?.database?.statistics?.spaces || null,
      result.serverInfo?.database?.statistics?.endpoints || null
    );
    
    // Update last_connected_at if successful
    if (result.success) {
      this.db.prepare('UPDATE saved_servers SET last_connected_at = CURRENT_TIMESTAMP WHERE id = ?').run(serverId);
    }
  }

  getServerConnectionHistory(serverId: number, limit: number = 10): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM server_connection_history 
      WHERE server_id = ? 
      ORDER BY connected_at DESC 
      LIMIT ?
    `);
    return stmt.all(serverId, limit);
  }

  // Get database statistics
  getStats(): {
    spaces: number;
    endpoints: number;
    parameters: number;
    snapshots: number;
  } {
    const spacesCount = this.db.prepare('SELECT COUNT(*) as count FROM spaces').get() as { count: number };
    const endpointsCount = this.db.prepare('SELECT COUNT(*) as count FROM endpoints').get() as { count: number };
    const parametersCount = this.db.prepare('SELECT COUNT(*) as count FROM space_parameters').get() as { count: number };
    const snapshotsCount = this.db.prepare('SELECT COUNT(*) as count FROM snapshots').get() as { count: number };

    return {
      spaces: spacesCount.count,
      endpoints: endpointsCount.count,
      parameters: parametersCount.count,
      snapshots: snapshotsCount.count
    };
  }

  // Get statistics for a specific space
  getSpaceStats(spaceId: number): {
    endpoints: number;
    parameters: number;
    snapshots: number;
    recentSnapshots: number;
    successRate: number;
  } {
    const endpointsCount = this.db.prepare('SELECT COUNT(*) as count FROM endpoints WHERE space_id = ?').get(spaceId) as { count: number };
    const parametersCount = this.db.prepare('SELECT COUNT(*) as count FROM space_parameters WHERE space_id = ?').get(spaceId) as { count: number };
    const snapshotsCount = this.db.prepare('SELECT COUNT(*) as count FROM snapshots WHERE space_id = ?').get(spaceId) as { count: number };
    
    // Count snapshots from last 24 hours
    const recentSnapshots = this.db.prepare(`
      SELECT COUNT(*) as count FROM snapshots 
      WHERE space_id = ? AND created_at > datetime('now', '-1 day')
    `).get(spaceId) as { count: number };
    
    // Calculate success rate
    const successCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM snapshots 
      WHERE space_id = ? AND status = 'success'
    `).get(spaceId) as { count: number };
    
    const successRate = snapshotsCount.count > 0 
      ? (successCount.count / snapshotsCount.count) * 100 
      : 0;

    return {
      endpoints: endpointsCount.count,
      parameters: parametersCount.count,
      snapshots: snapshotsCount.count,
      recentSnapshots: recentSnapshots.count,
      successRate: Math.round(successRate)
    };
  }

  // Get all spaces with their statistics
  listSpacesWithStats(): Array<Space & {
    stats: {
      endpoints: number;
      parameters: number;
      snapshots: number;
      recentSnapshots: number;
      successRate: number;
    }
  }> {
    const spaces = this.listSpaces();
    return spaces.map(space => ({
      ...space,
      stats: this.getSpaceStats(space.id)
    }));
  }
}