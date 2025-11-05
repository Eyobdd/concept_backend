/**
 * Integration tests for CallScheduler with ReflectionSession
 * Tests the full flow of scheduling and processing calls
 */

import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import CallSchedulerConcept from "./CallSchedulerConcept.ts";
import ReflectionSessionConcept from "../ReflectionSession/ReflectionSessionConcept.ts";
import ProfileConcept from "../Profile/ProfileConcept.ts";

const userAlice = "user:alice" as ID;
const session1 = "session:test1" as ID;
const session2 = "session:test2" as ID;
const session3 = "session:test3" as ID;
const phoneNumber = "+15555551234";

Deno.test("CallScheduler Integration - One call per reflection session", async () => {
  const [db, client] = await testDb();
  
  try {
    console.log("\n=== CallScheduler Integration Tests ===\n");
    
    const callSchedulerConcept = new CallSchedulerConcept(db);
    const reflectionSessionConcept = new ReflectionSessionConcept(db);
    const profileConcept = new ProfileConcept(db);
    
    // Clean up
    await callSchedulerConcept.scheduledCalls.deleteMany({ user: userAlice });
    await reflectionSessionConcept.reflectionSessions.deleteMany({ user: userAlice });
    await profileConcept.profiles.deleteMany({ user: userAlice });
    
    // Test 1: One call per reflection session enforcement
    console.log("1. Testing one call per reflection session...");
    
    const callSession = session1;
    const scheduledFor = new Date();
    
    // Schedule first call
    const result1 = await callSchedulerConcept.scheduleCall({
      user: userAlice,
      callSession,
      phoneNumber,
      scheduledFor,
      maxRetries: 3,
    });
    
    assertEquals("error" in result1, false, "First call should succeed");
    console.log("✓ First call scheduled");
    
    // Try to schedule second call for same session
    const result2 = await callSchedulerConcept.scheduleCall({
      user: userAlice,
      callSession,
      phoneNumber,
      scheduledFor,
      maxRetries: 3,
    });
    
    assertEquals("error" in result2, true, "Second call should fail");
    assertEquals(
      (result2 as any).error.includes("already has an active scheduled call"),
      true,
      "Error should mention existing call"
    );
    console.log("✓ Duplicate call prevented");
    
    // Test 2: Can schedule after cancelling
    console.log("\n2. Testing schedule after cancel...");
    
    await callSchedulerConcept.cancelCall({ callSession });
    
    const result3 = await callSchedulerConcept.scheduleCall({
      user: userAlice,
      callSession,
      phoneNumber,
      scheduledFor,
      maxRetries: 3,
    });
    
    assertEquals("error" in result3, false, "Should succeed after cancel");
    console.log("✓ Can schedule after cancelling");
    
    // Test 3: Verify call completion flow
    console.log("\n3. Testing call completion flow...");
    
    // Schedule a new call for testing completion
    const callSession3 = session3;
    await callSchedulerConcept.scheduleCall({
      user: userAlice,
      callSession: callSession3,
      phoneNumber,
      scheduledFor,
      maxRetries: 3,
    });
    
    await callSchedulerConcept.markInProgress({ callSession: callSession3 });
    await callSchedulerConcept.markCompleted({ callSession: callSession3 });
    
    const completedCall = await callSchedulerConcept._getScheduledCall({ callSession: callSession3 });
    assertEquals(completedCall[0].call?.status, "COMPLETED", "Status should be COMPLETED");
    console.log("✓ Call completion flow works");
    
    // Test 4: Different sessions can have concurrent calls
    console.log("\n4. Testing concurrent calls for different sessions...");
    
    const callSession2 = session2;
    
    const result5 = await callSchedulerConcept.scheduleCall({
      user: userAlice,
      callSession: callSession2,
      phoneNumber,
      scheduledFor,
      maxRetries: 3,
    });
    
    assertEquals("error" in result5, false, "Different session should succeed");
    
    const activeCalls = await callSchedulerConcept._getActiveCallsForUser({ user: userAlice });
    assertEquals(activeCalls.length, 2, "Should have two active calls");
    console.log("✓ Different sessions can have concurrent calls");
    
    // Test 5: Pending calls query
    console.log("\n5. Testing pending calls query...");
    
    const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
    const pendingCalls = await callSchedulerConcept._getPendingCalls({ beforeTime: futureTime });
    
    assertEquals(pendingCalls.length >= 2, true, "Should find pending calls");
    console.log(`✓ Found ${pendingCalls.length} pending calls`);
    
    // Test 6: Mark in progress
    console.log("\n6. Testing mark in progress...");
    
    // Use callSession2 which is still PENDING
    const markResult = await callSchedulerConcept.markInProgress({ callSession: callSession2 });
    assertEquals("error" in markResult, false, "Should mark in progress");
    
    // Try to mark again
    const markResult2 = await callSchedulerConcept.markInProgress({ callSession: callSession2 });
    assertEquals("error" in markResult2, true, "Should not mark twice");
    console.log("✓ Mark in progress works correctly");
    
    // Test 7: Retry logic
    console.log("\n7. Testing retry logic...");
    
    const callSessionRetry = "session:retry" as ID;
    await callSchedulerConcept.scheduleCall({
      user: userAlice,
      callSession: callSessionRetry,
      phoneNumber,
      scheduledFor,
      maxRetries: 3,
    });
    
    await callSchedulerConcept.markInProgress({ callSession: callSessionRetry });
    
    const retryResult = await callSchedulerConcept.markFailedAndRetry({
      callSession: callSessionRetry,
      retryDelayMinutes: 5,
    });
    
    assertEquals("error" in retryResult, false, "Retry should succeed");
    
    const call = await callSchedulerConcept._getScheduledCall({ callSession: callSessionRetry });
    assertEquals(call[0].call?.status, "PENDING", "Status should be PENDING after retry");
    assertEquals(call[0].call?.attemptCount, 1, "Attempt count should increment");
    assertNotEquals(call[0].call?.nextRetryAt, undefined, "Should have retry time");
    console.log("✓ Retry logic works correctly");
    
    console.log("\n✅ All integration tests passed!\n");
    
    // Clean up
    await callSchedulerConcept.scheduledCalls.deleteMany({ user: userAlice });
    await reflectionSessionConcept.reflectionSessions.deleteMany({ user: userAlice });
    await profileConcept.profiles.deleteMany({ user: userAlice });
    
  } finally {
    await client.close();
  }
});

Deno.test("CallScheduler Integration - Date handling", async () => {
  const [db, client] = await testDb();
  
  try {
    console.log("\n=== CallScheduler Date Handling Tests ===\n");
    
    const callSchedulerConcept = new CallSchedulerConcept(db);
    
    // Clean up
    await callSchedulerConcept.scheduledCalls.deleteMany({ user: userAlice });
    
    // Test 1: Date object scheduling
    console.log("1. Testing Date object scheduling...");
    
    const dateObj = new Date();
    const result1 = await callSchedulerConcept.scheduleCall({
      user: userAlice,
      callSession: "session:date1" as ID,
      phoneNumber,
      scheduledFor: dateObj,
      maxRetries: 3,
    });
    
    assertEquals("error" in result1, false, "Date object should work");
    console.log("✓ Date object scheduling works");
    
    // Test 2: ISO string scheduling
    console.log("\n2. Testing ISO string scheduling...");
    
    const isoString = new Date().toISOString();
    const result2 = await callSchedulerConcept.scheduleCall({
      user: userAlice,
      callSession: "session:date2" as ID,
      phoneNumber,
      scheduledFor: isoString as any,
      maxRetries: 3,
    });
    
    assertEquals("error" in result2, false, "ISO string should work");
    console.log("✓ ISO string scheduling works");
    
    // Test 3: Query with both date types
    console.log("\n3. Testing query with mixed date types...");
    
    const futureTime = new Date(Date.now() + 3600000);
    const pendingCalls = await callSchedulerConcept._getPendingCalls({ beforeTime: futureTime });
    
    assertEquals(pendingCalls.length >= 2, true, "Should find both calls");
    console.log(`✓ Found ${pendingCalls.length} calls with mixed date types`);
    
    // Test 4: Verify date storage
    console.log("\n4. Verifying date storage...");
    
    const call1 = await callSchedulerConcept._getScheduledCall({ callSession: "session:date1" as ID });
    const call2 = await callSchedulerConcept._getScheduledCall({ callSession: "session:date2" as ID });
    
    assertNotEquals(call1[0].call?.scheduledFor, undefined, "Date should be stored");
    assertNotEquals(call2[0].call?.scheduledFor, undefined, "Date should be stored");
    console.log("✓ Dates stored correctly");
    
    console.log("\n✅ All date handling tests passed!\n");
    
    // Clean up
    await callSchedulerConcept.scheduledCalls.deleteMany({ user: userAlice });
    
  } finally {
    await client.close();
  }
});
