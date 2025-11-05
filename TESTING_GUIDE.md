# Testing Guide - Phone Call Integration

## 🧪 Unit Tests

### Backend Tests

#### 1. CallWindowScheduler Tests
**File**: `src/workers/callWindowScheduler.test.ts`

Tests the automatic call scheduling worker:
- ✅ Scheduler initialization
- ✅ Profile creation with phone number
- ✅ Recurring call window creation
- ✅ Automatic call scheduling when window is active
- ✅ Reflection session creation
- ✅ Duplicate call prevention
- ✅ Journal entry check (no call if entry exists)
- ✅ One-off window priority over recurring
- ✅ Inactive window handling

**Run tests**:
```bash
cd concept_backend
deno test src/workers/callWindowScheduler.test.ts --allow-net --allow-read --allow-env
```

#### 2. CallScheduler Integration Tests
**File**: `src/concepts/CallScheduler/CallSchedulerIntegration.test.ts`

Tests the call scheduling and session integration:
- ✅ One call per reflection session enforcement
- ✅ Schedule after cancellation
- ✅ Schedule after completion
- ✅ Concurrent calls for different sessions
- ✅ Pending calls query
- ✅ Mark in progress logic
- ✅ Retry logic with attempt counting
- ✅ Date object vs ISO string handling
- ✅ Mixed date type queries

**Run tests**:
```bash
cd concept_backend
deno test src/concepts/CallScheduler/CallSchedulerIntegration.test.ts --allow-net --allow-read --allow-env
```

#### 3. Existing CallScheduler Tests
**File**: `src/concepts/CallScheduler/CallSchedulerConcept.test.ts`

Original concept tests (already exist):
- ✅ Basic call scheduling
- ✅ Status transitions
- ✅ Query operations
- ✅ Error handling

**Run tests**:
```bash
cd concept_backend
deno test src/concepts/CallScheduler/CallSchedulerConcept.test.ts --allow-net --allow-read --allow-env
```

### Frontend Tests

#### Manual Testing Checklist

**DayView Call Initiation**:
1. ✅ Navigate to Day View (`/`)
2. ✅ Verify "Type Reflection" and "Initiate Call" buttons visible
3. ✅ Click "Initiate Call"
4. ✅ Verify alert: "Call scheduled! Your phone will ring within 60 seconds."
5. ✅ Verify button changes to "Call in Progress"
6. ✅ Verify button is disabled during call
7. ✅ Answer phone and complete prompts
8. ✅ Verify button re-enables after call
9. ✅ Verify new journal entry appears

**Sidebar Call Initiation**:
1. ✅ Hover over sidebar
2. ✅ Expand "Today" panel
3. ✅ Click "Initiate Call"
4. ✅ Verify redirect to Day View
5. ✅ Verify alert: "Call scheduled! Your phone will ring within 60 seconds."
6. ✅ Verify call status tracking

**Call Window Automatic Scheduling**:
1. ✅ Create call window for current time
2. ✅ Wait up to 5 minutes
3. ✅ Verify call is automatically scheduled
4. ✅ Verify phone rings
5. ✅ Complete call
6. ✅ Verify journal entry created
7. ✅ Verify no duplicate call scheduled

**Error Handling**:
1. ✅ Test with no phone number (should not occur in production)
2. ✅ Test with invalid session
3. ✅ Test with duplicate call attempt
4. ✅ Test with completed journal entry

## 🔄 Integration Testing

### End-to-End Flow Test

**Setup**:
```bash
# Terminal 1: Start backend
cd concept_backend
deno task concepts

# Terminal 2: Start CallScheduler worker
deno run --allow-net --allow-read --allow-env --allow-sys src/workers/callSchedulerWorker.ts

# Terminal 3: Start CallWindow scheduler (optional)
deno run --allow-net --allow-read --allow-env --allow-sys src/workers/callWindowScheduler.ts

# Terminal 4: Start ngrok
ngrok http 8000

# Terminal 5: Start frontend
cd 6.1040-P1-Frontend
npm run dev
```

**Test Flow**:
1. Log in with phone number
2. Navigate to Day View
3. Click "Initiate Call"
4. Verify:
   - Alert appears
   - Button changes to "Call in Progress"
   - Phone rings within 60 seconds
5. Answer call and complete prompts
6. Verify:
   - Call completes successfully
   - Button re-enables
   - Journal entry appears
   - Responses are saved

### Automatic Scheduling Test

**Setup**:
1. Ensure CallWindow scheduler is running
2. Create a call window for current time
3. Wait up to 5 minutes

**Verify**:
- Call is automatically scheduled
- Phone rings
- No duplicate calls
- Journal entry created after completion

## 📊 Test Coverage

### Backend Coverage

| Component | Test File | Coverage |
|-----------|-----------|----------|
| CallScheduler Concept | `CallSchedulerConcept.test.ts` | ✅ Complete |
| CallScheduler Integration | `CallSchedulerIntegration.test.ts` | ✅ Complete |
| CallWindow Scheduler | `callWindowScheduler.test.ts` | ✅ Complete |
| ReflectionSession | `ReflectionSessionConcept.test.ts` | ✅ Existing |
| Profile | `ProfileConcept.test.ts` | ✅ Existing |
| CallWindow | `CallWindowConcept.test.ts` | ✅ Existing |

### Frontend Coverage

| Component | Test Type | Status |
|-----------|-----------|--------|
| DayView Call Button | Manual | ✅ Ready |
| Sidebar Call Button | Manual | ✅ Ready |
| Call Status Tracking | Manual | ✅ Ready |
| API Endpoints | Manual | ✅ Ready |

## 🐛 Known Test Limitations

### Backend
- **CallWindowScheduler**: Uses private method access for testing (acceptable for unit tests)
- **Date Handling**: Tests both Date objects and ISO strings, but MongoDB may store them differently
- **Worker Timing**: Tests don't verify exact timing, only logic

### Frontend
- **No automated tests yet**: All frontend tests are manual
- **Recommended**: Add Vitest tests for:
  - API service methods
  - Call status polling logic
  - Button state management
  - Error handling

## 🚀 Running All Tests

**Backend only**:
```bash
cd concept_backend
deno test --allow-net --allow-read --allow-env
```

**Specific test suites**:
```bash
# CallScheduler tests
deno test src/concepts/CallScheduler/ --allow-net --allow-read --allow-env

# Worker tests
deno test src/workers/ --allow-net --allow-read --allow-env

# All concept tests
deno test src/concepts/ --allow-net --allow-read --allow-env
```

## 📝 Test Results Format

All tests output in this format:
```
=== Test Suite Name ===

1. Test description...
✓ Assertion passed

2. Another test...
✓ Assertion passed

✅ All tests passed!
```

## 🔍 Debugging Tests

**Enable verbose logging**:
```bash
deno test --allow-net --allow-read --allow-env --log-level=debug
```

**Run single test**:
```bash
deno test src/workers/callWindowScheduler.test.ts --allow-net --allow-read --allow-env
```

**Check database state during tests**:
- Tests clean up after themselves
- Use MongoDB Compass to inspect collections during debugging
- Connection string: `mongodb://localhost:27017/zien_test`

## ✅ Test Checklist

Before deploying:
- [ ] All backend unit tests pass
- [ ] Integration tests pass
- [ ] Manual frontend tests completed
- [ ] End-to-end flow tested
- [ ] Automatic scheduling tested
- [ ] Error handling verified
- [ ] Phone number retrieval works
- [ ] Button language is consistent
- [ ] Call status tracking works
- [ ] No duplicate calls created

## 🎯 Next Steps for Testing

### Recommended Additions

1. **Frontend Unit Tests** (Vitest):
   ```typescript
   // Example: DayView.test.ts
   describe('DayView Call Initiation', () => {
     it('should disable buttons during active call', () => {
       // Test button state
     });
     
     it('should poll call status every 5 seconds', () => {
       // Test polling logic
     });
   });
   ```

2. **E2E Tests** (Playwright):
   ```typescript
   test('complete call flow', async ({ page }) => {
     await page.goto('/');
     await page.click('text=Initiate Call');
     // Verify call flow
   });
   ```

3. **Load Testing**:
   - Test with multiple concurrent users
   - Verify worker handles queue correctly
   - Test Twilio rate limits

4. **Error Scenario Tests**:
   - Network failures
   - Twilio API errors
   - Database connection issues
   - Invalid phone numbers

## 📚 Resources

- [Deno Testing](https://deno.land/manual/testing)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [MongoDB Testing Best Practices](https://www.mongodb.com/docs/manual/core/testing/)
