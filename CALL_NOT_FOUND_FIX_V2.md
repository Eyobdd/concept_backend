# Call Not Found Error - Complete Fix

## Problem
Getting "Call not found" error when picking up the phone, even after the initial race condition fix.

## Potential Causes

### 1. Error Handling Missing
The orchestrator wasn't checking if PhoneCall creation failed. The `initiateCall` method can return an error (e.g., if there's already an IN_PROGRESS call), but we weren't handling it.

### 2. Timing Issue
Even though we initiate the Twilio call first, there might still be a very small race condition where the webhook arrives before the PhoneCall record is fully written to MongoDB.

### 3. Stale IN_PROGRESS Calls
If a previous call wasn't cleaned up properly, it could block new calls from being created.

## Solutions Applied

### 1. Added Error Handling (Lines 100-122)
```typescript
const phoneCallResult = await this.phoneCallConcept.initiateCall({
  user,
  reflectionSession,
  twilioCallSid,
});

if ('error' in phoneCallResult) {
  console.error(`[EnhancedOrchestrator] Failed to create PhoneCall record: ${phoneCallResult.error}`);
  // Try to cancel the Twilio call since we can't track it
  try {
    await this.twilioService.endCall(twilioCallSid);
  } catch (endError) {
    console.error(`[EnhancedOrchestrator] Failed to end Twilio call: ${endError}`);
  }
  throw new Error(phoneCallResult.error);
}
```

Now if PhoneCall creation fails (e.g., due to existing IN_PROGRESS call), we:
- Log the error clearly
- Cancel the Twilio call
- Throw an error to prevent the call from proceeding

### 2. Added 100ms Delay (Line 94)
```typescript
// Small delay to ensure Twilio call is fully registered before webhook arrives
await new Promise(resolve => setTimeout(resolve, 100));
```

This gives the PhoneCall record time to be written to MongoDB before Twilio's webhook arrives.

### 3. Added Prompts Error Handling (Lines 119-122)
```typescript
if ('error' in setPromptsResult) {
  console.error(`[EnhancedOrchestrator] Failed to set prompts: ${setPromptsResult.error}`);
  throw new Error(setPromptsResult.error);
}
```

## Files Modified
- `/src/services/enhancedCallOrchestrator.ts` (lines 82-131)

## Debugging Steps

If you still get "Call not found", check the logs for:

1. **PhoneCall creation error**:
   ```
   [EnhancedOrchestrator] Failed to create PhoneCall record: User X already has an IN_PROGRESS phone call
   ```
   **Solution**: Clean up stale calls in MongoDB or wait for them to timeout

2. **Prompts setting error**:
   ```
   [EnhancedOrchestrator] Failed to set prompts: Phone call with SID X not found
   ```
   **Solution**: Increase the delay or check MongoDB write latency

3. **Webhook timing**:
   ```
   [Twilio Voice] No phone call found for CA...
   ```
   **Solution**: Increase the delay from 100ms to 200ms or 500ms

## Manual Cleanup (if needed)

If there are stale IN_PROGRESS calls blocking new ones:

```javascript
// In MongoDB shell or via API
db.PhoneCall.phoneCalls.updateMany(
  { status: "IN_PROGRESS" },
  { $set: { status: "ABANDONED" } }
)
```

## To Apply
```bash
cd /Users/eyobdavidoff/Documents/GitHub/6.1040/concept_backend
pkill -9 deno
deno task build
deno run --allow-all src/concept_server.ts
```

## Expected Log Flow (Success)
```
[EnhancedOrchestrator] Initiating Twilio call to +1234567890
[EnhancedOrchestrator] Twilio call initiated with SID: CA...
[EnhancedOrchestrator] PhoneCall record created: 019a...
[EnhancedOrchestrator] PhoneCall fully configured with SID: CA...
[Twilio Voice] CallSid: CA..., Status: initiated
[Twilio Voice] PhoneCall lookup result: Found (ID: 019a...)
```
