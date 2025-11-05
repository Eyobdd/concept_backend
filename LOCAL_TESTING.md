# Local Testing with ngrok

This guide shows you how to test the Twilio integration locally using ngrok before deploying to production.

## Prerequisites

- [ ] ngrok installed (https://ngrok.com/download)
- [ ] Twilio account with phone number
- [ ] Google Gemini API key
- [ ] MongoDB running (local or Atlas)
- [ ] `.env` file configured

## Step 1: Set Up Environment

### 1.1 Create `.env` file

Copy from `.env.example` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```bash
# MongoDB (use Atlas or local)
MONGODB_URI=mongodb://localhost:27017/your-db
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Encryption (you already generated this!)
ENCRYPTION_KEY=1eed3e19355de660e100dd9b02ef511fb59b58acf84e4e1539b3ad5b60148495

# Local server
BASE_URL=http://localhost:8000
PORT=8000

# Use real services for testing
USE_MOCKS=false
```

## Step 2: Start Your Backend

### 2.1 Start the Web Server

```bash
cd concept_backend
deno run --allow-net --allow-read --allow-env --allow-sys src/concept_server.ts
```

You should see:
```
Registering Twilio webhooks...
✓ Twilio webhooks registered at /webhooks/twilio

Scanning for concepts in ./src/concepts...
- Registering concept: Profile at /api/Profile
- Registering concept: ReflectionSession at /api/ReflectionSession
...
Server running on http://localhost:8000
```

### 2.2 (Optional) Start the Background Worker

In a **new terminal**:

```bash
cd concept_backend
deno run --allow-net --allow-read --allow-env --allow-sys src/workers/callSchedulerWorker.ts
```

You should see:
```
[CallSchedulerWorker] Starting (poll interval: 60s, batch size: 10)
[CallSchedulerWorker] Checking for pending calls at 2025-11-04T...
[CallSchedulerWorker] No pending calls
```

## Step 3: Expose Local Server with ngrok

### 3.1 Start ngrok

In a **new terminal**:

```bash
ngrok http 8000
```

You'll see output like:
```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Forwarding                    https://abc123def456.ngrok.io -> http://localhost:8000
```

**Important**: Copy the `https://abc123def456.ngrok.io` URL - this is your public URL!

### 3.2 Keep ngrok Running

Leave this terminal open. ngrok must stay running for webhooks to work.

## Step 4: Configure Twilio Webhooks

### 4.1 Update Twilio Phone Number

1. Go to Twilio Console: https://console.twilio.com
2. Navigate to **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your phone number
4. Scroll to **Voice Configuration**:
   - **A CALL COMES IN**: 
     - Webhook: `https://abc123def456.ngrok.io/webhooks/twilio/voice`
     - HTTP POST
   - **CALL STATUS CHANGES**:
     - Webhook: `https://abc123def456.ngrok.io/webhooks/twilio/status`
     - HTTP POST
5. Click **Save**

**Note**: Replace `abc123def456.ngrok.io` with your actual ngrok URL!

## Step 5: Test the Integration

### 5.1 Test Webhook Connectivity

```bash
curl https://abc123def456.ngrok.io/
```

Should return: `Concept Server is running.`

### 5.2 Schedule a Test Call

**Option A: Via API**

```bash
curl -X POST http://localhost:8000/api/CallScheduler/scheduleCall \
  -H "Content-Type: application/json" \
  -d '{
    "user": "user:test",
    "callSession": "session:test123",
    "phoneNumber": "+1YOUR_PHONE_NUMBER",
    "scheduledFor": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "maxRetries": 3
  }'
```

**Option B: Via Frontend**

Use your frontend app to schedule a call normally.

### 5.3 Watch the Logs

**Backend Terminal** should show:
```
[Twilio Voice] CallSid: CAxxxx, Status: initiated
[Twilio Status] CallSid: CAxxxx, Status: ringing
[Twilio Status] CallSid: CAxxxx, Status: in-progress
```

**Worker Terminal** should show:
```
[CallSchedulerWorker] Found 1 pending calls
[CallSchedulerWorker] Processing call for session session:test123
[CallSchedulerWorker] Call initiated: CAxxxx
```

**ngrok Terminal** shows all HTTP requests:
```
POST /webhooks/twilio/voice        200 OK
POST /webhooks/twilio/status       200 OK
```

### 5.4 Answer the Call

1. Your phone should ring!
2. Answer it
3. You should hear: "Hello. This is your daily reflection call..."
4. Speak your responses
5. Watch the logs for transcription and LLM processing

## Step 6: Debug Common Issues

### Issue: "Connection Refused"

**Cause**: Backend not running or wrong port

**Fix**:
```bash
# Check if server is running
curl http://localhost:8000

# Restart server if needed
deno run --allow-net --allow-read --allow-env --allow-sys src/concept_server.ts
```

### Issue: "Webhook Failed" in Twilio Console

**Cause**: ngrok URL is wrong or ngrok stopped

**Fix**:
1. Check ngrok is still running
2. Copy the current ngrok URL (it changes each restart)
3. Update Twilio webhooks with new URL

### Issue: "Environment Variable Not Found"

**Cause**: Missing or incorrect `.env` file

**Fix**:
```bash
# Check .env exists
ls -la .env

# Verify contents
cat .env

# Make sure all required variables are set
```

### Issue: Call Connects but No Speech Recognition

**Cause**: Twilio STT not configured properly

**Fix**: Check webhook logs for errors. Twilio's `<Gather>` verb handles STT automatically.

### Issue: "Gemini API Error"

**Cause**: Invalid API key or quota exceeded

**Fix**:
1. Verify API key in `.env`
2. Check Gemini API quota: https://aistudio.google.com/app/apikey
3. Temporarily set `USE_MOCKS=true` to test without Gemini

## Step 7: Test Different Scenarios

### Test 1: Successful Call Completion

1. Schedule call
2. Answer phone
3. Complete all prompts
4. Verify in MongoDB:
   ```bash
   # Check ReflectionSession is COMPLETED
   # Check PhoneCall is COMPLETED
   # Check recording URL is encrypted
   ```

### Test 2: Missed Call (Retry Logic)

1. Schedule call
2. Don't answer phone
3. Watch worker retry after 5 minutes
4. Verify retry count increments

### Test 3: Call Abandonment

1. Schedule call
2. Answer phone
3. Hang up mid-call
4. Verify session marked as ABANDONED

### Test 4: Max Retries Reached

1. Schedule call with `maxRetries: 2`
2. Don't answer twice
3. Verify call marked as FAILED after 2 attempts

## Step 8: Monitor ngrok Requests

### View Request Inspector

1. Open http://127.0.0.1:4040 in your browser
2. See all webhook requests in real-time
3. Inspect request/response bodies
4. Replay requests for debugging

This is **super useful** for debugging webhook issues!

## Step 9: Clean Up

When done testing:

1. **Stop ngrok**: Press `Ctrl+C` in ngrok terminal
2. **Stop backend**: Press `Ctrl+C` in backend terminal
3. **Stop worker**: Press `Ctrl+C` in worker terminal
4. **Reset Twilio webhooks**: Update to production URLs (or leave for next test)

## Tips for Efficient Testing

### Use Mock Services for Unit Tests

For testing without making real API calls:

```bash
# In .env
USE_MOCKS=true
```

Then run tests:
```bash
deno test --allow-read --allow-env --allow-net --allow-sys
```

### Keep ngrok URL Stable

Free ngrok changes URL on restart. To keep stable URL:

1. Sign up for ngrok account (free)
2. Get auth token
3. Use static domain (paid) or reserved domain (free tier)

### Test with Twilio Console

Use Twilio's "Make a Test Call" feature:
1. Go to Twilio Console
2. Click "Make a Test Call"
3. Enter your webhook URL
4. See request/response in real-time

### Use Postman for Webhook Testing

1. Import webhook endpoints
2. Simulate Twilio webhook payloads
3. Test without making actual calls

## Next Steps

Once local testing works:

1. ✅ Commit your changes
2. ✅ Push to GitHub
3. ✅ Follow `RENDER_DEPLOYMENT.md` to deploy
4. ✅ Update Twilio webhooks to production URLs
5. ✅ Test in production!

---

## Quick Reference

**Local URLs**:
- Backend: http://localhost:8000
- ngrok Inspector: http://127.0.0.1:4040

**Webhook Endpoints** (use with ngrok URL):
- Voice: `https://YOUR_NGROK_URL/webhooks/twilio/voice`
- Status: `https://YOUR_NGROK_URL/webhooks/twilio/status`
- Recording: `https://YOUR_NGROK_URL/webhooks/twilio/recording`

**Useful Commands**:
```bash
# Start backend
deno run --allow-net --allow-read --allow-env --allow-sys src/concept_server.ts

# Start worker
deno run --allow-net --allow-read --allow-env --allow-sys src/workers/callSchedulerWorker.ts

# Start ngrok
ngrok http 8000

# Run tests
deno test --allow-read --allow-env --allow-net --allow-sys

# Check MongoDB
mongosh "mongodb://localhost:27017/your-db"
```
