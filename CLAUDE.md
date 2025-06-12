# Claude Code Context - API Snapshot Verifier

## Project Overview
API Snapshot Verifier - A comprehensive tool for tracking and diffing real-time API changes with schema validation, built with a plugin-extensible architecture.

## Current Status
**✅ COMPLETED: Plugin Architecture Refactoring**

Successfully refactored the monolithic CLI into a fully plugin-extensible architecture with:
- Dependency injection container
- Plugin manager with dynamic loading
- Type-safe registries for all plugin types
- Isolated command modules
- Built-in plugins for auth, formatting, storage, and diffing

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
├── cli-new.ts           # New CLI entry point
├── config.ts            # Configuration management
├── schema-manager.ts    # OpenAPI/JSON schema handling
└── types.ts             # TypeScript type definitions
```

## Recent Changes Made

### Fixed Issues
1. **Service Registration Conflict** - Resolved duplicate STORAGE service key registration
2. **TypeScript Compilation** - Fixed all type errors in SchemaManager and Application
3. **Error Handling** - Proper error type checking throughout codebase
4. **Missing Dependencies** - Added `yaml` package for OpenAPI schema support

### Key Fixes Applied
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

## Next Potential Tasks
1. **Plugin Registry Implementation** - Complete the plugin/registry list commands
2. **External Plugin Loading** - Support for loading plugins from npm packages
3. **Advanced Diff Rules** - More sophisticated comparison rules
4. **Real-time API Testing** - Live endpoint monitoring
5. **Plugin Marketplace** - Community plugin system
6. **Performance Optimization** - Caching and parallel processing
7. **Documentation** - API docs and plugin development guide

## Important Notes
- The old CLI (`src/cli.ts`) still exists but new development uses `src/cli-new.ts`
- All git files are untracked and ready for commit when ready
- The architecture supports hot-swapping plugins without restart
- Service keys are defined as symbols for type safety
- Plugin context provides access to container, config, and logger

## Git Status
```
Untracked files:
  src/cli-new.ts
  src/commands/
  src/core/
  src/plugins/
  src/services/
```

Ready for commit when the refactoring is complete and tested.

## UI Roadmap