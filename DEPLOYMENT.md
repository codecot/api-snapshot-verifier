# Deployment Configuration Guide

## Quick Start

1. **Copy environment configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env file with your configuration:**
   ```bash
   nano .env
   ```

3. **Start the application:**
   ```bash
   ./scripts/start-web.sh
   ```

## Configuration Options

### Backend Server Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Backend server port | `3301` | `3001`, `8080` |
| `HOST` | Backend server host | `localhost` | `0.0.0.0`, `api.yourdomain.com` |
| `PROTOCOL` | Protocol to use | `http` | `https` |
| `CONFIG_PATH` | Path to config file | `./api-snapshot.config.json` | `/etc/api-snapshot/config.json` |
| `NODE_ENV` | Node environment | `development` | `production` |

### Frontend Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_BACKEND_URL` | Backend API URL | `http://localhost:3301` | `https://api.yourdomain.com` |
| `VITE_FRONTEND_PORT` | Frontend dev server port | `3300` | `3000`, `8080` |

### Security & CORS

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:3300,http://localhost:5173` | `https://yourdomain.com,https://app.yourdomain.com` |
| `ENABLE_RATE_LIMIT` | Enable API rate limiting | `false` | `true` |

## Deployment Scenarios

### 1. Local Development (Default)
```env
PORT=3301
HOST=localhost
VITE_BACKEND_URL=http://localhost:3301
VITE_FRONTEND_PORT=3300
PROTOCOL=http
CORS_ORIGIN=http://localhost:3300
```

### 2. Docker Deployment
```env
PORT=3301
HOST=0.0.0.0
VITE_BACKEND_URL=http://localhost:3301
VITE_FRONTEND_PORT=3300
PROTOCOL=http
CORS_ORIGIN=http://localhost:3300
```

### 3. Production with HTTPS
```env
PORT=3001
HOST=0.0.0.0
VITE_BACKEND_URL=https://api.yourdomain.com
VITE_FRONTEND_PORT=80
PROTOCOL=https
CORS_ORIGIN=https://yourdomain.com
ENABLE_RATE_LIMIT=true
NODE_ENV=production
```

### 4. Reverse Proxy Setup (Nginx/Apache)
```env
PORT=3301
HOST=127.0.0.1
VITE_BACKEND_URL=https://yourdomain.com/api
VITE_FRONTEND_PORT=3300
PROTOCOL=https
CORS_ORIGIN=https://yourdomain.com
```

## Manual Startup

If you prefer to start services manually:

### Backend Only
```bash
# Load environment variables
source .env
npm run dev:server
```

### Frontend Only
```bash
# Load environment variables
source .env
cd src/web/frontend && npm run dev
```

### Both Services
```bash
# Load environment variables
source .env
npm run web
```

## Production Build

For production deployment:

```bash
# Build both backend and frontend
npm run build

# Start production server
NODE_ENV=production node dist/web/start-server.js
```

## Environment Variable Priority

Environment variables are loaded in this order (later ones override earlier ones):

1. Default values in code
2. `.env` file
3. System environment variables
4. Command-line variables

## Troubleshooting

### Port Already in Use
The startup script automatically attempts to free ports, but if you encounter issues:

```bash
# Find process using port
lsof -i :3301

# Kill process
kill -9 <PID>
```

### CORS Issues
Make sure `CORS_ORIGIN` includes the frontend URL:
```env
CORS_ORIGIN=http://localhost:3300,https://yourdomain.com
```

### Backend Connection Issues
Verify the frontend can reach the backend:
```bash
curl http://localhost:3301/health
```

### Frontend Not Loading
Check if Vite dev server is accessible:
```bash
curl http://localhost:3300
```