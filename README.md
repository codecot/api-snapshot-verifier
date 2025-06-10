# 🧪 API Snapshot Verifier

Track & Diff Real-Time API Changes for Frontend Stability

## Overview

API Snapshot Verifier is a tool that allows frontend developers to capture, persist, and compare API responses from defined endpoints to detect unexpected backend changes that may break frontend functionality.

## Features

- 📸 **Snapshot Capture**: Capture API responses with metadata
- 🔍 **Diff Detection**: Compare current responses with baseline snapshots
- 🚨 **Breaking Change Alerts**: Identify breaking vs non-breaking changes
- 🛠️ **CLI Interface**: Easy-to-use command line tool
- ⚙️ **Configurable Rules**: Customize diff detection and severity levels
- 📁 **Storage Management**: Automatic snapshot storage and cleanup

## Installation

```bash
npm install
npm run build
```

## Quick Start

1. **Initialize configuration**:
```bash
npx api-snapshot init
```

2. **Edit the configuration** to add your API endpoints in `api-snapshot.config.json`

3. **Capture baseline snapshots**:
```bash
npx api-snapshot capture --baseline
```

4. **Compare current state with baseline**:
```bash
npx api-snapshot compare
```

## Commands

### `init`
Initialize a new configuration file.
```bash
npx api-snapshot init [--force]
```

### `capture`
Capture snapshots of configured endpoints.
```bash
npx api-snapshot capture [options]
```
Options:
- `-e, --endpoint <name>`: Capture only specific endpoint
- `-b, --baseline`: Save as baseline snapshot
- `-c, --config <path>`: Path to config file

### `compare`
Compare current API responses with baselines.
```bash
npx api-snapshot compare [options]
```
Options:
- `-e, --endpoint <name>`: Compare only specific endpoint
- `--format <type>`: Output format (table, json, text)
- `-c, --config <path>`: Path to config file

### `list`
List stored snapshots.
```bash
npx api-snapshot list [options]
```

### `clean`
Clean up old snapshots.
```bash
npx api-snapshot clean [options]
```
Options:
- `-k, --keep <count>`: Number of snapshots to keep per endpoint (default: 10)

## Configuration

The configuration file defines your API endpoints and rules:

```json
{
  "endpoints": [
    {
      "name": "users-api",
      "url": "https://api.example.com/users",
      "method": "GET",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      },
      "timeout": 5000
    }
  ],
  "snapshotDir": "./snapshots",
  "baselineDir": "./snapshots/baseline",
  "rules": [
    {
      "path": "response.data.*.id",
      "severity": "breaking"
    },
    {
      "path": "response.headers.date",
      "ignore": true
    }
  ]
}
```

### Endpoint Configuration

- `name`: Unique identifier for the endpoint
- `url`: The API endpoint URL
- `method`: HTTP method (GET, POST, PUT, DELETE, PATCH)
- `headers`: Optional headers object
- `body`: Request body for POST/PUT/PATCH requests
- `timeout`: Request timeout in milliseconds

### Diff Rules

Control how differences are detected and classified:

- `path`: JSONPath-style selector for the field
- `ignore`: Skip this field in comparisons
- `severity`: Override severity level (`breaking`, `non-breaking`, `informational`)

## Change Severity Levels

- **Breaking**: Changes that will likely break frontend code (removed fields, type changes, status code changes from 2xx to 4xx/5xx)
- **Non-breaking**: Changes that shouldn't break frontend code (new fields, improvements)
- **Informational**: Changes that are noteworthy but unlikely to impact functionality

## CI/CD Integration

Exit codes:
- `0`: No breaking changes detected
- `1`: Breaking changes detected or command failed

Example GitHub Actions workflow:
```yaml
- name: API Snapshot Check
  run: |
    npx api-snapshot compare
  env:
    API_TOKEN: ${{ secrets.API_TOKEN }}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Type check
npm run typecheck
```

## License

MIT