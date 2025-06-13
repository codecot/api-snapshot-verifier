# Port Configuration Guide

This guide explains how to configure custom ports for both the backend API server and frontend development server to avoid conflicts when running multiple projects.

## Quick Setup

### Default Ports

- **Backend**: 3000
- **Frontend**: 5173
- **Swagger UI**: Available at backend port + `/api-docs`

### Alternative Ports (for multiple projects)

- **Backend**: 3301
- **Frontend**: 3300

## Configuration Methods

### 1. Environment Variables

#### Backend Configuration

Create a `.env` file in the project root:

```bash
# Copy example and modify
cp .env.example .env

# Edit .env file
PORT=3301
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3300
```

#### Frontend Configuration

Create a `.env` file in `src/web/frontend/`:

```bash
# Copy example and modify
cp src/web/frontend/.env.example src/web/frontend/.env

# Edit .env file  
VITE_BACKEND_URL=http://localhost:3301
VITE_FRONTEND_PORT=3300
```

### 2. NPM Scripts (Quick Start)

#### Pre-configured Alternative Ports

```bash
# Start backend on port 3301, frontend on port 3300
npm run dev:all:alt

# Or start individually:
npm run dev:server:alt    # Backend on 3301
npm run dev:frontend:alt  # Frontend on 3300
```

#### Custom Ports (inline)

```bash
# Backend with custom port
PORT=3301 npm run dev:server

# Frontend with custom backend URL and port
VITE_BACKEND_URL=http://localhost:3301 VITE_FRONTEND_PORT=3300 npm run dev:frontend

# Both together
concurrently "PORT=3301 npm run dev:server" "VITE_BACKEND_URL=http://localhost:3301 VITE_FRONTEND_PORT=3300 npm run dev:frontend"
```

## Available NPM Scripts

### Backend Scripts

- `npm run dev:server` - Start backend on default port (3000)
- `npm run dev:server:alt` - Start backend on port 3301
- `npm run server` - Start production backend (uses .env or defaults)

### Frontend Scripts  

- `npm run dev:frontend` - Start frontend on default port (5173)
- `npm run dev:frontend:alt` - Start frontend on port 3300
- `cd src/web/frontend && npm run dev` - Direct frontend development

### Combined Scripts

- `npm run dev:all` - Start both on default ports (3000, 5173)
- `npm run dev:all:alt` - Start both on alternative ports (3301, 3300)

## Environment Variables Reference

### Backend (.env in project root)

```bash
PORT=3000                    # Backend server port
HOST=0.0.0.0                # Server host (0.0.0.0 for all interfaces)
CONFIG_PATH=./api-snapshot.config.json  # Configuration file path
LOG_LEVEL=INFO              # Log level (DEBUG, INFO, WARN, ERROR)
CORS_ORIGIN=http://localhost:5173  # Allowed CORS origins (comma-separated)
ENABLE_RATE_LIMIT=false     # Enable rate limiting
```

### Frontend (.env in src/web/frontend/)

```bash
VITE_BACKEND_URL=http://localhost:3000   # Backend API URL
VITE_FRONTEND_PORT=5173                  # Frontend dev server port
```

## Examples for Multiple Projects

### Project 1 (Default)

```bash
# Backend: 3000, Frontend: 5173
npm run dev:all
```

Access:

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000/api>
- Swagger: <http://localhost:3000/api-docs>

### Project 2 (Alternative)

```bash
# Backend: 3301, Frontend: 3300  
npm run dev:all:alt
```

Access:

- Frontend: <http://localhost:3300>
- API: <http://localhost:3301/api>
- Swagger: <http://localhost:3301/api-docs>

### Project 3 (Custom)

```bash
# Backend: 4000, Frontend: 4001
PORT=4000 CORS_ORIGIN=http://localhost:4001 npm run dev:server &
VITE_BACKEND_URL=http://localhost:4000 VITE_FRONTEND_PORT=4001 npm run dev:frontend
```

## Troubleshooting

### Port Already in Use

```bash
# Find what's using a port
lsof -i :3000
netstat -tulpn | grep :3000

# Kill process using port
kill -9 <PID>
```

### CORS Issues

Make sure `CORS_ORIGIN` in backend `.env` matches your frontend URL:

```bash
# If frontend is on 3002
CORS_ORIGIN=http://localhost:3002
```

### Frontend Can't Connect to Backend

1. Check backend is running and accessible
2. Verify `VITE_BACKEND_URL` points to correct backend
3. Check browser network tab for failed requests
4. Ensure no firewall blocking connections

## Production Deployment

For production, set appropriate environment variables:

```bash
# Backend
PORT=80
HOST=0.0.0.0
CORS_ORIGIN=https://yourdomain.com

# Frontend build
VITE_BACKEND_URL=https://api.yourdomain.com
npm run build
```
