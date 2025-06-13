# 🚀 Quick Setup Guide

## Fresh Installation

When you clone this project on a new machine, follow these steps:

### 1. Install Dependencies

```bash
# Install all dependencies (both backend and frontend)
npm install

# Build the TypeScript code
npm run build
```

### 2. Start the Web UI (Recommended)

The easiest way to get started is with the web UI:

```bash
# Start both backend (port 3301) and frontend (port 3300)
npm run web
```

Then open http://localhost:3300 in your browser.

**Note**: You do NOT need the `api-snapshot.config.json` file for the web UI. Everything is stored in a SQLite database that will be created automatically on first run.

### 3. First-Time Setup

When you open the web UI for the first time:

1. **Backend Setup Wizard**: You'll see a wizard to configure your backend server
   - Default is `http://localhost:3301` (already running from `npm run web`)
   - Test the connection and save

2. **Create Your First Space**: Spaces are environments like "development", "staging", "production"
   - Click the space selector (top right)
   - Click "Create Space"
   - Enter a name (e.g., "development")

3. **Add API Endpoints**: 
   - Go to the Endpoints page
   - Click "Add" or "Import" to add endpoints
   - You can import from OpenAPI/Swagger or Postman collections

## CLI Usage (Optional)

If you prefer the command-line interface:

1. Copy the example config:
   ```bash
   cp api-snapshot.config.example.json api-snapshot.config.json
   ```

2. Edit the config file to add your API endpoints

3. Run CLI commands:
   ```bash
   # Initialize
   node dist/cli-new.js init
   
   # Capture snapshots
   node dist/cli-new.js capture
   
   # Compare snapshots
   node dist/cli-new.js compare
   ```

## Troubleshooting

### "Config file not found" Error
- For web UI: This is a legacy error that can be ignored. The web UI uses a database, not config files.
- For CLI: Copy `api-snapshot.config.example.json` to `api-snapshot.config.json`

### Database Issues
- The SQLite database (`snapshots.db`) is created automatically
- If corrupted, delete it and restart - it will be recreated
- Database location: `./snapshots.db` in the project root

### Port Conflicts
- Backend runs on port 3301 by default
- Frontend runs on port 3300 by default
- Change with environment variables:
  ```bash
  PORT=3302 npm run web  # Changes backend port
  ```

## What's Next?

1. **Import Your APIs**: Use the Import feature to bring in OpenAPI/Swagger specs
2. **Capture Snapshots**: Click the camera button to capture API responses
3. **Monitor Changes**: The dashboard shows statistics and recent activity
4. **Set Up Environments**: Create spaces for dev, staging, and production

## Need Help?

- Check the [README.md](README.md) for detailed documentation
- Look at [CLAUDE.md](CLAUDE.md) for technical architecture details
- Report issues at https://github.com/anthropics/claude-code/issues