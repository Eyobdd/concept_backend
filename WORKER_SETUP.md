# Call Scheduler Worker Setup

## The Issue You Found

You were correct! The `start-enhanced.sh` script only starts the **concept server**, not the **call scheduler worker**. 

The worker is what actually processes scheduled calls and initiates them at the right time.

## What I Fixed

### 1. Updated Call Scheduler Worker
Modified `/src/workers/callSchedulerWorker.ts` to:
- ✅ Support **Enhanced Call Orchestrator** (Google Cloud STT/TTS)
- ✅ Support **Standard Call Orchestrator** (Twilio-only)
- ✅ Automatically choose based on `USE_ENHANCED_CALLS` env var
- ✅ Log which orchestrator is being used

### 2. Created Combined Startup Script
Created `start-all.sh` that runs:
- ✅ **Concept Server** (handles API requests and webhooks)
- ✅ **Call Scheduler Worker** (processes scheduled calls)

Both services now use the enhanced orchestrator when `USE_ENHANCED_CALLS=true`.

## How to Use

### Start Everything (Recommended)
```bash
./start-all.sh
```

This starts:
- Concept Server on http://localhost:8000
- Call Scheduler Worker (checks every 15 seconds)

Logs are saved to:
- `logs/server.log`
- `logs/worker.log`

### Stop Everything
```bash
./stop-all.sh
```

Or press `Ctrl+C` in the terminal running `start-all.sh`.

### Start Only Server (for testing)
```bash
./start-enhanced.sh
```

### Start Only Worker (for testing)
```bash
deno run --allow-all src/workers/callSchedulerWorker.ts
```

## What the Worker Does

The Call Scheduler Worker:
1. **Checks every 15 seconds** for pending calls
2. **Gets user profile** (phone number, name pronunciation)
3. **Initiates call** via Twilio
4. **Uses Enhanced Orchestrator** for Google Cloud STT/TTS
5. **Handles retries** if call fails
6. **Marks calls complete** when finished

## Logs

### View Server Logs
```bash
tail -f logs/server.log
```

### View Worker Logs
```bash
tail -f logs/worker.log
```

You should see:
```
[CallSchedulerWorker] Using Enhanced Call Orchestrator (Google Cloud STT/TTS)
[CallSchedulerWorker] Starting (poll interval: 15s, batch size: 10)
[CallSchedulerWorker] Checking for pending calls at 2025-11-05T13:05:00.000Z
```

## Process Management

### Check if Services are Running
```bash
# Check server
lsof -ti:8000

# Check for worker
ps aux | grep callSchedulerWorker
```

### Manually Kill Processes
```bash
# Kill server
kill $(cat .server.pid)

# Kill worker
kill $(cat .worker.pid)

# Or kill by port
kill $(lsof -ti:8000)
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Zien Backend                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │ Concept Server   │      │ Scheduler Worker │       │
│  │                  │      │                  │       │
│  │ - API Endpoints  │      │ - Polls queue    │       │
│  │ - Twilio Webhooks│      │ - Initiates calls│       │
│  │ - Media Streams  │      │ - Handles retries│       │
│  └────────┬─────────┘      └────────┬─────────┘       │
│           │                         │                  │
│           └─────────┬───────────────┘                  │
│                     │                                  │
│         ┌───────────▼───────────┐                     │
│         │ Enhanced Orchestrator │                     │
│         │                       │                     │
│         │ - Google Cloud STT    │                     │
│         │ - Google Cloud TTS    │                     │
│         │ - Gemini Completion   │                     │
│         │ - Twilio Call Control │                     │
│         └───────────────────────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Environment Variables

Both services use the same `.env` file:

```bash
# Required for both
MONGODB_URI=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
GEMINI_API_KEY=...
ENCRYPTION_KEY=...

# For enhanced calls
GOOGLE_CLOUD_API_KEY=...
GOOGLE_CLOUD_PROJECT_ID=...
USE_ENHANCED_CALLS=true
```

## Troubleshooting

### Worker not processing calls
- Check `logs/worker.log` for errors
- Verify database connection
- Ensure scheduled calls exist in database

### Calls not using Google Cloud
- Check worker logs for: "Using Enhanced Call Orchestrator"
- Verify `USE_ENHANCED_CALLS=true` in `.env`
- Ensure Google Cloud credentials are set

### Port already in use
```bash
./stop-all.sh
# Then start again
./start-all.sh
```

## Production Deployment

For production (e.g., Render, Heroku):

### Web Service (Server)
```bash
deno run --allow-all src/concept_server.ts
```

### Background Worker
```bash
deno run --allow-all src/workers/callSchedulerWorker.ts
```

Both should have the same environment variables.

## Summary

✅ **Worker now supports enhanced calls**  
✅ **Combined startup script created**  
✅ **Logs saved to files**  
✅ **Easy process management**  
✅ **Both services use Google Cloud STT/TTS**

Use `./start-all.sh` to run everything!
