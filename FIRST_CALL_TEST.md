# Your First Test Call - Quick Guide

## ✅ Pre-flight Checklist

### 1. Services Running
- [x] Backend server: http://localhost:8000
- [x] ngrok tunnel: https://2b1beecb05c1.ngrok-free.app
- [x] Frontend: http://localhost:5174
- [ ] Background worker (we'll start this next)

### 2. Twilio Configuration
Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/active

**Update your phone number with these webhooks:**

**Voice Configuration:**
- A CALL COMES IN: `https://2b1beecb05c1.ngrok-free.app/webhooks/twilio/voice` (HTTP POST)
- CALL STATUS CHANGES: `https://2b1beecb05c1.ngrok-free.app/webhooks/twilio/status` (HTTP POST)

### 3. Environment Variables
Check your `.env` file has:
- `TWILIO_ACCOUNT_SID` ✓
- `TWILIO_AUTH_TOKEN` ✓
- `TWILIO_PHONE_NUMBER` ✓
- `GEMINI_API_KEY` ✓
- `ENCRYPTION_KEY` ✓
- `USE_MOCKS=false` ✓

---

## 🚀 Option 1: Quick API Test (Recommended for First Test)

This tests the full pipeline without needing the frontend.

### Step 1: Start the Background Worker

Open a **new terminal** and run:

```bash
cd /Users/eyobdavidoff/Documents/GitHub/6.1040/concept_backend

deno run --allow-net --allow-read --allow-env --allow-sys src/workers/callSchedulerWorker.ts
```

You should see:
```
[CallSchedulerWorker] Starting (poll interval: 60s, batch size: 10)
[CallSchedulerWorker] Checking for pending calls...
```

### Step 2: Create a Test User and Profile

```bash
# Create a test user profile with your phone number
curl -X POST http://localhost:8000/api/Profile/createProfile \
  -H "Content-Type: application/json" \
  -d '{
    "user": "user:testcall123",
    "displayName": "Test User",
    "phoneNumber": "+1YOUR_PHONE_NUMBER",
    "timezone": "America/New_York"
  }'
```

**⚠️ Replace `+1YOUR_PHONE_NUMBER` with your actual phone number!**

### Step 3: Create a Reflection Session

```bash
# Create a reflection session
curl -X POST http://localhost:8000/api/ReflectionSession/startSession \
  -H "Content-Type: application/json" \
  -d '{
    "user": "user:testcall123",
    "callSession": "session:testcall123",
    "method": "PHONE",
    "prompts": [
      {
        "promptId": "prompt1",
        "promptText": "What are you grateful for today?"
      },
      {
        "promptId": "prompt2",
        "promptText": "What is one thing you learned today?"
      }
    ]
  }'
```

### Step 4: Schedule the Call

```bash
# Schedule the call for RIGHT NOW
curl -X POST http://localhost:8000/api/CallScheduler/scheduleCall \
  -H "Content-Type: application/json" \
  -d "{
    \"user\": \"user:testcall123\",
    \"callSession\": \"session:testcall123\",
    \"phoneNumber\": \"+1YOUR_PHONE_NUMBER\",
    \"scheduledFor\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"maxRetries\": 3
  }"
```

**⚠️ Again, replace `+1YOUR_PHONE_NUMBER` with your actual phone number!**

### Step 5: Watch the Magic Happen! ✨

**Worker Terminal** should show:
```
[CallSchedulerWorker] Found 1 pending calls
[CallSchedulerWorker] Processing call for session session:testcall123
[CallSchedulerWorker] Call initiated: CAxxxx
```

**Backend Terminal** should show:
```
[Twilio Voice] CallSid: CAxxxx, Status: initiated
[Twilio Status] CallSid: CAxxxx, Status: ringing
```

**Your Phone** should ring! 📞

### Step 6: Answer and Test

1. **Answer the call**
2. You should hear: "Hello Test User. This is your daily reflection call..."
3. **Listen to the first prompt**: "What are you grateful for today?"
4. **Speak your answer** (e.g., "I'm grateful for my family and friends")
5. **Pause for 3 seconds** - The system will detect you're done
6. **Listen to the next prompt**: "What is one thing you learned today?"
7. **Speak your answer**
8. **Call ends** - Recording is saved and encrypted

### Step 7: Verify the Results

```bash
# Check the reflection session was completed
curl -X POST http://localhost:8000/api/ReflectionSession/_getSession \
  -H "Content-Type: application/json" \
  -d '{
    "session": "session:testcall123"
  }'
```

You should see:
- `status: "COMPLETED"`
- `transcript: "...your spoken responses..."`
- `recordingUrl: "mock_encrypted_..."`

---

## 🎨 Option 2: Test via Frontend (After API Test Works)

Once the API test works, you can test via the frontend:

1. Go to http://localhost:5174
2. Log in or create an account
3. Set up your profile with phone number
4. Go to a day view
5. Click "Start Reflection" → Choose "Phone Call"
6. Your phone should ring!

---

## 🐛 Troubleshooting

### Phone Doesn't Ring

**Check 1: Twilio Webhooks**
- Go to Twilio Console → Phone Numbers
- Verify webhooks are set to your ngrok URL
- Check they're using HTTP POST

**Check 2: Worker is Running**
```bash
# Should see worker logs
[CallSchedulerWorker] Checking for pending calls...
```

**Check 3: ngrok is Running**
```bash
curl https://2b1beecb05c1.ngrok-free.app/
# Should return: "Concept Server is running."
```

**Check 4: Environment Variables**
```bash
# In backend directory
cat .env | grep TWILIO
# Should show your Twilio credentials
```

### Call Connects but No Speech

**Check 1: Gemini API Key**
```bash
cat .env | grep GEMINI
# Should show your API key
```

**Check 2: USE_MOCKS Setting**
```bash
cat .env | grep USE_MOCKS
# Should be: USE_MOCKS=false
```

### "Invalid Phone Number" Error

- Phone number must be in E.164 format: `+1XXXXXXXXXX`
- Include country code (+1 for US)
- No spaces, dashes, or parentheses

### Worker Not Processing Calls

**Check 1: MongoDB Connection**
```bash
# Worker logs should NOT show connection errors
```

**Check 2: Scheduled Time**
- Call must be scheduled for current time or past
- Worker checks every 60 seconds

---

## 📊 Monitor Your Test

### ngrok Inspector
Open: http://127.0.0.1:4040

See all webhook requests in real-time:
- `/webhooks/twilio/voice` - Call initiated
- `/webhooks/twilio/status` - Call status updates
- `/webhooks/twilio/gather` - Speech recognition

### Twilio Console
Go to: https://console.twilio.com/us1/monitor/logs/calls

See your call:
- Duration
- Status
- Recordings
- Errors (if any)

### Backend Logs
Watch your backend terminal for:
- Webhook calls
- Call state transitions
- Errors

### Worker Logs
Watch your worker terminal for:
- Call processing
- Twilio API calls
- Retry attempts

---

## 🎉 Success Criteria

Your test is successful if:

- [x] Phone rings
- [x] You hear the greeting with your name
- [x] You hear the prompts
- [x] System recognizes when you stop speaking
- [x] Call ends gracefully
- [x] Transcript is saved
- [x] Recording URL is encrypted
- [x] Session status is COMPLETED

---

## 💡 Tips

1. **Speak clearly** - Twilio's STT works best with clear speech
2. **Pause 3+ seconds** - System needs pause to detect completion
3. **Check ngrok inspector** - Best way to debug webhook issues
4. **Watch all terminals** - Backend, worker, and ngrok all show useful info
5. **Test with mocks first** - Set `USE_MOCKS=true` to test without API costs

---

## 🚨 Important Notes

### Costs
Each test call costs approximately:
- Twilio call: ~$0.013/minute
- Twilio recording: ~$0.0025/minute
- Gemini API: ~$0.00025/1K characters (usually free tier)

**Total per test**: ~$0.02-0.05

### ngrok URL Changes
If you restart ngrok, the URL changes! You'll need to:
1. Copy the new ngrok URL
2. Update Twilio webhooks
3. Test again

### Free Tier Limits
- Twilio: Pay as you go (no free calls)
- Gemini: 15 requests/minute free
- ngrok: Free tier works fine for testing

---

Ready to make your first call? Follow Option 1 above! 🚀
