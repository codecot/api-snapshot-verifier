# Snapshot API Endpoints

## Currently Available Endpoints

### 1. List All Snapshots
**GET** `/api/snapshots?space=default`

Returns metadata list of snapshots (not full content):
```json
{
  "success": true,
  "data": [
    {
      "id": "snapshot_id",
      "endpoint": "GET__api_users",
      "timestamp": "2025-01-15T10:00:00Z",
      "status": "success",
      "url": "https://api.example.com/users",
      "method": "GET",
      "responseStatus": 200,
      "duration": 123
    }
  ],
  "count": 50,
  "space": "default"
}
```

### 2. Capture Snapshots
**POST** `/api/snapshots/capture`
```json
{
  "endpoints": ["endpoint1", "endpoint2"]  // Optional, captures all if not specified
}
```

## Enhanced Endpoints (snapshots-enhanced.ts)

### 1. Advanced Snapshot Query
**GET** `/api/snapshots`

Query Parameters:
- `space` - Filter by space name
- `endpoint` - Filter by endpoint name
- `endpointId` - Filter by endpoint ID
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset
- `startDate` - Filter after date (ISO format)
- `endDate` - Filter before date
- `status` - Filter by status (success/error/all)

Example: `/api/snapshots?space=production&endpoint=GET__api_users&status=error&limit=10`

### 2. Get Snapshots by Endpoint
**GET** `/api/snapshots/by-endpoint/{endpointName}`

Returns all snapshots for a specific endpoint with statistics:
```json
{
  "success": true,
  "endpoint": {
    "id": 42,
    "name": "GET__api_users",
    "url": "https://api.example.com/users",
    "method": "GET"
  },
  "snapshots": [...],
  "statistics": {
    "total": 156,
    "successful": 150,
    "failed": 6,
    "avg_duration": 123.5,
    "first_snapshot": "2025-01-01T00:00:00Z",
    "last_snapshot": "2025-01-15T10:00:00Z"
  }
}
```

### 3. Get Capture History
**GET** `/api/snapshots/history`

Query Parameters:
- `space` - Space name (default: "default")
- `days` - Number of days to look back (default: 7)
- `groupBy` - Aggregation method: "hour", "day", or "endpoint"

Examples:
- `/api/snapshots/history?days=30&groupBy=day` - Daily capture stats for last 30 days
- `/api/snapshots/history?groupBy=endpoint` - Stats grouped by endpoint

### 4. Get Full Snapshot Content
**GET** `/api/snapshots/{id}/content`

Returns the complete snapshot data including the full API response:
```json
{
  "success": true,
  "metadata": {
    "id": 123,
    "filename": "GET__api_users-2025-01-15T10-00-00-000Z.json",
    "status": "success",
    "created_at": "2025-01-15T10:00:00Z",
    "endpoint_name": "GET__api_users",
    "space_name": "production",
    "response_status": 200,
    "duration": 123,
    "file_size": 2048
  },
  "content": {
    "endpoint": {...},
    "timestamp": "2025-01-15T10:00:00Z",
    "response": {
      "status": 200,
      "headers": {...},
      "data": {
        // The actual API response body
        "users": [
          {"id": 1, "name": "John"},
          {"id": 2, "name": "Jane"}
        ]
      },
      "duration": 123
    }
  }
}
```

### 5. Compare Two Snapshots
**GET** `/api/snapshots/compare/{id1}/{id2}`

Compares two snapshots and returns differences:
```json
{
  "success": true,
  "snapshot1": {
    "id": "123",
    "created_at": "2025-01-15T10:00:00Z",
    "status": 200,
    "duration": 123
  },
  "snapshot2": {
    "id": "456",
    "created_at": "2025-01-15T11:00:00Z",
    "status": 200,
    "duration": 145
  },
  "differences": {
    "status_changed": false,
    "duration_diff": 22,
    "response_changed": true,
    "headers_changed": false
  }
}
```

### 6. Delete Snapshot
**DELETE** `/api/snapshots/{id}`

Deletes both the database record and the file.

## Usage Examples

### Get Recent Failed Snapshots
```bash
curl "http://localhost:3301/api/snapshots?status=error&limit=20"
```

### Get Snapshot History for Last Week
```bash
curl "http://localhost:3301/api/snapshots/history?days=7&groupBy=day"
```

### Get Full Response Data from Specific Snapshot
```bash
curl "http://localhost:3301/api/snapshots/123/content"
```

### Get All Snapshots for an Endpoint
```bash
curl "http://localhost:3301/api/snapshots/by-endpoint/GET__api_users?limit=50"
```

### Compare Two Snapshots
```bash
curl "http://localhost:3301/api/snapshots/compare/123/456"
```

## Frontend Integration

The frontend can use these endpoints to:

1. **Display Snapshot List** - Use the main `/api/snapshots` endpoint with filtering
2. **Show Endpoint History** - Use `/by-endpoint/{name}` for endpoint-specific views
3. **View Response Details** - Use `/{id}/content` to show full API response
4. **Compare Changes** - Use `/compare/{id1}/{id2}` for diff views
5. **Show Trends** - Use `/history` endpoint for charts and analytics