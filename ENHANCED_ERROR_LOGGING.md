# Enhanced Error Logging for Twilio Webhooks

## What Was Added

Comprehensive error logging has been added to catch and log all errors from Twilio webhooks and the server.

### 1. Twilio Voice Webhook Logging

**Location:** `/src/webhooks/twilioEnhanced.ts` - `/voice` endpoint

**Added:**
- Full request body logging (all Twilio parameters)
- Comprehensive error logging with:
  - Error message
  - Full stack trace
  - Complete error object serialization

**Example logs you'll see:**
```
[Twilio Voice] CallSid: CAxxxx, Status: in-progress
[Twilio Voice] Full request body: {
  "CallSid": "CAxxxx",
  "From": "+1234567890",
  "To": "+0987654321",
  ...
}
```

**On error:**
```
[Twilio Voice] ========== ERROR OCCURRED ==========
[Twilio Voice] Error message: Cannot read property 'x' of undefined
[Twilio Voice] Error stack: Error: Cannot read property 'x' of undefined
    at file:///path/to/file.ts:123:45
    ...
[Twilio Voice] Full error: {
  "message": "...",
  "stack": "...",
  ...
}
[Twilio Voice] ====================================
```

### 2. Twilio Status Webhook Logging

**Location:** `/src/webhooks/twilioEnhanced.ts` - `/status` endpoint

**Added:**
- Full request body logging
- Comprehensive error logging

**Example logs:**
```
[Twilio Status] CallSid: CAxxxx, Status: completed
[Twilio Status] Full request body: {
  "CallSid": "CAxxxx",
  "CallStatus": "completed",
  "CallDuration": "45",
  ...
}
```

### 3. Twilio Recording Webhook Logging

**Location:** `/src/webhooks/twilioEnhanced.ts` - `/recording` endpoint

**Added:**
- Full request body logging

### 4. Global Error Handlers

**Location:** `/src/concept_server.ts`

**Added:**
- Uncaught error handler
- Unhandled promise rejection handler
- Fatal error handler for main function

**Example logs:**
```
========== UNCAUGHT ERROR ==========
Error: Something went wrong
Message: Something went wrong
Stack: Error: Something went wrong
    at file:///path/to/file.ts:123:45
====================================
```

```
========== UNHANDLED PROMISE REJECTION ==========
Reason: Error: Promise rejected
Promise: Promise { <rejected> Error: Promise rejected }
Stack: Error: Promise rejected
    at file:///path/to/file.ts:123:45
=================================================
```

## How to Use

### 1. Watch Logs in Real-Time

```bash
tail -f logs/server.log
```

### 2. Make a Test Call

The logs will now show:
- Every Twilio webhook request with full details
- Any errors with complete stack traces
- All request/response data

### 3. Search for Errors

```bash
# Find all errors
grep "ERROR" logs/server.log

# Find specific webhook errors
grep "\[Twilio Voice\].*ERROR" logs/server.log

# Find uncaught errors
grep "UNCAUGHT ERROR" logs/server.log
```

### 4. Debug Application Errors

When you get an "application error" on the phone:

1. Check the logs immediately:
   ```bash
   tail -100 logs/server.log | grep -A 20 "ERROR"
   ```

2. Look for the error section markers:
   - `========== ERROR OCCURRED ==========`
   - `========== UNCAUGHT ERROR ==========`
   - `========== UNHANDLED PROMISE REJECTION ==========`

3. The logs will show:
   - Which webhook failed
   - The exact error message
   - The full stack trace
   - The request data that caused the error

## Common Error Patterns

### Google TTS Blocked
```
[Twilio Voice] ========== ERROR OCCURRED ==========
[Twilio Voice] Error message: Google TTS API error: 403 - PERMISSION_DENIED
```
**Solution:** Enable Text-to-Speech API in Google Cloud Console

### Deepgram Connection Failed
```
[Deepgram] WebSocket error: Connection refused
```
**Solution:** Check Deepgram API key

### No Phone Call Found
```
[Twilio Voice] No phone call found for CAxxxx
```
**Solution:** Race condition - check temp ID update logic

### Gemini API Error
```
Gemini API error: Error: [GoogleGenerativeAI Error]: Invalid JSON payload
```
**Solution:** Already fixed - check Gemini API format

## Benefits

1. **Complete Visibility** - See every request and error
2. **Full Context** - Request body + error details
3. **Easy Debugging** - Stack traces show exact error location
4. **No Silent Failures** - All errors are logged
5. **Production Ready** - Logs help diagnose issues in production

## Files Modified

1. `/src/webhooks/twilioEnhanced.ts`
   - Added full request body logging to all webhooks
   - Added comprehensive error logging with stack traces

2. `/src/concept_server.ts`
   - Added global error handlers
   - Added unhandled promise rejection handler
   - Added fatal error handler

## Next Steps

1. **Restart server** - Already done! ✅
2. **Make a test call** - Watch the logs
3. **Check for errors** - Look for ERROR markers
4. **Share logs** - If you see an error, share the full error section

Now when you get an "application error", you'll see exactly what went wrong in the logs! 🎉
