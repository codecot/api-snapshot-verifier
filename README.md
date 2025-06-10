# 🧪 API Snapshot Verifier

Track & Diff Real-Time API Changes for Frontend Stability with Schema Validation

## Overview

API Snapshot Verifier is a comprehensive tool that allows frontend developers to capture, persist, and compare API responses from defined endpoints to detect unexpected backend changes that may break frontend functionality. Now includes full OpenAPI schema validation and contract testing capabilities.

## Features

### 🔧 Core Functionality
- 📸 **Snapshot Capture**: Capture API responses with metadata
- 🔍 **Diff Detection**: Compare current responses with baseline snapshots
- 🚨 **Breaking Change Alerts**: Identify breaking vs non-breaking changes
- 🛠️ **CLI Interface**: Easy-to-use command line tool
- ⚙️ **Configurable Rules**: Customize diff detection and severity levels
- 📁 **Storage Management**: Automatic snapshot storage and cleanup

### 📋 Schema Integration
- 🔗 **OpenAPI Import**: Import OpenAPI 3.x specs and auto-generate endpoint configurations
- ✅ **Request Validation**: Validate request bodies against schema before sending
- ✅ **Response Validation**: Validate API responses against expected schema
- 🔍 **Schema-Aware Diffing**: Detect breaking changes based on schema contracts
- 📊 **Contract Testing**: Ensure API responses comply with defined contracts

### 🔄 Workflow Management
- 🤝 **Interactive Approval**: Review and approve/reject changes interactively
- 🚀 **Auto-Approval**: Auto-approve non-breaking changes
- 📜 **Audit Trail**: Complete change history with approval reasons
- 🔒 **Secure Authentication**: Bearer tokens, API keys, and custom headers

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Option 1: Manual Configuration

1. **Initialize configuration**:
    ```bash
    npx api-snapshot init
    ```

2. **Add endpoints interactively**:
    ```bash
    npx api-snapshot add
    ```

3. **Capture baseline snapshots**:
    ```bash
    npx api-snapshot capture --baseline
    ```

4. **Compare current state with baseline**:
    ```bash
    npx api-snapshot compare
    ```

### Option 2: Schema-First Approach

1. **Import OpenAPI schema**:
    ```bash
    npx api-snapshot import-schema -s openapi.yaml --base-url https://api.example.com
    ```

2. **Capture baseline with validation**:
    ```bash
    npx api-snapshot capture --baseline
    ```

3. **Compare with schema validation**:
    ```bash
    npx api-snapshot compare --details
    ```

4. **Validate schema compliance**:
    ```bash
    npx api-snapshot validate-schema
    ```

## Commands

### Basic Operations

#### `init`
Initialize a new configuration file.
```bash
npx api-snapshot init [--force]
```

#### `add`
Add a new endpoint to configuration interactively.
```bash
npx api-snapshot add [options]
```
Options:
- `-n, --name <name>`: Endpoint name
- `-u, --url <url>`: Endpoint URL
- `-m, --method <method>`: HTTP method
- `--auth-token`: Add Authorization Bearer token
- `--api-key <header>`: Add custom API key header

#### `capture`
Capture snapshots of configured endpoints.
```bash
npx api-snapshot capture [options]
```
Options:
- `-e, --endpoint <name>`: Capture only specific endpoint
- `-b, --baseline`: Save as baseline snapshot
- `-c, --config <path>`: Path to config file

#### `compare`
Compare current API responses with baselines.
```bash
npx api-snapshot compare [options]
```
Options:
- `-e, --endpoint <name>`: Compare only specific endpoint
- `--format <type>`: Output format (table, json, text)
- `--details`: Show detailed diff with old/new values
- `--only-breaking`: Show only breaking changes
- `--interactive`: Interactive approval workflow
- `--auto-approve`: Auto-approve non-breaking changes
- `--save-diff <path>`: Save detailed diff to JSON file

#### `list`
List stored snapshots.
```bash
npx api-snapshot list [options]
```

#### `clean`
Clean up old snapshots.
```bash
npx api-snapshot clean [options]
```
Options:
- `-k, --keep <count>`: Number of snapshots to keep per endpoint (default: 10)

### Schema Operations

#### `import-schema`
Import API schema and generate endpoint configurations.
```bash
npx api-snapshot import-schema [options]
```
Options:
- `-s, --schema <path>`: Path to OpenAPI/JSON Schema file (required)
- `-t, --type <type>`: Schema type: openapi, json-schema (default: openapi)
- `-o, --output <path>`: Output configuration file path
- `--base-url <url>`: Base URL for generated endpoints
- `--merge`: Merge with existing configuration

#### `validate-schema`
Validate current snapshots against their schemas.
```bash
npx api-snapshot validate-schema [options]
```
Options:
- `-e, --endpoint <name>`: Validate specific endpoint only
- `--request`: Validate request schemas only
- `--response`: Validate response schemas only

### Workflow Management

#### `history`
View change approval history and summary.
```bash
npx api-snapshot history [options]
```
Options:
- `-e, --endpoint <name>`: Show history for specific endpoint
- `--days <number>`: Show changes from last N days (default: 30)
- `--status <status>`: Filter by status: approved, rejected, pending
- `--summary`: Show summary only

## Configuration

### Basic Configuration

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

### Schema-Enhanced Configuration

Configuration with OpenAPI schema validation:

```json
{
  "endpoints": [
    {
      "name": "create-user",
      "url": "https://api.example.com/users",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}",
        "Content-Type": "application/json"
      },
      "body": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "schema": {
        "type": "openapi",
        "source": "./api-spec.yaml",
        "operationId": "createUser",
        "requestValidation": true,
        "responseValidation": true
      }
    }
  ],
  "snapshotDir": "./snapshots",
  "baselineDir": "./snapshots/baseline"
}
```

### Endpoint Configuration

- `name`: Unique identifier for the endpoint
- `url`: The API endpoint URL
- `method`: HTTP method (GET, POST, PUT, DELETE, PATCH)
- `headers`: Optional headers object
- `body`: Request body for POST/PUT/PATCH requests
- `timeout`: Request timeout in milliseconds
- `schema`: Schema validation configuration (optional)

### Schema Configuration

- `type`: Schema type (openapi, json-schema, graphql, custom)
- `source`: Path to schema file
- `operationId`: Specific operation ID for OpenAPI schemas
- `requestValidation`: Enable request body validation
- `responseValidation`: Enable response validation

### Diff Rules

Control how differences are detected and classified:

- `path`: JSONPath-style selector for the field
- `ignore`: Skip this field in comparisons
- `severity`: Override severity level (`breaking`, `non-breaking`, `informational`)

## Change Severity Levels

- **Breaking**: Changes that will likely break frontend code
  - Removed fields, type changes, status code changes from 2xx to 4xx/5xx
  - Schema validation failures (new validation errors)
  - Required fields becoming missing
- **Non-breaking**: Changes that shouldn't break frontend code
  - New fields, improvements, status code improvements
  - Reduced validation errors
- **Informational**: Changes that are noteworthy but unlikely to impact functionality
  - Header changes, performance improvements

## Schema Validation Benefits

- **Contract Testing**: Ensure API responses match OpenAPI specifications
- **Early Detection**: Catch schema violations before they reach production
- **Documentation Sync**: Keep API documentation in sync with actual behavior
- **Type Safety**: Validate request/response data types and structure
- **Breaking Change Prevention**: Detect when APIs stop conforming to contracts

## CI/CD Integration

Exit codes:

- `0`: No breaking changes detected
- `1`: Breaking changes detected or command failed

### Basic GitHub Actions Workflow

```yaml
- name: API Snapshot Check
  run: |
    npx api-snapshot compare
  env:
    API_TOKEN: ${{ secrets.API_TOKEN }}
```

### Advanced Workflow with Schema Validation

```yaml
- name: API Contract Testing
  run: |
    # Import latest OpenAPI spec
    npx api-snapshot import-schema -s openapi.yaml --merge
    
    # Capture current state with validation
    npx api-snapshot capture
    
    # Compare with schema validation
    npx api-snapshot compare --details
    
    # Validate schema compliance
    npx api-snapshot validate-schema
  env:
    API_TOKEN: ${{ secrets.API_TOKEN }}
```

### Integration with API Updates

```yaml
- name: API Change Approval
  run: |
    # Interactive approval for staging
    npx api-snapshot compare --interactive --auto-approve
    
    # View change history
    npx api-snapshot history --summary
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
