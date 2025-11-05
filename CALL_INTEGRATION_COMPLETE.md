# Phone Call Integration - Complete Implementation

## ✅ What's Been Implemented

### 1. **Frontend Call Initiation**

#### DayView Page (`/`)
- **Two buttons** for starting reflection:
  - **"Type Reflection"** - Opens the manual reflection form (existing behavior)
  - **"Call Me"** - Initiates a phone call for voice reflection (NEW)
- **Call status tracking**:
  - Buttons are disabled when a call is IN_PROGRESS
  - "Call Me" button shows "Call in Progress" when active
  - Automatically reloads entries when call completes
- **Status polling**: Checks call status every 5 seconds

#### Sidebar "Initiate Call" Button
- Clicking "Initiate Call" now:
  1. Creates a reflection session
  2. Schedules a call for RIGHT NOW
  3. Navigates to DayView to show status
  4. Alert confirms "Call scheduled! Your phone will ring within 60 seconds."

### 2. **API Endpoints Added**

New endpoints in `/src/services/api.ts`:
```typescript
// Schedule a call
api.scheduleCall(callSession, phoneNumber, scheduledFor, maxRetries)

// Get active calls for current user
api.getActiveCallsForUser()

// Get specific scheduled call
api.getScheduledCall(callSession)

// Cancel a scheduled call
api.cancelCall(callSession)
```

### 3. **Automatic Call Scheduling via Call Windows**

**New Worker**: `callWindowScheduler.ts`

This worker runs every 5 minutes and:
1. Checks all users with call windows
2. For each user, checks if:
   - Current time is within an active call window
   - No journal entry exists for today
   - No call is already scheduled/in-progress
3. If all conditions met:
   - Creates a reflection session
   - Schedules a call for RIGHT NOW
   - User's phone will ring within 60 seconds

**How It Works**:
- **One-off windows** (specific dates) have priority over recurring windows
- **Recurring windows** (e.g., "Every Monday 9-10am") are checked by day of week
- **Only one call per day** - won't schedule if user already completed reflection
- **Only one call at a time** - won't schedule if another call is pending/in-progress

## 🚀 How to Use

### Manual Call Initiation

**Option 1: DayView Page**
1. Go to Day View (`/`)
2. If no reflection for today, you'll see two buttons
3. Click **"Call Me"**
4. Your phone will ring within 60 seconds
5. Answer and complete the reflection prompts

**Option 2: Sidebar**
1. Hover over the sidebar
2. Expand the "Today" panel
3. Click **"Initiate Call"**
4. You'll be redirected to Day View
5. Your phone will ring within 60 seconds

### Automatic Call Scheduling

**Set up Call Windows**:
1. Go to Day View
2. Use the **Call Windows Card** on the right sidebar
3. Create windows by:
   - **Dragging** on the timeline to create a window
   - **Clicking the + button** to manually add a window
4. Windows can be:
   - **Recurring** (e.g., "Every Monday 9-10am") - shown with dashed borders
   - **One-off** (e.g., "Dec 25, 2024 2-3pm") - shown with solid borders

**What Happens**:
- The `callWindowScheduler` worker checks every 5 minutes
- When current time enters a call window:
  - If you haven't done today's reflection yet
  - And no call is already scheduled
  - **A call is automatically scheduled**
  - Your phone will ring within 60 seconds

## 🔧 Running the Workers

### Start the CallScheduler Worker (Required)
```bash
cd concept_backend
deno run --allow-net --allow-read --allow-env --allow-sys src/workers/callSchedulerWorker.ts
```

This worker:
- Polls every 60 seconds for scheduled calls
- Initiates Twilio calls
- Handles retries on failure

### Start the CallWindow Scheduler (Optional - for automatic scheduling)
```bash
cd concept_backend
deno run --allow-net --allow-read --allow-env --allow-sys src/workers/callWindowScheduler.ts
```

This worker:
- Polls every 5 minutes for active call windows
- Automatically schedules calls when windows become active
- Ensures only one call per day

## 📋 Call Flow

### 1. User Initiates Call (Manual or Automatic)
- Reflection session created with 2 prompts
- Call scheduled in CallScheduler
- Status: `PENDING`

### 2. CallScheduler Worker Picks Up Call (within 60s)
- Status changes to `IN_PROGRESS`
- Twilio call initiated
- User's phone rings

### 3. User Answers Call
- Greeting: "Hello. This is your daily reflection call..."
- Prompt 1: "What are you grateful for today?"
- User speaks (Twilio transcribes)
- Prompt 2: "What is one thing you learned today?"
- User speaks (Twilio transcribes)
- Closing: "Thank you for completing your reflection. Goodbye."

### 4. Call Completes
- Status changes to `COMPLETED`
- Recording URL encrypted and stored
- Transcripts saved to reflection session
- Journal entry created
- Frontend reloads to show new entry

## 🔒 Security & Privacy

- **Recording URLs are encrypted** using AES-256-GCM with user-specific keys
- **Transcripts are stored** in the reflection session
- **Only the user** can access their recordings and transcripts
- **Encryption key** is derived from a master key + user ID

## 🎯 Key Features

### ✅ One Call Per Reflection Session
- The `scheduleCall` method checks for existing PENDING/IN_PROGRESS calls
- Returns error if a call is already scheduled for the same session
- **Enforced at the backend level**

### ✅ Parallel Call Handling
- Multiple users can have calls scheduled at the same time
- Twilio handles concurrent calls efficiently
- Each call is processed independently
- No user has to wait for another user's call to complete

### ✅ Dynamic UI Updates
- Call status is polled every 5 seconds
- Buttons are disabled during active calls
- UI updates automatically when call completes
- New journal entries appear immediately

## 🐛 Troubleshooting

### "Please add your phone number in settings"
- Go to Settings and add your phone number in E.164 format: `+1XXXXXXXXXX`

### "Call scheduled but phone didn't ring"
- Check that the CallScheduler worker is running
- Check worker logs for errors
- Verify Twilio credentials in `.env`
- Verify `BASE_URL` in `.env` is your ngrok URL

### "Call rings but gets 'Application Error'"
- Check that backend server is running
- Verify ngrok is forwarding to `localhost:8000`
- Check backend logs for webhook errors

### Call Windows not triggering automatic calls
- Check that CallWindow Scheduler worker is running
- Verify call windows are created correctly
- Check worker logs: `[CallWindowScheduler] Active window found for user...`
- Ensure no journal entry exists for today

## 📝 Next Steps

### Recommended Improvements

1. **Dynamic Prompts**
   - Pull prompts from user's JournalPrompt collection
   - Allow customization in settings

2. **Call Window UI Enhancements**
   - Show "Next scheduled call" indicator
   - Add "Call me now" button within active windows
   - Visual indicator when window is active

3. **Notification System**
   - SMS reminder before call window starts
   - Push notification when call is scheduled
   - Email summary after call completes

4. **Advanced Scheduling**
   - Timezone-aware scheduling
   - "Smart scheduling" based on user patterns
   - Snooze/reschedule options

5. **Call Quality**
   - Voice selection (male/female, accent)
   - Speech recognition improvements
   - Background noise filtering

## 🎉 Summary

You now have a **fully functional phone call integration**! Users can:
- ✅ Manually initiate calls from the UI
- ✅ Set up call windows for automatic scheduling
- ✅ Complete reflections via phone
- ✅ See call status in real-time
- ✅ Have recordings encrypted and transcripts saved

The system enforces:
- ✅ One call per reflection session
- ✅ One reflection per day
- ✅ Parallel call handling for multiple users
- ✅ Automatic retry on failure

**Everything is working end-to-end!** 🚀
