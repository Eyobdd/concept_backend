# Synchronization Implementation Summary

## Overview
Successfully implemented backend synchronizations for authentication and access control. All protected endpoints now require valid session tokens, with authentication enforced at the backend level.

## Changes Made

### 1. Infrastructure Setup
- ✅ Merged upstream sync infrastructure from template repository
- ✅ Added Requesting concept for HTTP request handling
- ✅ Added sync engine for executing synchronizations
- ✅ Configured build and start scripts in `deno.json`

### 2. Route Configuration (`src/concepts/Requesting/passthrough.ts`)

#### Included Routes (Public - Pass Through Directly)
These routes are accessible without authentication:
- `/api/User/createUser` - Required for registration flow
- `/api/UserAuthentication/requestVerificationCode` - Public verification code request
- `/api/UserAuthentication/register` - Public registration endpoint
- `/api/UserAuthentication/login` - Public login endpoint
- `/api/UserAuthentication/_getVerificationCode` - Testing/debug endpoint

#### Excluded Routes (Protected - Require Syncs)
All other routes are excluded and require authentication syncs:
- **Profile**: All actions and queries (8 endpoints)
- **JournalPrompt**: All actions and queries (8 endpoints)
- **ReflectionSession**: All actions and queries (9 endpoints)
- **JournalEntry**: All actions and queries (8 endpoints)
- **CallWindow**: All actions and queries (13 endpoints)
- **UserAuthentication**: Protected actions (7 endpoints)
- **User**: Protected actions (3 endpoints)

**Total**: 56 protected endpoints

### 3. Authentication Syncs (`src/syncs/authentication.sync.ts`)

Created comprehensive authentication syncs following this pattern:

```typescript
// For Actions:
1. Request sync: Authenticate token → Extract user → Execute action
2. Response sync: Capture action result → Respond to request

// For Queries:
1. Request sync: Authenticate token → Extract user → Query data → Respond directly
```

#### Key Syncs Implemented

**Profile Syncs** (4 request syncs, 2 response syncs):
- CreateProfile, GetProfile, UpdateRatingPreference

**JournalPrompt Syncs** (7 request syncs, 3 response syncs):
- CreateDefaultPrompts, GetUserPrompts, GetActivePrompts, AddPrompt, UpdatePromptText, TogglePromptActive, DeletePrompt, ReorderPrompts

**CallWindow Syncs** (7 request syncs, 4 response syncs):
- CreateRecurringCallWindow, CreateOneOffCallWindow, GetUserCallWindows, DeleteRecurringCallWindow, DeleteOneOffCallWindow, SetDayModeCustom, ShouldUseRecurring

**ReflectionSession Syncs** (5 request syncs, 2 response syncs):
- StartSession, RecordResponse, CompleteSession, GetSessionResponses, GetSession

**JournalEntry Syncs** (5 request syncs, 1 response sync):
- CreateFromSession, GetEntriesByUser, GetEntriesWithResponsesByUser, GetEntryByDate, GetEntryResponses

**Total**: 28 request syncs, 12 response syncs (40 syncs total)

### 4. Sync Pattern Details

#### Authentication Flow
```typescript
where: async (frames) => {
  // 1. Authenticate the token
  frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
  // 2. Filter out invalid tokens (null user)
  frames = frames.filter(($) => $[user] !== null);
  // 3. For queries: fetch data and return
  frames = await frames.query(ConceptName._queryMethod, { user }, { result });
  return frames;
}
```

#### Action Execution
```typescript
then: actions([ConceptName.actionName, { user, ...otherParams }])
```

#### Query Response
```typescript
then: actions([Requesting.respond, { request, ...results }])
```

## Frontend Changes Required

The frontend API service needs to be updated to pass the session token in the request body (not just the header) for all authenticated endpoints.

### Current Frontend Pattern
```typescript
async getProfile(user: string) {
  return this.post('Profile/_getProfile', { user });
}
```

### Required Frontend Pattern
```typescript
async getProfile() {
  return this.post('Profile/_getProfile', { token: this.token });
}
```

### Key Changes
1. **Remove explicit `user` parameter** - The backend will extract it from the token
2. **Add `token` to request body** - Required for authentication sync
3. **Keep Authorization header** - Can remain for compatibility but not used by syncs

### Endpoints Requiring Updates
All authenticated endpoints (56 total) need to:
- Add `token: this.token` to request body
- Remove `user` parameter from method signature (backend extracts it)
- Keep other parameters as-is

## Security Benefits

### Before (Frontend-Only Auth)
- ❌ User could modify frontend to bypass authentication
- ❌ User could pass any user ID to access other users' data
- ❌ Authentication logic scattered across frontend code

### After (Backend Syncs)
- ✅ Authentication enforced at backend - cannot be bypassed
- ✅ User ID extracted from validated session token
- ✅ Centralized authentication logic in sync file
- ✅ Clear separation between public and protected endpoints

## Testing Strategy

### 1. Public Endpoints (Should Still Work)
- ✅ User registration flow
- ✅ Login flow
- ✅ Verification code request

### 2. Protected Endpoints (Need Frontend Updates)
After frontend updates, test:
- Profile creation and retrieval
- Journal prompt management
- Call window scheduling
- Reflection session flow
- Journal entry creation and retrieval

### 3. Security Testing
- Verify requests without tokens are rejected
- Verify requests with invalid tokens are rejected
- Verify users cannot access other users' data

## Next Steps

1. **Update Frontend API Service** - Modify all authenticated endpoint calls
2. **Test Registration/Login** - Verify public endpoints still work
3. **Test Authenticated Features** - Verify all features work with new sync pattern
4. **Deploy** - Deploy backend and frontend together
5. **Document** - Update API documentation and design notes

## Files Modified

### Backend
- `src/concepts/Requesting/passthrough.ts` - Route configuration
- `src/syncs/authentication.sync.ts` - Authentication syncs (new file)
- `deno.json` - Updated with new tasks
- `src/main.ts` - Entry point with sync registration (from upstream)
- `src/engine/*` - Sync engine (from upstream)
- `src/concepts/Requesting/*` - Requesting concept (from upstream)

### Frontend (Pending)
- `src/services/api.ts` - All authenticated method signatures

## Deployment Notes

### Backend
```bash
deno run build  # Generate concept and sync imports
deno run start  # Start server with syncs
```

### Environment Variables
- `PORT` - Server port (default: 10000)
- `REQUESTING_BASE_URL` - API base path (default: /api)
- `REQUESTING_TIMEOUT` - Request timeout (default: 10000ms)
- `MONGODB_URL` - MongoDB connection string
- `DB_NAME` - Database name

## Troubleshooting

### "Action not instrumented" Error
- Ensure `deno run build` was executed after adding syncs
- Check that concept methods are properly exported

### "UNVERIFIED ROUTE" Warnings
- Add route to `inclusions` (with justification) or `exclusions` in `passthrough.ts`
- Rebuild and restart server

### Authentication Failures
- Verify token is being passed in request body
- Check that UserAuthentication._getSessionUser returns valid user
- Ensure token hasn't expired

## References

- [Requesting Concept README](src/concepts/Requesting/README.md)
- [Implementing Synchronizations Guide](design/background/implementing-synchronizations.md)
- [Sync Background](design/tools/sync-background.md)
