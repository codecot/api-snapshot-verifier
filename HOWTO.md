# 📖 How To Use API Snapshot Verifier

This guide provides step-by-step tutorials for common use cases with API Snapshot Verifier, including the new schema validation features.

## Table of Contents

1. [Quick Start Tutorial](#quick-start-tutorial)
2. [Schema-First Tutorial](#schema-first-tutorial)
3. [Setting Up Your First API Monitoring](#setting-up-your-first-api-monitoring)
4. [CI/CD Integration Tutorial](#cicd-integration-tutorial)
5. [Advanced Configuration Examples](#advanced-configuration-examples)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Quick Start Tutorial

### Step 1: Install and Initialize

```bash
# Clone and setup the project
git clone git@github.com:codecot/api-snapshot-verifier.git
cd api-snapshot-verifier
npm install
npm run build

# Initialize your project
npx api-snapshot init
```

### Step 2: Configure Your First Endpoint

Edit `api-snapshot.config.json`:

```json
{
  "endpoints": [
    {
      "name": "my-api-users",
      "url": "https://your-api.com/api/users",
      "method": "GET",
      "headers": {
        "Authorization": "Bearer your-token-here",
        "Accept": "application/json"
      }
    }
  ],
  "snapshotDir": "./snapshots",
  "baselineDir": "./snapshots/baseline"
}
```

### Step 3: Capture Your First Baseline

```bash
# Capture and save as baseline
npx api-snapshot capture --baseline

# Output:
# 📸 Captured 1 snapshot(s)
# 📌 Saved as baseline
```

### Step 4: Test the Comparison

```bash
# Compare current state with baseline
npx api-snapshot compare

# Output:
# 📊 Summary
# Total Endpoints:        1
# Changed Endpoints:      0
# Breaking Changes:       0
# Non-breaking Changes:   0
# Informational Changes:  0
# 
# ✅ No breaking changes detected
```

---

## Schema-First Tutorial

### Scenario: Import OpenAPI Specification

This tutorial shows how to use the new schema import feature to auto-generate endpoint configurations and enable contract validation.

#### Step 1: Prepare Your OpenAPI Schema

Create or obtain an OpenAPI 3.x specification file (`api-spec.yaml`):

```yaml
openapi: 3.0.0
info:
  title: E-commerce API
  version: 1.0.0
servers:
  - url: https://api.mystore.com
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
                    email:
                      type: string
                  required:
                    - id
                    - name
                    - email
    post:
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
              required:
                - name
                - email
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  email:
                    type: string
```

#### Step 2: Import Schema and Generate Configuration

```bash
# Import OpenAPI schema and generate endpoint configurations
npx api-snapshot import-schema -s api-spec.yaml --base-url https://api.mystore.com

# Output:
# 📋 Importing openapi schema from api-spec.yaml...
# ✅ Generated 2 endpoint(s) from OpenAPI schema
# ✅ Configuration saved to ./api-snapshot.config.json
# 
# 📊 Generated endpoints:
#   GET getUsers
#     https://api.mystore.com/users
#   POST createUser
#     https://api.mystore.com/users
```

#### Step 3: Review Generated Configuration

The tool creates a configuration with schema validation enabled:

```json
{
  "endpoints": [
    {
      "name": "getUsers",
      "url": "https://api.mystore.com/users",
      "method": "GET",
      "schema": {
        "type": "openapi",
        "source": "./api-spec.yaml",
        "operationId": "getUsers",
        "requestValidation": true,
        "responseValidation": true
      }
    },
    {
      "name": "createUser",
      "url": "https://api.mystore.com/users",
      "method": "POST",
      "schema": {
        "type": "openapi",
        "source": "./api-spec.yaml",
        "operationId": "createUser",
        "requestValidation": true,
        "responseValidation": true
      }
    }
  ],
  "snapshotDir": "snapshots",
  "baselineDir": "baselines",
  "environment": "development"
}
```

#### Step 4: Add Authentication and Request Bodies

Edit the configuration to add authentication and request data:

```json
{
  "endpoints": [
    {
      "name": "getUsers",
      "url": "https://api.mystore.com/users",
      "method": "GET",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      },
      "schema": {
        "type": "openapi",
        "source": "./api-spec.yaml",
        "operationId": "getUsers",
        "requestValidation": true,
        "responseValidation": true
      }
    },
    {
      "name": "createUser",
      "url": "https://api.mystore.com/users",
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
  ]
}
```

#### Step 5: Capture Baseline with Schema Validation

```bash
# Set your API token
export API_TOKEN="your-api-token"

# Capture baseline snapshots with schema validation
npx api-snapshot capture --baseline

# Output:
# 📸 Captured 2 snapshot(s)
# 📌 Saved as baseline
# 
# Note: Any schema validation errors will be logged but won't stop capture
```

#### Step 6: Compare with Schema Awareness

```bash
# Compare current state with schema validation
npx api-snapshot compare --details

# Output:
# 🔍 getUsers
#   ✅ No changes detected
#   ✅ Response validation passed
# 
# 🔍 createUser
#   ✅ No changes detected
#   ✅ Request validation passed
#   ✅ Response validation passed
```

#### Step 7: Validate Schema Compliance

```bash
# Validate all snapshots against their schemas
npx api-snapshot validate-schema

# Output:
# 🔍 Validating snapshots against schemas...
# 
# 🔍 getUsers:
#   ✅ Response validation passed
# 
# 🔍 createUser:
#   ✅ Request validation passed
#   ✅ Response validation passed
# 
# 📊 Validation Summary:
#   Total snapshots: 2
#   Valid: 2
#   Invalid: 0
# 
# ✅ All snapshots pass schema validation
```

#### Step 8: Merge with Existing Configuration

If you already have a configuration, merge new endpoints:

```bash
# Merge with existing configuration
npx api-snapshot import-schema -s api-spec.yaml --merge

# Output:
# 📋 Importing openapi schema from api-spec.yaml...
# 📝 Merging with existing configuration...
# ✅ Added 0 new endpoint(s) (no duplicates)
```

---

## Setting Up Your First API Monitoring

### Scenario: E-commerce API Monitoring

Let's monitor a complete e-commerce API with multiple endpoints.

#### Step 1: Create Comprehensive Configuration

```json
{
  "endpoints": [
    {
      "name": "products-list",
      "url": "https://api.mystore.com/products",
      "method": "GET",
      "headers": {
        "Accept": "application/json"
      }
    },
    {
      "name": "product-detail",
      "url": "https://api.mystore.com/products/123",
      "method": "GET",
      "headers": {
        "Accept": "application/json"
      }
    },
    {
      "name": "user-profile",
      "url": "https://api.mystore.com/user/profile",
      "method": "GET",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}",
        "Accept": "application/json"
      }
    },
    {
      "name": "create-order",
      "url": "https://api.mystore.com/orders",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}",
        "Content-Type": "application/json"
      },
      "body": {
        "productId": 123,
        "quantity": 1,
        "customerId": 456
      }
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
      "path": "response.data.*.price",
      "severity": "breaking"
    },
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

#### Step 2: Set Environment Variables

```bash
# Set your API token
export API_TOKEN="your-actual-api-token"

# Or create a .env file
echo "API_TOKEN=your-actual-api-token" > .env
```

#### Step 3: Capture Baselines for All Endpoints

```bash
# Capture all endpoints as baseline
npx api-snapshot capture --baseline

# Or capture specific endpoint
npx api-snapshot capture --endpoint products-list --baseline
```

#### Step 4: Set Up Regular Monitoring

```bash
# Create a monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
set -e

echo "🔍 Running API snapshot comparison..."
npx api-snapshot compare --format table

if [ $? -eq 0 ]; then
    echo "✅ All APIs are stable"
else
    echo "🚨 Breaking changes detected!"
    echo "📧 Sending alert..."
    # Add your alerting logic here
fi
EOF

chmod +x monitor.sh
```

---

## CI/CD Integration Tutorial

### GitHub Actions Integration

#### Step 1: Create Workflow File

Create `.github/workflows/api-snapshot.yml`:

```yaml
name: API Snapshot Check

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    # Run every hour during business hours
    - cron: '0 9-17 * * 1-5'

jobs:
  api-snapshot:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
    
    - name: Run API snapshot comparison
      env:
        API_TOKEN: ${{ secrets.API_TOKEN }}
        API_BASE_URL: ${{ secrets.API_BASE_URL }}
      run: |
        npx api-snapshot compare --format json > comparison-result.json
        cat comparison-result.json
    
    - name: Upload snapshot comparison results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: api-snapshot-results
        path: comparison-result.json
    
    - name: Comment PR with results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const results = JSON.parse(fs.readFileSync('comparison-result.json', 'utf8'));
          
          let comment = '## 🧪 API Snapshot Results\\n\\n';
          
          if (results.summary.breakingChanges > 0) {
            comment += '🚨 **Breaking changes detected!**\\n\\n';
          } else {
            comment += '✅ **No breaking changes detected**\\n\\n';
          }
          
          comment += `- Total Endpoints: ${results.summary.totalEndpoints}\\n`;
          comment += `- Changed Endpoints: ${results.summary.changedEndpoints}\\n`;
          comment += `- Breaking Changes: ${results.summary.breakingChanges}\\n`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

#### Step 2: Set Repository Secrets

1. Go to your GitHub repository settings
2. Navigate to "Secrets and variables" → "Actions"
3. Add these secrets:
   - `API_TOKEN`: Your API authentication token
   - `API_BASE_URL`: Your API base URL (if needed)

#### Step 3: Set Up Baseline Updates

Create `.github/workflows/update-baseline.yml`:

```yaml
name: Update API Baselines

on:
  workflow_dispatch:
    inputs:
      endpoint:
        description: 'Specific endpoint to update (optional)'
        required: false

jobs:
  update-baseline:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
    
    - name: Update baseline snapshots
      env:
        API_TOKEN: ${{ secrets.API_TOKEN }}
      run: |
        if [ -n "${{ github.event.inputs.endpoint }}" ]; then
          npx api-snapshot capture --endpoint "${{ github.event.inputs.endpoint }}" --baseline
        else
          npx api-snapshot capture --baseline
        fi
    
    - name: Commit updated baselines
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add snapshots/baseline/
        git diff --staged --quiet || git commit -m "Update API baseline snapshots"
        git push
```

---

## Advanced Configuration Examples

### Example 1: REST API with Authentication

```json
{
  "endpoints": [
    {
      "name": "auth-login",
      "url": "https://api.example.com/auth/login",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "email": "test@example.com",
        "password": "test-password"
      }
    },
    {
      "name": "protected-resource",
      "url": "https://api.example.com/protected/data",
      "method": "GET",
      "headers": {
        "Authorization": "Bearer ${AUTH_TOKEN}",
        "Accept": "application/json"
      }
    }
  ],
  "rules": [
    {
      "path": "response.data.token",
      "ignore": true
    },
    {
      "path": "response.data.expires_at",
      "ignore": true
    }
  ]
}
```

### Example 2: OpenAPI Schema-Enhanced Configuration

```json
{
  "endpoints": [
    {
      "name": "get-products",
      "url": "https://api.example.com/products",
      "method": "GET",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      },
      "schema": {
        "type": "openapi",
        "source": "./openapi.yaml",
        "operationId": "getProducts",
        "requestValidation": false,
        "responseValidation": true
      }
    },
    {
      "name": "create-product",
      "url": "https://api.example.com/products",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}",
        "Content-Type": "application/json"
      },
      "body": {
        "name": "Test Product",
        "price": 99.99,
        "category": "electronics"
      },
      "schema": {
        "type": "openapi",
        "source": "./openapi.yaml",
        "operationId": "createProduct",
        "requestValidation": true,
        "responseValidation": true
      }
    }
  ],
  "rules": [
    {
      "path": "response.validation.errors",
      "severity": "breaking"
    }
  ]
}
```

### Example 3: GraphQL API Monitoring

```json
{
  "endpoints": [
    {
      "name": "graphql-users",
      "url": "https://api.example.com/graphql",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer ${GRAPHQL_TOKEN}"
      },
      "body": {
        "query": "query GetUsers { users { id name email createdAt } }"
      }
    },
    {
      "name": "graphql-posts",
      "url": "https://api.example.com/graphql",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer ${GRAPHQL_TOKEN}"
      },
      "body": {
        "query": "query GetPosts($limit: Int) { posts(limit: $limit) { id title content author { name } } }",
        "variables": {
          "limit": 10
        }
      }
    }
  ],
  "rules": [
    {
      "path": "response.data.data.users.*.createdAt",
      "ignore": true
    },
    {
      "path": "response.data.data.posts.*.id",
      "severity": "breaking"
    }
  ]
}
```

### Example 4: Multi-Environment Setup

Create separate config files:

**api-snapshot.staging.json**:

```json
{
  "endpoints": [
    {
      "name": "users-api",
      "url": "https://staging-api.example.com/users",
      "method": "GET"
    }
  ],
  "snapshotDir": "./snapshots/staging",
  "environment": "staging"
}
```

**api-snapshot.production.json**:

```json
{
  "endpoints": [
    {
      "name": "users-api",
      "url": "https://api.example.com/users",
      "method": "GET"
    }
  ],
  "snapshotDir": "./snapshots/production",
  "environment": "production"
}
```

Usage:

```bash
# Test staging
npx api-snapshot capture --config api-snapshot.staging.json --baseline
npx api-snapshot compare --config api-snapshot.staging.json

# Test production
npx api-snapshot capture --config api-snapshot.production.json --baseline
npx api-snapshot compare --config api-snapshot.production.json
```

---

## Troubleshooting Common Issues

### Issue 1: Authentication Errors

**Problem**: Getting 401/403 errors

**Solution**:

```bash
# Check if your token is set correctly
echo $API_TOKEN

# Test the API directly
curl -H "Authorization: Bearer $API_TOKEN" https://your-api.com/endpoint

# Update your token in the config or environment
export API_TOKEN="new-token-value"
```

### Issue 2: Too Many Differences

**Problem**: Every comparison shows changes due to timestamps

**Solution**: Add ignore rules for dynamic fields:

```json
{
  "rules": [
    {
      "path": "response.data.timestamp",
      "ignore": true
    },
    {
      "path": "response.data.*.lastModified",
      "ignore": true
    },
    {
      "path": "response.headers.date",
      "ignore": true
    }
  ]
}
```

### Issue 3: Network Timeouts

**Problem**: Requests timing out

**Solution**: Increase timeout in config:

```json
{
  "endpoints": [
    {
      "name": "slow-api",
      "url": "https://slow-api.example.com/data",
      "method": "GET",
      "timeout": 30000
    }
  ]
}
```

### Issue 4: Schema Validation Failures

**Problem**: Schema validation errors appearing

**Solution**: Debug schema validation step by step:

```bash
# Check specific endpoint validation
npx api-snapshot validate-schema --endpoint users-api --response

# Check OpenAPI schema file
npx api-snapshot import-schema -s openapi.yaml --merge

# Validate only request or response
npx api-snapshot validate-schema --request
npx api-snapshot validate-schema --response
```

Update schema configuration if needed:

```json
{
  "endpoints": [
    {
      "name": "users-api",
      "schema": {
        "type": "openapi",
        "source": "./openapi.yaml",
        "operationId": "getUsers",
        "requestValidation": false,
        "responseValidation": true
      }
    }
  ]
}
```

### Issue 5: Managing Large Responses

**Problem**: Snapshots are too large

**Solution**: Use diff rules to focus on important fields:

```json
{
  "rules": [
    {
      "path": "response.data.metadata",
      "ignore": true
    },
    {
      "path": "response.data.*.debug_info",
      "ignore": true
    },
    {
      "path": "response.validation",
      "severity": "breaking"
    }
  ]
}
```

### Issue 6: Cleaning Up Old Snapshots

**Problem**: Too many snapshot files

**Solution**:

```bash
# Clean up, keeping only last 5 snapshots per endpoint
npx api-snapshot clean --keep 5

# Clean specific endpoint
npx api-snapshot clean --endpoint users-api --keep 3

# Set up automatic cleanup script
cat > cleanup.sh << 'EOF'
#!/bin/bash
# Run daily cleanup
npx api-snapshot clean --keep 10
EOF
```

---

## Best Practices

### 1. Baseline Management

- Update baselines when you intentionally change your API
- Use version control for baseline files
- Document baseline update procedures

### 2. Rule Configuration

- Start with minimal rules, add more as needed
- Ignore dynamic fields (timestamps, request IDs)
- Mark critical fields as "breaking" severity

### 3. Schema Management

- Keep OpenAPI specs up to date with your API
- Enable validation for critical endpoints
- Use schema validation to catch contract violations early
- Test both request and response validation

### 4. CI/CD Integration

- Run checks on every PR
- Set up notifications for breaking changes
- Use different configs for different environments
- Include schema validation in your CI pipeline

### 5. Monitoring Strategy

- Monitor critical user-facing endpoints
- Check both success and error responses
- Include edge cases in your endpoint list
- Validate schema compliance regularly

### 6. Alert Management

- Set up different alert channels for different severities
- Include context in alert messages
- Have a runbook for handling breaking changes
- Alert on schema validation failures

---

For more information, see the main [README.md](README.md) or check the [GitHub repository](https://github.com/codecot/api-snapshot-verifier).