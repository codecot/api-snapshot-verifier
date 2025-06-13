# Claude Code Context - API Snapshot Verifier

## Project Overview

API Snapshot Verifier - A comprehensive tool for tracking and diffing real-time API changes with schema validation, built with a plugin-extensible architecture.

## Current Status

✅ COMPLETED: Plugin Architecture Refactoring
✅ COMPLETED: Database Migration & Cleanup System
✅ COMPLETED: React UI Bug Fixes
✅ COMPLETED: Postman Collection Import (June 2025)

Successfully refactored the monolithic CLI into a fully plugin-extensible architecture with:

- Dependency injection container
- Plugin manager with dynamic loading
- Type-safe registries for all plugin types
- Isolated command modules
- Built-in plugins for auth, formatting, storage, and diffing

**Database Migration Completed (Dec 2025):**
- Migrated from file-based JSON storage to SQLite database
- Fixed space synchronization issues that caused endpoint disappearance
- Cleaned up inconsistent and orphaned data
- Updated API routes to use DatabaseConfigManager instead of ConfigManager

**Postman Import Feature Added (June 2025):**
- Full support for Postman Collection v2.1 format
- Converts Postman requests to API endpoints
- Handles nested folders, variables, auth, and request bodies
- Seamless integration with existing OpenAPI import UI

## Architecture Overview

### Core Components

- **Application** (`src/core/application.ts`) - Main orchestrator class
- **DI Container** (`src/core/container.ts`) - Dependency injection with singleton support
- **Plugin Manager** (`src/core/plugin-manager.ts`) - Dynamic plugin lifecycle management
- **Registries** (`src/core/registry.ts`) - Generic type-safe registry system
- **Interfaces** (`src/core/interfaces.ts`) - Comprehensive interface definitions

### Plugin System

The application supports 6 plugin types:

1. **Auth Providers** - Authentication strategies
2. **Storage Providers** - Data persistence backends
3. **Diff Providers** - Comparison algorithms
4. **Output Formatters** - Result presentation formats
5. **Schema Validators** - API schema validation
6. **Commands** - CLI command implementations

### Built-in Plugins

- **Auth**: Bearer, API Key, Basic authentication
- **Formatters**: Table, JSON, Markdown output
- **Storage**: Filesystem provider
- **Diff**: JSON diff engine

### Command System

Commands are isolated modules that extend `BaseCommand` and are dynamically registered:

- `InitCommand` - Configuration initialization
- `CaptureCommand` - API snapshot capture
- `CompareCommand` - Snapshot comparison

## Directory Structure

```
src/
├── core/                    # Core architecture
│   ├── application.ts       # Main application class
│   ├── container.ts         # DI container + service keys
│   ├── interfaces.ts        # All interface definitions
│   ├── logger.ts           # Logging utilities
│   ├── plugin-manager.ts   # Plugin lifecycle management
│   └── registry.ts         # Generic registry implementation
├── commands/               # CLI command implementations
│   ├── base-command.ts     # Abstract base command
│   ├── init-command.ts     # Config initialization
│   ├── capture-command.ts  # Snapshot capture
│   └── compare-command.ts  # Snapshot comparison
├── plugins/               # Built-in plugins
│   ├── auth/             # Authentication providers
│   └── formatters/       # Output formatters
├── services/             # Core service implementations
│   ├── http-client.ts    # HTTP request handling
│   ├── storage-provider.ts # File system storage
│   ├── diff-provider.ts  # JSON diff implementation
│   └── snapshot-service.ts # Snapshot orchestration
├── utils/                # Utility functions
│   └── postman-converter.ts # Postman to endpoint converter
├── database/             # SQLite database system (NEW)
│   ├── database-service.ts        # Core database operations
│   ├── database-config-manager.ts # Database-based ConfigManager
│   ├── migration-service.ts       # JSON-to-Database migration
│   ├── cleanup-service.ts         # Database cleanup utilities
│   └── schema.sql                 # SQLite schema definition
├── web/                  # Web UI components
│   ├── frontend/         # React frontend (port 3300)
│   │   ├── src/pages/Dashboard.tsx    # Fixed React rendering errors
│   │   ├── src/pages/Endpoints.tsx    # Fixed null parameter handling
│   │   ├── src/pages/Parameters.tsx   # Space parameter management
│   │   ├── src/pages/SpaceManagement.tsx # Fixed cache issues with React Query
│   │   └── src/components/OpenAPIImport.tsx # Supports OpenAPI & Postman import
│   └── routes/           # Backend API routes (port 3301)
│       ├── config-simple.ts          # Updated to use DatabaseConfigManager
│       └── snapshots-simple.ts       # Snapshot management routes
├── cli-new.ts           # New CLI entry point
├── config.ts            # Configuration management (legacy)
├── schema-manager.ts    # OpenAPI/JSON schema handling
└── types.ts             # TypeScript type definitions
```

## Recent Changes Made

### WebSocket Configuration & Version Display (Jan 2025)

1. **Backend/Frontend Version Display**
   - Added `/api/config/version` endpoint to get backend version
   - Updated Layout component to fetch and display both frontend and backend versions
   - Versions shown as subtle badges in the app header (e.g., "Frontend v1.1.0" "Backend v1.1.0")

2. **WebSocket Configuration in Settings**
   - Added `/api/config/websocket-status` endpoint to check WebSocket availability
   - Created comprehensive WebSocket configuration section in Settings page
   - Shows real-time WebSocket status (available/unavailable, connected clients)
   - Allows users to enable/disable WebSocket for real-time updates
   - Provides fallback to polling when WebSocket is disabled or unavailable
   - Saves preference to localStorage and emits events for other components

3. **WebSocket Context Updates**
   - Modified WebSocketContext to respect user preference from localStorage
   - Only attempts connection when explicitly enabled by user
   - Properly cleans up connections when disabled
   - Listens for preference change events to enable/disable dynamically

### Database Migration & UI Fixes (Dec 2025)

1. **React UI Bug Fixes**
   - Fixed "Objects are not valid as a React child" error in Dashboard.tsx (missing Loader2 import)
   - Fixed null parameter handling in Endpoints.tsx (added proper null checks)
   - All React rendering errors resolved

2. **Database Migration System**
   - Created comprehensive SQLite schema with foreign key constraints
   - Implemented DatabaseService with full CRUD operations
   - Built DatabaseConfigManager as drop-in replacement for file-based ConfigManager
   - Successfully migrated 12 spaces and 23 endpoints from JSON files

3. **Database Cleanup System**
   - Created DatabaseCleanupService to remove inconsistent data
   - Automated cleanup script: `scripts/cleanup-database.js`
   - Removed 3 empty spaces, renamed inconsistent spaces, merged duplicates
   - Final state: 9 clean spaces with consistent naming

4. **API Route Updates**
   - Updated config-simple.ts to use DatabaseConfigManager
   - Fixed space name mapping logic ("default" space handling)
   - All API endpoints now use SQLite database instead of file storage

### Latest Session Changes (June 13, 2025)

1. **Space Parameter Cache Issues Fixed**
   - Converted SpaceManagement.tsx to use React Query for data fetching
   - Added proper cache invalidation in Parameters.tsx
   - Set staleTime to 0 to ensure fresh space statistics

2. **OpenAPI Import Fixes**
   - Replaced all ConfigManager instances with DatabaseConfigManager
   - Fixed "saveConfig is not a function" error
   - Added direct database operations for endpoint management
   - Added URL import feature with proxy endpoint to avoid CORS

3. **Postman Collection Import**
   - Created postman-converter.ts utility with comprehensive type support
   - Added file type detection (OpenAPI vs Postman)
   - Converts Postman variables {{var}} to our format {var}
   - Handles auth, headers, body, and nested folders
   - Fixed "Cannot read properties of undefined (reading 'url')" error by:
     - Extracting path portion from full URLs
     - Ensuring default server URL in generated OpenAPI schema

### Previous Plugin Architecture Fixes

- Added `auth` property to `ApiEndpoint` interface in `types.ts`
- Fixed error handling with proper `instanceof Error` checks
- Added `SNAPSHOT_SERVICE` to service keys
- Resolved operation type safety in schema manager
- Added definite assignment assertions for Application class properties

## Build & Test Status

- ✅ TypeScript compilation: `npm run build` succeeds
- ✅ CLI functionality: All commands working (`init`, `capture`, `compare`)
- ✅ Container initialization: DI system functioning correctly
- ✅ Plugin registration: Built-in plugins loading successfully

## Configuration

Current test configuration in `api-snapshot.config.json`:

```json
{
  "endpoints": [
    {
      "name": "example-api",
      "url": "https://api.example.com/health",
      "method": "GET",
      "headers": {
        "Accept": "application/json"
      }
    }
  ],
  "snapshotDir": "snapshots",
  "baselineDir": "baselines",
  "environment": "development",
  "plugins": {
    "auth": { "providers": [] },
    "formatters": { "default": "table" },
    "storage": { "provider": "filesystem" },
    "diff": { "engine": "json" }
  },
  "rules": [
    {
      "path": "response.headers.date",
      "ignore": true
    },
    {
      "path": "response.headers.x-request-id",
      "ignore": true
    }
  ]
}
```

## CLI Usage

```bash
# Main commands
node dist/cli-new.js init              # Initialize configuration
node dist/cli-new.js capture           # Capture API snapshots
node dist/cli-new.js compare            # Compare snapshots

# Debug commands
node dist/cli-new.js debug container    # Debug DI container
node dist/cli-new.js debug config      # Validate configuration

# Plugin management (placeholders for future implementation)
node dist/cli-new.js plugin list       # List installed plugins
node dist/cli-new.js registry list     # List available components
```

## Development Commands

```bash
npm run build          # TypeScript compilation
npm run dev            # Development mode (if available)  
npm run lint           # Code linting (if available)
npm run test           # Run tests (if available)
```

## Database Management Commands

```bash
# Database cleanup and maintenance
node scripts/cleanup-database.js --dry-run    # Preview cleanup changes
node scripts/cleanup-database.js --show-state # Show current state + cleanup
node scripts/cleanup-database.js             # Execute cleanup

# Migration (if needed)
node scripts/migrate-to-database.js          # Migrate JSON configs to SQLite
```

## API Endpoints

Backend server runs on **port 3301** with these key endpoints:

```bash
# Spaces management
GET  /api/config/spaces                    # List all spaces
POST /api/config/spaces                    # Create new space

# Endpoints management  
GET  /api/config/endpoints?space=default   # Get endpoints for space
POST /api/config/endpoints?space=default   # Add endpoint to space

# Configuration
GET  /api/config?space=default             # Get space configuration
PUT  /api/config?space=default             # Update space configuration

# Import/Export
POST /api/config/import-openapi?space=default # Import OpenAPI/Postman schema
GET  /api/config/fetch-openapi?url=...       # Proxy for fetching external schemas

# Parameters
GET  /api/parameters/space/:space          # Get space parameters
POST /api/parameters/space/:space          # Add space parameter
PUT  /api/parameters/space/:space/:name    # Update space parameter
DELETE /api/parameters/space/:space/:name  # Delete space parameter
```

## Next Potential Tasks

1. **Plugin Registry Implementation** - Complete the plugin/registry list commands
2. **External Plugin Loading** - Support for loading plugins from npm packages
3. **Advanced Diff Rules** - More sophisticated comparison rules
4. **Real-time API Testing** - Live endpoint monitoring
5. **Plugin Marketplace** - Community plugin system
6. **Performance Optimization** - Caching and parallel processing
7. **Documentation** - API docs and plugin development guide

## Important Notes

- **Database Storage**: Now uses SQLite database (`./snapshots.db`) instead of JSON files
- **Legacy Support**: Old ConfigManager still exists but DatabaseConfigManager is preferred
- **Space Naming**: Cleaned up inconsistent space names (no more "default space", "mono 1")
- **API Integration**: All web routes use DatabaseConfigManager for consistent data access
- **Plugin Architecture**: Supports hot-swapping plugins without restart
- **Service Keys**: Defined as symbols for type safety
- **Error Handling**: React UI errors fixed, proper null checking implemented

## Database Schema

Key tables in SQLite database:
- `spaces` - Configuration spaces (environments)
- `endpoints` - API endpoints within spaces  
- `space_parameters` - Space-level parameters for templating
- `snapshots` - Snapshot metadata and history
- `config_settings` - Global configuration settings

Foreign key constraints ensure data integrity and automatic cleanup.

## Current Database State

After cleanup (as of Dec 2025):
- **9 spaces**: default, development, mono, mynewspace, production, staging, test-consistency, testing, tuti-frutti
- **23 endpoints** total across all spaces
- **0 orphaned data** - all cleaned up
- **Consistent naming** throughout

## UI Features

### WebSocket Support
- Real-time updates via WebSocket when enabled and available
- Automatic fallback to polling when WebSocket is disabled or unavailable
- User-configurable in Settings page
- Respects firewall/proxy restrictions by allowing manual disable

## UI Roadmap

## Claude Memory

- **User Constraints**: Don't kill/start/restart node processes - user manages them
- **Multi-project Host**: User has multiple projects running simultaneously  
- **Port Configuration**: Backend on 3301, Frontend on 3300

## Troubleshooting Knowledge

### Common Issues Resolved:

1. **"Objects are not valid as a React child"** 
   - **Cause**: Missing import for React components (e.g., Loader2)
   - **Fix**: Add missing imports from lucide-react or other component libraries

2. **"All endpoints disappeared from spaces"**
   - **Cause**: File-based storage synchronization issues between spaces
   - **Fix**: Migrated to SQLite database for reliable data persistence

3. **"Space 'default' does not exist"**
   - **Cause**: Space name mapping inconsistencies ("default" vs "default space")
   - **Fix**: Database cleanup + consistent API space name handling

4. **Parameter handling errors in React**
   - **Cause**: Null/undefined parameter objects not properly checked
   - **Fix**: Add `param &&` checks before Object.entries() calls

5. **Space statistics not updating after parameter changes**
   - **Cause**: React Query cache not invalidating properly
   - **Fix**: Convert to React Query with `staleTime: 0` and manual cache invalidation

6. **"Config file not found" error during OpenAPI import**
   - **Cause**: Old file-based ConfigManager still being used
   - **Fix**: Replace with DatabaseConfigManager throughout config-simple.ts

7. **"configManager.saveConfig is not a function"**
   - **Cause**: DatabaseConfigManager doesn't have saveConfig method
   - **Fix**: Use direct database operations (createEndpoint, updateEndpoint, etc.)

8. **"Cannot read properties of undefined (reading 'url')" in Postman import**
   - **Cause**: Generated OpenAPI schema had empty servers array
   - **Fix**: Always provide default server URL and extract path from full URL

### Migration Lessons:

- **Always backup** before major data migrations
- **Use dry-run mode** for database cleanup operations  
- **Test API endpoints** after backend changes
- **Foreign key constraints** prevent orphaned data automatically
- **Space naming consistency** is critical for UI/API integration

## Quick Recovery Commands

```bash
# If database gets corrupted
node scripts/migrate-to-database.js  # Re-migrate from JSON backups

# If spaces are inconsistent  
node scripts/cleanup-database.js --dry-run  # Preview cleanup
node scripts/cleanup-database.js           # Execute cleanup

# If React UI breaks
npm run build  # Recompile TypeScript
# Check browser console for import/null reference errors
```

## Postman Import Feature Details

### How It Works
1. **File Type Detection**: Checks for `info.schema` containing "collection"
2. **Variable Conversion**: Transforms `{{variable}}` to `{variable}` format
3. **Folder Structure**: Flattens nested folders into endpoint names (e.g., "User Management/Get Users" → "user-management/get-users")
4. **Authentication Mapping**:
   - Bearer token → auth.type: 'bearer'
   - Basic auth → auth.type: 'basic'
   - API Key → auth.type: 'api-key'
5. **Request Body Handling**:
   - Raw bodies preserved with auto-detected Content-Type
   - URL-encoded and form-data converted appropriately
6. **URL Processing**:
   - Extracts path from full URLs for OpenAPI compatibility
   - Applies baseUrl if URL is relative
   - Substitutes collection variables where values are known

### Implementation Files
- `src/utils/postman-converter.ts` - Core conversion logic
- `src/web/frontend/src/components/OpenAPIImport.tsx` - UI integration
- Inline conversion in frontend to avoid circular dependencies

### Known Limitations
- YAML files not yet supported (JSON only)
- GraphQL request bodies not handled
- File uploads in form-data not preserved
- Pre-request scripts and tests ignored

## Repository Cleanup (June 13, 2025)

### Git Cleanup Completed
1. **Removed SQLite database from tracking**: 
   - `snapshots.db` removed from git (should be runtime-generated)
   - Added `*.db`, `*.sqlite`, `*.sqlite3` to .gitignore

2. **Removed test and backup files**:
   - 15 backup JSON files from migration
   - 12 config JSON files (now in database)
   - 4 test files (test-*.json, test-*.js)
   - Total: 32 files removed, 1,686 lines deleted

3. **Updated .gitignore patterns**:
   - Database files: `*.db`, `*.sqlite`, `*.sqlite3`
   - Backup directories: `backups/`, `backup/`
   - Test files: `test-*.json`, `test-*.js`, `test-*.ts`
   - Config directories: `configs/`, `config-spaces/`

4. **Properly ignored directories confirmed**:
   - `node_modules/` - All Node.js dependencies
   - `dist/` - TypeScript build output
   - `snapshots/` - Runtime API snapshots

### What Remains in Git
- Source code only
- Example configurations: `api-snapshot.ci.json`, `api-snapshot.config.example.json`
- No runtime data, test files, or database files

## Session Summary

This session focused on:
1. Fixing React Query cache issues for space parameter updates
2. Implementing Postman Collection import functionality
3. Fixing OpenAPI import to use database instead of file system
4. Cleaning up the repository from accidentally committed files
5. Comprehensive testing and bug fixes

All features are working correctly with the SQLite database backend.

## Development Roadmap (June 13, 2025)

### Immediate Improvements (High Impact, Quick Wins)

1. **YAML Support for Import** (1-2 hours)
   - Both OpenAPI and Postman imports currently only support JSON
   - Many APIs provide OpenAPI specs in YAML format
   - Add `js-yaml` parser to handle YAML files
   ```typescript
   // Simple addition to OpenAPIImport.tsx
   import yaml from 'js-yaml';
   if (uploadedFile.name.endsWith('.yaml') || uploadedFile.name.endsWith('.yml')) {
     parsedSchema = yaml.load(content);
   }
   ```

2. **Bulk Operations UI**
   - Add "Select All" / "Delete Selected" for endpoints
   - Bulk import from multiple files
   - Bulk parameter management across spaces

3. **Export Functionality** (3-4 hours)
   - Export space configuration as OpenAPI/Postman collection
   - Export snapshots as CSV/Excel for reporting
   - Backup/restore spaces to JSON files
   - Add "Export" button to spaces
   - Convert endpoints back to OpenAPI/Postman format

### Core Feature Enhancements

4. **Advanced Diff Visualization** (4-6 hours)
   - Side-by-side diff viewer in the UI
   - Highlight specific changes (not just "different")
   - Ignore rules management UI
   - Visual diff history timeline
   - Show before/after for each changed field

5. **Scheduled Snapshot Automation**
   - Cron-like scheduling for automatic captures
   - Email/webhook notifications on changes
   - Automatic baseline updates based on rules
   - Background job processing

6. **Environment Variable Management**
   - UI for managing environment variables
   - Variable inheritance between spaces
   - Secure storage for sensitive values
   - Integration with .env files

### Advanced Features

7. **API Mocking Server**
   - Use captured snapshots to create mock endpoints
   - Useful for testing when real APIs are down
   - Could integrate with Postman mock servers
   - Dynamic response generation

8. **Performance Monitoring**
   - Track response times over time
   - Alert on performance degradation
   - Response size tracking
   - Historical performance graphs
   - SLA monitoring

9. **Contract Testing**
   - Define expected schemas for responses
   - Validate snapshots against contracts
   - Generate contracts from OpenAPI specs
   - Integration with tools like Pact

### Developer Experience

10. **CLI Improvements**
    - Interactive mode for easier setup
    - Better error messages with suggestions
    - Progress bars for long operations
    - Shell completion scripts
    - `--watch` mode for continuous monitoring

11. **Plugin System Completion**
    - Finish the plugin marketplace concept
    - npm package loading for external plugins
    - Plugin development documentation
    - Example plugin templates
    - Plugin CLI generator

12. **Testing Infrastructure**
    - Add comprehensive test suite
    - CI/CD integration examples
    - GitHub Actions workflows
    - Pre-commit hooks
    - Coverage reporting

### Recommended Priority Order

**Phase 1 - Quick Wins (1-2 days)**
1. YAML Support
2. Export Functionality
3. Bulk Delete Operations

**Phase 2 - User Experience (1 week)**
4. Advanced Diff Visualization
5. Environment Variable Management
6. Scheduled Snapshots

**Phase 3 - Advanced Features (2-3 weeks)**
7. Performance Monitoring
8. API Mocking
9. Contract Testing

**Phase 4 - Platform Maturity (ongoing)**
10. Plugin System
11. CLI Improvements
12. Testing Infrastructure

This roadmap builds on the solid foundation of the database migration and provides a path to make the tool enterprise-ready while maintaining ease of use for individual developers.