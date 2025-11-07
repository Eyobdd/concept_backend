# Two-Worker System Explained

## The Problem You Found

Calls weren't being scheduled because we were only running **one of two workers**!

## The Two-Worker Architecture

Your call system requires **TWO separate workers** working together:

```
┌─────────────────────────────────────────────────────────────┐
│                    Call System Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣ Call Window Scheduler Worker (Every 5 minutes)         │
│     ↓                                                       │
│     • Checks user call windows                             │
│     • Finds active windows (current time within window)    │
│     • Creates scheduled calls in CallScheduler             │
│                                                             │
│  2️⃣ Call Scheduler Worker (Every 15 seconds)               │
│     ↓                                                       │
│     • Checks for pending scheduled calls                   │
│     • Initiates calls via Twilio                           │
│     • Uses Enhanced Orchestrator (Google Cloud STT/TTS)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Worker 1: Call Window Scheduler

**File**: `/src/workers/callWindowScheduler.ts`  
**Frequency**: Every 5 minutes  
**Purpose**: Create scheduled calls based on call windows

### What It Does

1. **Checks all users** with call windows
2. **For each user**:
   - Gets their call windows (recurring + one-off)
   - Checks if current time is within any window
   - Checks if they already have a call today
   - If window is active AND no call exists → **Creates scheduled call**
3. **Logs**: `logs/window-worker.log`

### Example Log Output
```
[CallWindowScheduler] Checking at 2025-11-05T13:26:26.970Z (WEDNESDAY, 08:26)
[CallWindowScheduler] Found 2 users with call windows
[CallWindowScheduler] User 019a5428... has active window 08:00-09:00
[CallWindowScheduler] Scheduling call for user 019a5428...
[CallWindowScheduler] Call scheduled: call:1762348549342
```

## Worker 2: Call Scheduler Worker

**File**: `/src/workers/callSchedulerWorker.ts`  
**Frequency**: Every 15 seconds  
**Purpose**: Process scheduled calls and initiate them

### What It Does

1. **Checks for pending calls** (created by Worker 1)
2. **For each pending call**:
   - Gets user profile (phone number, name pronunciation)
   - Initiates call via Twilio
   - Uses Enhanced Orchestrator (Google Cloud STT/TTS)
   - Handles retries if call fails
3. **Logs**: `logs/call-worker.log`

### Example Log Output
```
[CallSchedulerWorker] Found 1 pending calls
[CallSchedulerWorker] Processing call for session call:1762348549342
[CallSchedulerWorker] Call initiated: CA1234567890abcdef
[CallSchedulerWorker] Call will start via webhook (enhanced mode)
```

## Why Both Are Needed

| Worker | Responsibility | Without It |
|--------|---------------|------------|
| **Window Scheduler** | Creates scheduled calls | No calls ever get scheduled |
| **Call Scheduler** | Initiates scheduled calls | Calls scheduled but never made |

**Both must run** for the system to work!

## What Was Wrong

Before the fix:
- ✅ Call Scheduler Worker was running
- ❌ Call Window Scheduler Worker was NOT running
- **Result**: No new calls were being scheduled

After the fix:
- ✅ Call Scheduler Worker running
- ✅ Call Window Scheduler Worker running
- **Result**: Calls get scheduled AND initiated

## Current Status

### ✅ All Three Services Running

```bash
📡 Server: Port 8000 (PID: 21389)
⏰ Call Worker: Running (PID: 21398)
📅 Window Worker: Running (PID: 21405)
```

### Log Files

```bash
# Server logs (API requests, webhooks)
tail -f logs/server.log

# Call worker logs (call initiation)
tail -f logs/call-worker.log

# Window worker logs (call scheduling)
tail -f logs/window-worker.log
```

## How It Works End-to-End

### 1. User Sets Call Window
- User configures call window in frontend (e.g., "8:00 AM - 9:00 AM daily")
- Stored in `CallWindow` concept

### 2. Window Worker Detects Active Window
- Every 5 minutes, checks all users
- Finds user's window is active (current time = 8:15 AM)
- Creates scheduled call in `CallScheduler`

### 3. Call Worker Initiates Call
- Every 15 seconds, checks for pending calls
- Finds the scheduled call
- Initiates call via Twilio
- Uses Enhanced Orchestrator (Google Cloud STT/TTS)

### 4. User Answers Call
- Twilio webhook to `/webhooks/twilio/voice`
- Server returns TwiML with media streaming
- Google Cloud STT transcribes speech
- Gemini checks completion
- Google Cloud TTS plays prompts

### 5. Call Completes
- Recording saved (encrypted)
- Reflection session marked complete
- Journal entry created

## Management Commands

### Start All Services
```bash
./start-all.sh
```

Starts:
- Concept Server
- Call Scheduler Worker
- Call Window Scheduler Worker

### Stop All Services
```bash
./stop-all.sh
```

### View Specific Logs
```bash
# Window scheduling activity
tail -f logs/window-worker.log

# Call initiation activity
tail -f logs/call-worker.log

# Server/webhook activity
tail -f logs/server.log
```

## Troubleshooting

### No calls being scheduled
**Check**: Window worker logs
```bash
tail -f logs/window-worker.log
```

Look for:
- "Found X users with call windows"
- "User has active window"
- "Scheduling call for user"

If you see "Found 0 users", check:
- Do users have call windows configured?
- Are the windows active at current time?

### Calls scheduled but not initiated
**Check**: Call worker logs
```bash
tail -f logs/call-worker.log
```

Look for:
- "Found X pending calls"
- "Processing call for session"
- "Call initiated: CA..."

If you see "Found 0 pending calls", the window worker isn't creating them.

### Calls initiated but not using Google Cloud
**Check**: Call worker logs for:
```
[CallSchedulerWorker] Using Enhanced Call Orchestrator (Google Cloud STT/TTS)
```

If you see "Using Standard Call Orchestrator", check:
- `USE_ENHANCED_CALLS=true` in `.env`
- Google Cloud credentials configured

## Performance Notes

### Window Worker (5 minutes)
- Checks all users with call windows
- Creates scheduled calls as needed
- Low frequency = low database load

### Call Worker (15 seconds)
- Checks for pending calls
- Initiates calls immediately
- High frequency = responsive call initiation

## Summary

✅ **Two workers are now running**  
✅ **Window worker creates scheduled calls**  
✅ **Call worker initiates scheduled calls**  
✅ **Both use enhanced orchestrator**  
✅ **Complete end-to-end call flow working**

Your call system is now **fully operational** with both workers running!
