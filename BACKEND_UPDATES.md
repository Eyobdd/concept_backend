# Backend Concept Specification Updates

This document tracks updates made to concept specification files to align them with their current implementations.

## Update Date: October 30, 2024

### Overview
All concept specification files have been updated to accurately reflect their current TypeScript implementations. The specifications now include all actions, queries, and state components that exist in the code.

---

## CallWindowConcept

### State Additions
- **DayMode**: Added new state component to track whether a day uses recurring (default) or custom (one-off) windows
  - Fields: `user`, `date`, `useRecurring` (Flag)

### Actions Added
1. **setDayModeCustom(user, date)**: Sets a day to use one-off windows instead of recurring
2. **setDayModeRecurring(user, date)**: Sets a day to use recurring windows (default mode)
3. **shouldUseRecurring(user, date)**: Query to check if a day should display recurring or one-off windows

### Existing Actions
- All existing actions (create/delete recurring and one-off windows, merge overlapping) remain unchanged
- `mergeOverlappingOneOffWindows` action was already documented in spec

---

## CallSessionConcept

### Status
✅ **No changes needed** - Specification already matches implementation perfectly

---

## JournalEntryConcept

### Queries Added
- **_getEntriesWithResponsesByUser(user)**: Returns journal entries with their prompt responses embedded, ordered by date descending

### Queries Updated
- **_getEntryByDate(user, date)**: Updated to return `null` instead of error when no entry exists (matches implementation)

---

## JournalPromptConcept

### Actions Updated
- **createDefaultPrompts(user)**: Updated to reflect that only **4 default prompts** are created (not 5):
  1. "What are you grateful for today?"
  2. "What did you do today?"
  3. "What are you proud of today?"
  4. "What do you want to do tomorrow?"

### Status
- All other actions and queries match implementation

---

## ProfileConcept

### State Additions
- **includeRating** (Flag): Whether to include day rating prompt in reflection calls
  - Default value: `true`

### Actions Added
- **updateRatingPreference(user, includeRating)**: Updates the user's preference for including rating prompts

### Actions Updated
- **createProfile**: Now sets `includeRating` to `true` by default

### Queries Added
- **_getAllProfiles()**: Returns all profiles in the system

### Queries Updated
- **_getProfile(user)**: Updated to return `null` instead of error when profile doesn't exist

---

## ReflectionSessionConcept

### Principle Updated
- Updated to reflect that **rating is optional** (not required for session completion)
- User may optionally provide a rating from -2 to 2

### Invariants Updated
- Changed from "For a COMPLETED session, rating must be set" to "If rating is set, it must be an integer in {-2, -1, 0, 1, 2}"

### Actions Updated
- **completeSession**: 
  - Added `expectedPromptCount` parameter
  - Removed requirement that rating must be set
  - Rating is now optional based on user's profile preference

### Queries Added
- **_getSession(session)**: Returns a specific session by ID, or null if not found

### Queries Updated
- **_getActiveSession(user)**: Updated to return `null` instead of error when no active session exists

---

## UserConcept

### Status
✅ **No changes needed** - Specification already matches implementation perfectly

---

## UserAuthenticationConcept

### Actions Added
- **createVerifiedCredentials(user, phoneNumber, code)**: Helper action for frontend registration flow
  - Creates credentials after verification
  - Automatically creates session and returns token
  - Used to streamline registration process

### Queries Added
- **_getUserSessions(user)**: Returns all active sessions for a user
- **_getVerificationCode(phoneNumber)**: Returns verification code for testing purposes

### Queries Updated
- **_getSessionUser(token)**: Updated to return `null` instead of error for invalid/expired tokens
- **_getUserByPhone(phoneNumber)**: Updated to return `null` instead of error when user not found

---

## Summary of Changes

### Concepts with Major Updates
1. **CallWindowConcept**: Added day mode functionality (3 new actions + state)
2. **ProfileConcept**: Added rating preference feature (1 new field + 1 new action)
3. **ReflectionSessionConcept**: Made rating optional (principle + invariants + actions updated)
4. **UserAuthenticationConcept**: Added helper action and queries for better frontend integration

### Concepts with Minor Updates
1. **JournalEntryConcept**: Added 1 query, updated return types
2. **JournalPromptConcept**: Corrected default prompt count (4 not 5)

### Concepts Unchanged
1. **CallSessionConcept**: Already aligned ✅
2. **UserConcept**: Already aligned ✅

---

## Implementation Notes

### Type Flexibility
All implementations accept both `Date` objects and ISO string formats for date/time parameters, with automatic conversion. This flexibility supports both backend-to-backend calls and frontend API requests.

### Error Handling
Implementations consistently return error objects (`{ error: string }`) for validation failures and precondition violations, while queries return `null` for not-found cases.

### Timezone Handling
- **JournalEntryConcept** uses user's timezone from ProfileConcept to determine creation dates
- Ensures journal entries are dated according to user's local time, not UTC

### Default Values
- Profile `includeRating`: defaults to `true`
- DayMode `useRecurring`: defaults to `true` (when no mode is set)
- ReflectionSession `rating`: defaults to `0` if not provided

---

## Verification

All specification updates have been verified against the TypeScript implementations in:
- `/concept_backend/src/concepts/*/[ConceptName]Concept.ts`

Each specification file maintains the standard concept format:
- concept name and type parameters
- purpose
- principle
- state
- invariants (where applicable)
- actions (with requires/effects)
- queries (prefixed with `_`)
