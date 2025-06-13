-- Migration: Add saved servers tables
-- This migration adds support for saving and managing multiple backend servers

-- Check if tables already exist before creating
CREATE TABLE IF NOT EXISTS saved_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT 0,
  is_locked BOOLEAN DEFAULT 0,
  environment TEXT,
  auth_config JSON,
  server_info JSON,
  last_connected_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_connection_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER REFERENCES saved_servers(id) ON DELETE CASCADE,
  connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  response_time_ms INTEGER,
  status TEXT,
  error_message TEXT,
  server_version TEXT,
  spaces_count INTEGER,
  endpoints_count INTEGER
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_saved_servers_is_default ON saved_servers(is_default);
CREATE INDEX IF NOT EXISTS idx_server_connection_history_server_id ON server_connection_history(server_id);
CREATE INDEX IF NOT EXISTS idx_server_connection_history_connected_at ON server_connection_history(connected_at);

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_saved_servers_updated_at;
CREATE TRIGGER update_saved_servers_updated_at 
  AFTER UPDATE ON saved_servers
BEGIN
  UPDATE saved_servers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insert current server as the default if no servers exist
INSERT OR IGNORE INTO saved_servers (url, name, is_default, is_locked, environment) 
SELECT 
  'http://localhost:3301',
  'Local Development',
  1,
  0,
  'development'
WHERE NOT EXISTS (SELECT 1 FROM saved_servers WHERE is_default = 1);