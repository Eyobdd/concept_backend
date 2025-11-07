# Call Timing and Day Rating Fix

## Issues Fixed

### 1. Day Rating Loop
**Problem**: The call would repeatedly ask for the day rating regardless of the user's answer.

**Root Cause**: The logic to detect if rating was already asked was incorrect. It checked `currentIndex >= prompts.length`, but when at the last prompt, `currentIndex` is `prompts.length - 1`, so this condition was never true.

**Solution**: 
- Track if rating was asked by checking if `call.currentPromptIndex >= call.prompts.length`
- When asking for rating, advance the prompt index to mark that we've asked
- When the rating response comes back, extract and save it before finalizing the call
- Added regex pattern matching to extract rating values (-2 to 2) from the user's response

**Code Changes**:
```typescript
// Check if we've already asked for rating
const hasAskedRating = call.currentPromptIndex >= call.prompts.length;

// If we just got the rating response, save it
if (hasAskedRating && call.currentResponseBuffer.trim()) {
  const ratingMatch = call.currentResponseBuffer.match(/(-?[0-2])\b/);
  if (ratingMatch) {
    const rating = parseInt(ratingMatch[1]);
    await this.reflectionSessionConcept.setRating({
      session: call.reflectionSession,
      rating,
    });
  }
}

// If we haven't asked yet, ask for rating
if (profile?.includeRating && !hasAskedRating && !skipRating) {
  // Advance prompt index to mark that we've asked
  await this.phoneCallConcept.advanceToNextPrompt({ twilioCallSid });
  await this.playPrompt(twilioCallSid, ratingPrompt);
  return;
}
```

### 2. Long Gaps Between Prompts
**Problem**: The pauses between user responses and the next prompt felt too long due to:
- 6-second pause threshold before checking completion
- Audio generation time for TTS

**Solution**: Reduced pause threshold from 6 seconds to 3 seconds.

**Code Changes**:
```typescript
// Before:
this.pauseThreshold = config.pauseThreshold || 6; // 6s pause

// After:
this.pauseThreshold = config.pauseThreshold || 3; // 3s pause
```

This means:
- After 3 seconds of silence, the system checks if the user is done speaking
- Combined with Gemini semantic completion checking (0.75 confidence threshold)
- Fallback: If pause > 12s with content, assume complete

## Files Modified
- `/src/services/enhancedCallOrchestrator.ts`
  - Line 70: Reduced pause threshold from 6s to 3s
  - Lines 568-593: Added rating extraction and saving logic
  - Lines 595-607: Fixed rating prompt logic to prevent loops

## Testing
1. Restart the server (already done)
2. Initiate a test call with day rating enabled in user profile
3. Answer all prompts
4. When asked for day rating, say a number from -2 to 2
5. Verify:
   - Rating is asked only once
   - Rating is saved to the ReflectionSession
   - Call ends gracefully with closing message
   - Gaps between prompts feel more natural (3s vs 6s)

## Expected Behavior
- **Faster response detection**: 3 seconds of silence triggers completion check (down from 6s)
- **No rating loop**: Rating question asked once, response saved, call ends
- **Rating extraction**: Supports responses like "2", "negative 1", "I'd say 0", etc.
- **Graceful fallback**: If rating can't be extracted, call still completes normally
