import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import * as path from 'path';

export class DatabaseMigrationService {
  private db: Database.Database;

  constructor(dbPath: string = './snapshots.db') {
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Apply migrations to update database schema
   */
  applyMigrations() {
    console.log('🔄 Checking database migrations...');

    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Define migrations
    const migrations = [
      {
        name: 'add_capture_runs_support',
        apply: () => {
          // Check if capture_runs table exists
          const captureRunsExists = this.db.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='capture_runs'"
          ).get();

          if (!captureRunsExists) {
            console.log('📦 Creating capture_runs table...');
            this.db.exec(`
              CREATE TABLE capture_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT UNIQUE NOT NULL,
                space_id INTEGER NOT NULL,
                total_endpoints INTEGER DEFAULT 0,
                successful INTEGER DEFAULT 0,
                failed INTEGER DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
              )
            `);

            this.db.exec(`
              CREATE INDEX IF NOT EXISTS idx_capture_runs_run_id ON capture_runs(run_id);
              CREATE INDEX IF NOT EXISTS idx_capture_runs_space_id ON capture_runs(space_id);
            `);
          }

          // Check if snapshots table needs new columns
          const columns = this.db.prepare("PRAGMA table_info(snapshots)").all();
          const columnNames = columns.map((col: any) => col.name);

          if (!columnNames.includes('snapshot_id')) {
            console.log('📦 Adding snapshot_id column...');
            this.db.exec('ALTER TABLE snapshots ADD COLUMN snapshot_id TEXT');
            this.db.exec('CREATE INDEX IF NOT EXISTS idx_snapshots_snapshot_id ON snapshots(snapshot_id)');
            
            // Update existing records
            this.db.exec(`
              UPDATE snapshots 
              SET snapshot_id = substr(filename, 1, length(filename) - 5) || '_' || id
              WHERE snapshot_id IS NULL
            `);
          }

          if (!columnNames.includes('run_id')) {
            console.log('📦 Adding run_id column...');
            this.db.exec('ALTER TABLE snapshots ADD COLUMN run_id TEXT');
            this.db.exec('CREATE INDEX IF NOT EXISTS idx_snapshots_run_id ON snapshots(run_id)');
          }

          if (!columnNames.includes('filepath')) {
            console.log('📦 Adding filepath column...');
            this.db.exec('ALTER TABLE snapshots ADD COLUMN filepath TEXT');
            
            // Set filepath to filename for existing records
            this.db.exec(`
              UPDATE snapshots 
              SET filepath = filename
              WHERE filepath IS NULL
            `);
          }
        }
      },
      {
        name: 'add_saved_servers_tables',
        apply: () => {
          // Check if saved_servers table exists
          const savedServersExists = this.db.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='saved_servers'"
          ).get();

          if (!savedServersExists) {
            console.log('📦 Creating saved_servers tables...');
            this.db.exec(`
              CREATE TABLE saved_servers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                is_default INTEGER DEFAULT 0,
                is_locked INTEGER DEFAULT 0,
                environment TEXT,
                auth_config JSON,
                server_info JSON,
                last_connected_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );

              CREATE TABLE server_connection_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id INTEGER NOT NULL,
                response_time_ms INTEGER,
                status TEXT NOT NULL,
                error_message TEXT,
                server_version TEXT,
                spaces_count INTEGER,
                endpoints_count INTEGER,
                connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (server_id) REFERENCES saved_servers(id) ON DELETE CASCADE
              );

              CREATE INDEX IF NOT EXISTS idx_saved_servers_url ON saved_servers(url);
              CREATE INDEX IF NOT EXISTS idx_server_connection_history_server_id ON server_connection_history(server_id);
            `);
          }
        }
      }
    ];

    // Apply migrations
    for (const migration of migrations) {
      const applied = this.db.prepare(
        'SELECT * FROM migrations WHERE name = ?'
      ).get(migration.name);

      if (!applied) {
        console.log(`🔧 Applying migration: ${migration.name}`);
        try {
          migration.apply();
          
          // Record migration
          this.db.prepare(
            'INSERT INTO migrations (name) VALUES (?)'
          ).run(migration.name);
          
          console.log(`✅ Migration ${migration.name} applied successfully`);
        } catch (error) {
          console.error(`❌ Failed to apply migration ${migration.name}:`, error);
          throw error;
        }
      }
    }

    console.log('✅ All migrations checked/applied');
  }

  /**
   * Initialize base schema for new databases
   */
  initializeBaseSchema() {
    // Check if spaces table exists (indicator of initialized DB)
    const spacesExists = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='spaces'"
    ).get();

    if (!spacesExists) {
      console.log('📦 Initializing new database schema...');
      
      // Read and execute base schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');
      
      // Remove the capture_runs related parts from schema as they'll be added by migration
      const baseSchema = schema
        .replace(/-- Capture runs[\s\S]*?(?=-- Snapshots metadata)/g, '')
        .replace(/CREATE INDEX.*capture_runs.*?;/g, '')
        .replace(/FOREIGN KEY \(run_id\).*?$/gm, '');
      
      this.db.exec(baseSchema);
      console.log('✅ Base schema initialized');
    }
  }

  close() {
    this.db.close();
  }
}