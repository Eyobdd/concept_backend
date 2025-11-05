import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import CallSchedulerConcept from "./CallSchedulerConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const session1 = "session:1" as ID;
const session2 = "session:2" as ID;
const session3 = "session:3" as ID;

Deno.test("Principle: Schedule call, attempt, retry on failure, eventually complete", async () => {
  const [db, client] = await testDb();
  const schedulerConcept = new CallSchedulerConcept(db);

  try {
    console.log("\n=== Testing Operational Principle ===");

    // 1. Schedule call
    console.log("\n1. Scheduling call...");
    const scheduleResult = await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    assertNotEquals("error" in scheduleResult, true, "Schedule should succeed");
    console.log("   ✓ Call scheduled");

    // 2. Mark in progress (first attempt)
    console.log("\n2. Starting first attempt...");
    await schedulerConcept.markInProgress({ callSession: session1 });
    console.log("   ✓ First attempt started");

    // 3. Fail and retry
    console.log("\n3. First attempt failed, scheduling retry...");
    await schedulerConcept.markFailedAndRetry({
      callSession: session1,
      retryDelayMinutes: 5,
    });
    console.log("   ✓ Retry scheduled");

    // 4. Second attempt
    console.log("\n4. Starting second attempt...");
    await schedulerConcept.markInProgress({ callSession: session1 });
    console.log("   ✓ Second attempt started");

    // 5. Complete successfully
    console.log("\n5. Completing call...");
    await schedulerConcept.markCompleted({ callSession: session1 });
    console.log("   ✓ Call completed");

    // 6. Verify final state
    const callResult = await schedulerConcept._getScheduledCall({ callSession: session1 });
    const call = callResult[0].call!;
    assertEquals(call.status, "COMPLETED");
    assertEquals(call.attemptCount, 2);
    assertNotEquals(call.completedAt, undefined);
    console.log("   ✓ Final state verified: COMPLETED after 2 attempts");

    console.log("\n=== Operational Principle Test Passed ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: scheduleCall validates maxRetries", async () => {
  const [db, client] = await testDb();
  const schedulerConcept = new CallSchedulerConcept(db);

  try {
    console.log("\n=== Testing maxRetries Validation ===");

    // Valid maxRetries
    const result1 = await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 1,
    });
    assertEquals("error" in result1, false, "Minimum maxRetries should succeed");
    console.log("✓ maxRetries=1 accepted");

    // Invalid: 0
    const result2 = await schedulerConcept.scheduleCall({
      user: userBob,
      callSession: session2,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 0,
    });
    assertEquals("error" in result2, true, "maxRetries=0 should fail");
    console.log("✓ maxRetries=0 rejected");

    // Invalid: negative
    const result3 = await schedulerConcept.scheduleCall({
      user: userBob,
      callSession: session2,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: -1,
    });
    assertEquals("error" in result3, true, "Negative maxRetries should fail");
    console.log("✓ Negative maxRetries rejected");

    // Invalid: non-integer
    const result4 = await schedulerConcept.scheduleCall({
      user: userBob,
      callSession: session2,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 2.5,
    });
    assertEquals("error" in result4, true, "Non-integer maxRetries should fail");
    console.log("✓ Non-integer maxRetries rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: scheduleCall prevents duplicate active calls", async () => {
  const [db, client] = await testDb();
  const schedulerConcept = new CallSchedulerConcept(db);

  try {
    console.log("\n=== Testing Duplicate Prevention ===");

    // Schedule first call
    const result1 = await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    assertEquals("error" in result1, false, "First schedule should succeed");
    console.log("✓ First call scheduled");

    // Try to schedule duplicate
    const result2 = await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    assertEquals("error" in result2, true, "Duplicate should fail");
    console.log("✓ Duplicate schedule rejected");

    // Mark first as in progress
    await schedulerConcept.markInProgress({ callSession: session1 });
    console.log("✓ First call marked in progress");

    // Try to schedule again (still should fail)
    const result3 = await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    assertEquals("error" in result3, true, "Duplicate with IN_PROGRESS should fail");
    console.log("✓ Duplicate with IN_PROGRESS rejected");

    // Complete the call
    await schedulerConcept.markCompleted({ callSession: session1 });
    console.log("✓ First call completed");

    // Now scheduling should work again
    const result4 = await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    assertEquals("error" in result4, false, "Schedule after completion should succeed");
    console.log("✓ New schedule after completion succeeded");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: markInProgress validates status and increments attemptCount", async () => {
  const [db, client] = await testDb();
  const schedulerConcept = new CallSchedulerConcept(db);

  try {
    console.log("\n=== Testing markInProgress ===");

    // Schedule call
    await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    console.log("✓ Call scheduled");

    // Verify initial state
    let callResult = await schedulerConcept._getScheduledCall({ callSession: session1 });
    let call = callResult[0].call!;
    assertEquals(call.attemptCount, 0);
    assertEquals(call.status, "PENDING");
    console.log("✓ Initial state: attemptCount=0, status=PENDING");

    // Mark in progress
    const result = await schedulerConcept.markInProgress({ callSession: session1 });
    assertEquals("error" in result, false, "Mark in progress should succeed");
    console.log("✓ Marked in progress");

    // Verify updated state
    callResult = await schedulerConcept._getScheduledCall({ callSession: session1 });
    call = callResult[0].call!;
    assertEquals(call.attemptCount, 1);
    assertEquals(call.status, "IN_PROGRESS");
    assertNotEquals(call.lastAttemptAt, undefined);
    console.log("✓ Updated state: attemptCount=1, status=IN_PROGRESS");

    // Try to mark in progress again (should fail)
    const result2 = await schedulerConcept.markInProgress({ callSession: session1 });
    assertEquals("error" in result2, true, "Second mark should fail");
    console.log("✓ Duplicate mark in progress rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: markFailedAndRetry sets nextRetryAt correctly", async () => {
  const [db, client] = await testDb();
  const schedulerConcept = new CallSchedulerConcept(db);

  try {
    console.log("\n=== Testing Retry Scheduling ===");

    // Schedule and start call
    await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    await schedulerConcept.markInProgress({ callSession: session1 });
    console.log("✓ Call started");

    // Mark for retry
    const beforeRetry = Date.now();
    const result = await schedulerConcept.markFailedAndRetry({
      callSession: session1,
      retryDelayMinutes: 5,
    });
    assertEquals("error" in result, false, "Retry should succeed");
    console.log("✓ Retry scheduled");

    // Verify state
    const callResult = await schedulerConcept._getScheduledCall({ callSession: session1 });
    const call = callResult[0].call!;
    assertEquals(call.status, "PENDING");
    assertEquals(call.attemptCount, 1);
    assertNotEquals(call.nextRetryAt, undefined);

    // Verify retry time is approximately 5 minutes in future
    const retryTime = call.nextRetryAt!.getTime();
    const expectedTime = beforeRetry + 5 * 60 * 1000;
    const timeDiff = Math.abs(retryTime - expectedTime);
    assertEquals(timeDiff < 1000, true, "Retry time should be ~5 minutes in future");
    console.log("✓ nextRetryAt set correctly (~5 minutes in future)");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: markFailedAndRetry enforces maxRetries limit", async () => {
  const [db, client] = await testDb();
  const schedulerConcept = new CallSchedulerConcept(db);

  try {
    console.log("\n=== Testing maxRetries Enforcement ===");

    // Schedule with maxRetries=2
    await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 2,
    });
    console.log("✓ Call scheduled with maxRetries=2");

    // First attempt
    await schedulerConcept.markInProgress({ callSession: session1 });
    await schedulerConcept.markFailedAndRetry({
      callSession: session1,
      retryDelayMinutes: 5,
    });
    console.log("✓ Attempt 1 failed, retry scheduled");

    // Second attempt
    await schedulerConcept.markInProgress({ callSession: session1 });
    console.log("✓ Attempt 2 started");

    // Try to retry again (should fail - at maxRetries)
    const result = await schedulerConcept.markFailedAndRetry({
      callSession: session1,
      retryDelayMinutes: 5,
    });
    assertEquals("error" in result, true, "Retry beyond maxRetries should fail");
    console.log("✓ Retry beyond maxRetries correctly rejected");

    // Should use markFailed instead
    const failResult = await schedulerConcept.markFailed({
      callSession: session1,
      error: "Max retries exceeded",
    });
    assertEquals("error" in failResult, false, "markFailed should succeed");
    console.log("✓ markFailed succeeded");

    // Verify final state
    const callResult = await schedulerConcept._getScheduledCall({ callSession: session1 });
    const call = callResult[0].call!;
    assertEquals(call.status, "FAILED");
    assertEquals(call.attemptCount, 2);
    assertEquals(call.errorMessage, "Max retries exceeded");
    console.log("✓ Final state: FAILED with error message");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: markCompleted validates status", async () => {
  const [db, client] = await testDb();
  const schedulerConcept = new CallSchedulerConcept(db);

  try {
    console.log("\n=== Testing markCompleted ===");

    // Schedule call
    await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    console.log("✓ Call scheduled");

    // Try to complete without starting (should fail)
    const result1 = await schedulerConcept.markCompleted({ callSession: session1 });
    assertEquals("error" in result1, true, "Complete without IN_PROGRESS should fail");
    console.log("✓ Complete without IN_PROGRESS rejected");

    // Start call
    await schedulerConcept.markInProgress({ callSession: session1 });
    console.log("✓ Call started");

    // Complete successfully
    const result2 = await schedulerConcept.markCompleted({ callSession: session1 });
    assertEquals("error" in result2, false, "Complete should succeed");
    console.log("✓ Call completed");

    // Verify state
    const callResult = await schedulerConcept._getScheduledCall({ callSession: session1 });
    const call = callResult[0].call!;
    assertEquals(call.status, "COMPLETED");
    assertNotEquals(call.completedAt, undefined);
    console.log("✓ Status set to COMPLETED with completedAt");

    // Try to complete again (should fail)
    const result3 = await schedulerConcept.markCompleted({ callSession: session1 });
    assertEquals("error" in result3, true, "Duplicate complete should fail");
    console.log("✓ Duplicate complete rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: cancelCall works from PENDING and IN_PROGRESS", async () => {
  const [db, client] = await testDb();
  const schedulerConcept = new CallSchedulerConcept(db);

  try {
    console.log("\n=== Testing cancelCall ===");

    // Test canceling PENDING call
    await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    const result1 = await schedulerConcept.cancelCall({ callSession: session1 });
    assertEquals("error" in result1, false, "Cancel PENDING should succeed");
    console.log("✓ PENDING call cancelled");

    // Test canceling IN_PROGRESS call
    await schedulerConcept.scheduleCall({
      user: userBob,
      callSession: session2,
      phoneNumber: "+13105551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    await schedulerConcept.markInProgress({ callSession: session2 });
    const result2 = await schedulerConcept.cancelCall({ callSession: session2 });
    assertEquals("error" in result2, false, "Cancel IN_PROGRESS should succeed");
    console.log("✓ IN_PROGRESS call cancelled");

    // Test canceling COMPLETED call (should fail)
    await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session3,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    await schedulerConcept.markInProgress({ callSession: session3 });
    await schedulerConcept.markCompleted({ callSession: session3 });
    const result3 = await schedulerConcept.cancelCall({ callSession: session3 });
    assertEquals("error" in result3, true, "Cancel COMPLETED should fail");
    console.log("✓ Cancel COMPLETED correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPendingCalls returns calls ready for processing", async () => {
  const [db, client] = await testDb();
  const schedulerConcept = new CallSchedulerConcept(db);

  try {
    console.log("\n=== Testing _getPendingCalls Query ===");

    const now = new Date();
    const past = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
    const future = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

    // Schedule call in past (should be returned)
    await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: past,
      maxRetries: 3,
    });
    console.log("✓ Scheduled call in past");

    // Schedule call in future (should not be returned)
    await schedulerConcept.scheduleCall({
      user: userBob,
      callSession: session2,
      phoneNumber: "+13105551234",
      scheduledFor: future,
      maxRetries: 3,
    });
    console.log("✓ Scheduled call in future");

    // Schedule call with retry in past (should be returned)
    await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session3,
      phoneNumber: "+12025551234",
      scheduledFor: future,
      maxRetries: 3,
    });
    await schedulerConcept.markInProgress({ callSession: session3 });
    await schedulerConcept.markFailedAndRetry({
      callSession: session3,
      retryDelayMinutes: -5, // Negative to set in past
    });
    console.log("✓ Scheduled retry in past");

    // Query pending calls
    const pending = await schedulerConcept._getPendingCalls({ beforeTime: now });
    assertEquals(pending.length, 2, "Should return 2 pending calls");
    console.log(`✓ Found ${pending.length} pending calls`);

    // Verify ordering (by scheduledFor)
    assertEquals(pending[0].callSession, session1);
    console.log("✓ Calls ordered by scheduledFor");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getActiveCallsForUser returns user's active calls", async () => {
  const [db, client] = await testDb();
  const schedulerConcept = new CallSchedulerConcept(db);

  try {
    console.log("\n=== Testing _getActiveCallsForUser Query ===");

    // Schedule multiple calls for Alice
    await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session1,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    await schedulerConcept.scheduleCall({
      user: userAlice,
      callSession: session2,
      phoneNumber: "+12025551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    console.log("✓ Scheduled 2 calls for Alice");

    // Mark one as in progress
    await schedulerConcept.markInProgress({ callSession: session1 });
    console.log("✓ Marked one as IN_PROGRESS");

    // Schedule call for Bob
    await schedulerConcept.scheduleCall({
      user: userBob,
      callSession: session3,
      phoneNumber: "+13105551234",
      scheduledFor: new Date(),
      maxRetries: 3,
    });
    console.log("✓ Scheduled 1 call for Bob");

    // Query Alice's active calls
    const aliceCalls = await schedulerConcept._getActiveCallsForUser({ user: userAlice });
    assertEquals(aliceCalls.length, 2, "Alice should have 2 active calls");
    console.log("✓ Alice has 2 active calls");

    // Query Bob's active calls
    const bobCalls = await schedulerConcept._getActiveCallsForUser({ user: userBob });
    assertEquals(bobCalls.length, 1, "Bob should have 1 active call");
    console.log("✓ Bob has 1 active call");

    // Complete Alice's first call
    await schedulerConcept.markCompleted({ callSession: session1 });
    console.log("✓ Completed Alice's first call");

    // Query again
    const aliceCallsAfter = await schedulerConcept._getActiveCallsForUser({ user: userAlice });
    assertEquals(aliceCallsAfter.length, 1, "Alice should now have 1 active call");
    console.log("✓ Alice now has 1 active call");
    console.log();
  } finally {
    await client.close();
  }
});
