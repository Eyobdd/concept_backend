# Troubleshooting Call Issues

## Common Errors and Solutions

### 1. "Application Error" from Twilio

**Symptoms**: When you pick up the phone, you hear "An application error has occurred"

**Possible Causes**:

#### A. PhoneCall Record Not Found
The most common cause. Twilio's webhook arrives before the PhoneCall record is created in MongoDB.

**Check logs for**:
```
[Twilio Voice] No phone call found for CA...
```

**Solutions**:
1. Verify the 100ms delay is in place (line 94 in `enhancedCallOrchestrator.ts`)
2. Check if PhoneCall creation succeeded:
   ```
   [EnhancedOrchestrator] PhoneCall record created: 019a...
   [EnhancedOrchestrator] PhoneCall fully configured with SID: CA...
   ```
3. If you see "Failed to create PhoneCall record", check for stale IN_PROGRESS calls

#### B. Server Not Running or Crashed
**Check**:
```bash
ps aux | grep "deno run" | grep concept_server
curl http://localhost:8000/api/health  # if you have a health endpoint
```

**Solution**: Restart the server
```bash
./stop-all.sh
deno task build
./start-all.sh
```

#### C. TwiML Generation Error
**Check logs for**:
```
[Twilio Voice] ========== ERROR OCCURRED ==========
```

**Solution**: Check the error stack trace in logs

#### D. Webhook URL Not Accessible
If using ngrok, verify it's running and the URL is correct in Twilio console.

**Check**:
```bash
curl https://your-ngrok-url.ngrok.io/webhooks/twilio/voice
```

### 2. Day Rating Loop

**Symptoms**: System repeatedly asks "On a scale from negative 2 to positive 2..." even after answering

**Check logs for**:
```
[Call Complete] Asking for day rating before closing
[Call Complete] Asking for day rating before closing  ← REPEATED
```

**Root Cause**: Rating response not being detected properly

**Solution Applied**: 
- Lines 384-395: Special handling in `checkAndHandleCompletion`
- Lines 434-442: Skip recording in `handleResponseComplete`

**Verify fix is applied**:
```bash
grep -A 5 "Check if we're waiting for a rating response" src/services/enhancedCallOrchestrator.ts
```

### 3. Call Not Found (Race Condition)

**Symptoms**: "Error: Call not found" message during call

**Root Cause**: PhoneCall record created after Twilio webhook arrives

**Solution Applied**: Initiate Twilio call first, then create PhoneCall record with real SID

**Verify**:
```bash
grep -A 10 "Initiate Twilio call FIRST" src/services/enhancedCallOrchestrator.ts
```

### 4. WebSocket URL Error

**Symptoms**: Call connects but no audio/transcription

**Check logs for**:
```
[MediaStream] Not a WebSocket request
[MediaStream] WebSocket closed: 1006
```

**Root Cause**: Incorrect ws:// vs wss:// protocol

**Solution Applied**: Dynamic protocol selection based on BASE_URL

**Verify**:
```bash
grep "wsProtocol = baseUrl.startsWith" src/services/enhancedCallOrchestrator.ts
```

## Debugging Workflow

### Step 1: Check Server Status
```bash
ps aux | grep deno
tail -f logs/server.log
```

### Step 2: Initiate Test Call
Watch logs in real-time:
```bash
tail -f logs/server.log | grep -E "Twilio|EnhancedOrchestrator|Call Complete|Rating"
```

### Step 3: Expected Log Flow (Success)
```
[EnhancedOrchestrator] Initiating Twilio call to +1234567890
[EnhancedOrchestrator] Twilio call initiated with SID: CA...
[EnhancedOrchestrator] PhoneCall record created: 019a...
[EnhancedOrchestrator] PhoneCall fully configured with SID: CA...
[Twilio Voice] CallSid: CA..., Status: initiated
[Twilio Voice] PhoneCall lookup result: Found (ID: 019a...)
[TTS] Generating greeting audio with Gemini 2.5 Flash TTS...
[MediaStream] Stream started: MZ... for call CA...
[Deepgram] WebSocket connected
[Deepgram] Transcript (final=true): [user response]
[Completion Check] Response complete (confidence=0.85)
[Call Complete] Asking for day rating before closing
[Completion Check] Waiting for rating response (index 3 >= 3)
[Response Complete] Rating response detected, skipping prompt recording
[Call Complete] Extracted rating: 0
[Call Complete] Rating saved successfully
[Call Complete] Finalizing call and playing closing message
```

### Step 4: Common Error Patterns

**Pattern 1: Call Not Found**
```
[EnhancedOrchestrator] Twilio call initiated with SID: CA...
[Twilio Voice] No phone call found for CA...  ← ERROR
```
**Fix**: Increase delay or check MongoDB write latency

**Pattern 2: Rating Loop**
```
[Call Complete] Asking for day rating before closing
[Completion Check] isComplete=true, confidence=0.85
[Call Complete] Asking for day rating before closing  ← LOOP
```
**Fix**: Verify rating detection code is applied

**Pattern 3: Undefined Prompt**
```
[Completion Check] Error checking completion
TypeError: Cannot read property 'promptText' of undefined
```
**Fix**: Verify rating response handling in `checkAndHandleCompletion`

## Clean Restart Procedure

When in doubt, do a complete clean restart:

```bash
# 1. Stop everything
./stop-all.sh
pkill -9 deno

# 2. Clear any caches (optional)
rm -rf .deno_cache 2>/dev/null

# 3. Rebuild
deno task build

# 4. Start fresh
./start-all.sh

# 5. Verify
ps aux | grep deno
curl http://localhost:8000/api/health  # if available
```

## Environment Checklist

- [ ] `BASE_URL` set correctly (http://localhost:8000 or https://your-domain.com)
- [ ] `TWILIO_ACCOUNT_SID` set
- [ ] `TWILIO_AUTH_TOKEN` set
- [ ] `TWILIO_PHONE_NUMBER` set
- [ ] `DEEPGRAM_API_KEY` set
- [ ] `GEMINI_API_KEY` set
- [ ] `GOOGLE_CLOUD_API_KEY` set (for TTS)
- [ ] `MONGODB_URI` set
- [ ] `ENCRYPTION_KEY` set

## Getting Help

If issues persist:

1. Capture full logs:
   ```bash
   tail -200 logs/server.log > debug.log
   ```

2. Check MongoDB for stale calls:
   ```javascript
   db.PhoneCall.phoneCalls.find({ status: "IN_PROGRESS" })
   ```

3. Test webhook directly:
   ```bash
   curl -X POST http://localhost:8000/webhooks/twilio/voice \
     -d "CallSid=TEST123&CallStatus=initiated"
   ```
