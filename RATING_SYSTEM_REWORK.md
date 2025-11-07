# Rating System Rework - Summary

## Problem
The previous rating system could cause infinite loops during phone calls. The system would ask for a rating after all prompts were complete, but if it couldn't extract a valid rating from the user's response, it would get stuck in a loop trying to process the rating.

## Solution
Reworked the rating system to treat the day rating as a **regular prompt** that is included in the prompts array, with LLM-based parsing of the response. This eliminates the possibility of infinite loops.

## Key Changes

### 1. Added LLM-Based Rating Extraction (`gemini.ts`)
- **New Interface**: `RatingExtractionResult` with rating (-2 to 2 or null), confidence, and reasoning
- **New Method**: `extractRating(userResponse: string)` uses Gemini's structured output to parse ratings from spoken responses
- Handles various formats: numeric ("2", "negative 1"), word form ("two", "minus one"), or contextual ("I'd say it was a 1")
- Returns null if rating cannot be extracted with confidence >= 0.5

### 2. Rating Prompt as Special Prompt Type (`JournalPromptConcept.ts`)
- **Added Field**: `isRatingPrompt?: boolean` to `PromptTemplateDoc` interface
- **New Method**: `ensureRatingPrompt({ user })` - Creates or updates the rating prompt for a user
- **New Query**: `_getRatingPrompt({ user })` - Gets the active rating prompt if it exists
- Rating prompt text: "On a scale from negative 2 to positive 2, using whole numbers only, how would you rate your day?"
- Rating prompt is always positioned last in the prompts sequence

### 3. Simplified Call Orchestrator (`enhancedCallOrchestrator.ts`)
- **Removed**: Complex rating-specific logic in `checkAndHandleCompletion()`
- **Removed**: `extractRatingFromText()` method (replaced by LLM extraction)
- **Simplified**: `completeCall()` no longer handles rating prompts specially
- **Updated**: `handleResponseComplete()` now:
  - Detects rating prompts via `isRatingPrompt` flag
  - Calls `geminiChecker.extractRating()` to parse the response
  - Saves rating to `ReflectionSession` if confidence >= 0.5
  - Records response like any other prompt
  - Moves to next prompt or completes call normally

### 4. Worker Integration (`callSchedulerWorker.ts`)
- **Added**: `JournalPromptConcept` import and initialization
- **Added**: `DeepgramService` and `MockDeepgramService` imports
- **Updated**: Prompt fetching logic to:
  - Get active prompts from `JournalPromptConcept`
  - Check if user has `includeRating` enabled in profile
  - Automatically add rating prompt if enabled and not already present
  - Pass prompts with `isRatingPrompt` flag to orchestrator

### 5. Mock Service (`deepgram.ts`)
- **Added**: `MockDeepgramService` class for testing without real API calls

## Benefits

1. **No Infinite Loops**: Rating is just another prompt in the sequence, so the call naturally progresses
2. **Better Parsing**: LLM-based extraction handles natural language variations better than regex
3. **Graceful Degradation**: If rating can't be extracted, it's simply skipped (not saved)
4. **Consistent Architecture**: Rating follows the same flow as all other prompts
5. **User Control**: Rating prompt can be managed like other prompts (activate/deactivate via `includeRating` setting)

## Testing Recommendations

1. **Test with various rating responses**:
   - Numeric: "2", "negative 1", "0"
   - Word form: "two", "negative two", "zero"
   - Contextual: "I'd say it was a 1", "probably negative 2"
   - Ambiguous: "it was okay" (should return null)

2. **Test call flow**:
   - Verify all prompts are asked in order
   - Verify rating prompt is last (if enabled)
   - Verify call completes after rating prompt
   - Verify no infinite loops occur

3. **Test edge cases**:
   - User hangs up during rating prompt
   - User gives ambiguous rating response
   - User has `includeRating: false` in profile
   - User has no active prompts configured

## Migration Notes

- Existing users will need their rating prompt created via `ensureRatingPrompt()` when they make their next call
- The worker automatically handles this during call initiation
- No database migration required - the `isRatingPrompt` field is optional
