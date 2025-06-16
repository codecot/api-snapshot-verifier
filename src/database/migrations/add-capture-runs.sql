-- Migration: Add capture runs and improve snapshot tracking
-- This migration adds support for grouping snapshots by run and better file organization

-- Create capture_runs table
CREATE TABLE IF NOT EXISTS capture_runs (
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
);

-- Create indexes for capture_runs
CREATE INDEX IF NOT EXISTS idx_capture_runs_run_id ON capture_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_capture_runs_space_id ON capture_runs(space_id);

-- Add new columns to snapshots table
ALTER TABLE snapshots ADD COLUMN snapshot_id TEXT;
ALTER TABLE snapshots ADD COLUMN run_id TEXT;
ALTER TABLE snapshots ADD COLUMN filepath TEXT;

-- Create index for new columns
CREATE INDEX IF NOT EXISTS idx_snapshots_snapshot_id ON snapshots(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_run_id ON snapshots(run_id);

-- Update existing snapshots to have snapshot_id (using filename as base)
UPDATE snapshots 
SET snapshot_id = substr(filename, 1, length(filename) - 5) || '_' || id
WHERE snapshot_id IS NULL;

-- Set filepath to filename for existing records
UPDATE snapshots 
SET filepath = filename
WHERE filepath IS NULL;