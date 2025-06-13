-- API Snapshot Verifier Database Schema
-- SQLite database for storing spaces, endpoints, parameters, and configuration

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Spaces table - represents different environments/configurations
CREATE TABLE IF NOT EXISTS spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT,
  description TEXT,
  environment TEXT,
  snapshot_dir TEXT DEFAULT './snapshots',
  baseline_dir TEXT DEFAULT './baselines',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Endpoints table - API endpoints within each space
CREATE TABLE IF NOT EXISTS endpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  headers JSON,
  body TEXT,
  auth JSON,
  schema JSON,
  timeout INTEGER DEFAULT 5000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  UNIQUE(space_id, name)
);

-- Space parameters - shared parameter values across endpoints in a space
CREATE TABLE IF NOT EXISTS space_parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  pattern TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  UNIQUE(space_id, name)
);

-- Configuration settings - plugin settings, rules, etc.
CREATE TABLE IF NOT EXISTS config_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER,
  category TEXT NOT NULL, -- 'plugins', 'rules', 'general'
  key TEXT NOT NULL,
  value JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  UNIQUE(space_id, category, key)
);

-- Snapshots metadata - track snapshot files and metadata
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  endpoint_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  response_status INTEGER,
  error TEXT,
  duration INTEGER,
  file_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_endpoints_space_id ON endpoints(space_id);
CREATE INDEX IF NOT EXISTS idx_space_parameters_space_id ON space_parameters(space_id);
CREATE INDEX IF NOT EXISTS idx_config_settings_space_id ON config_settings(space_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_space_id ON snapshots(space_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_endpoint_id ON snapshots(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at);

-- Triggers to update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_spaces_updated_at 
  AFTER UPDATE ON spaces
BEGIN
  UPDATE spaces SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_endpoints_updated_at 
  AFTER UPDATE ON endpoints
BEGIN
  UPDATE endpoints SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_space_parameters_updated_at 
  AFTER UPDATE ON space_parameters
BEGIN
  UPDATE space_parameters SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_config_settings_updated_at 
  AFTER UPDATE ON config_settings
BEGIN
  UPDATE config_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Saved servers for easy switching between different backends
CREATE TABLE IF NOT EXISTS saved_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT 0,
  is_locked BOOLEAN DEFAULT 0,
  environment TEXT, -- 'development', 'staging', 'production', etc.
  auth_config JSON, -- JSON for auth settings if needed
  server_info JSON, -- Cached server info
  last_connected_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Connection history for monitoring
CREATE TABLE IF NOT EXISTS server_connection_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER REFERENCES saved_servers(id) ON DELETE CASCADE,
  connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  response_time_ms INTEGER,
  status TEXT, -- 'success', 'failed'
  error_message TEXT,
  server_version TEXT,
  spaces_count INTEGER,
  endpoints_count INTEGER
);

-- Indexes for saved servers
CREATE INDEX IF NOT EXISTS idx_saved_servers_is_default ON saved_servers(is_default);
CREATE INDEX IF NOT EXISTS idx_server_connection_history_server_id ON server_connection_history(server_id);
CREATE INDEX IF NOT EXISTS idx_server_connection_history_connected_at ON server_connection_history(connected_at);

-- Trigger to update saved_servers updated_at
CREATE TRIGGER IF NOT EXISTS update_saved_servers_updated_at 
  AFTER UPDATE ON saved_servers
BEGIN
  UPDATE saved_servers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;