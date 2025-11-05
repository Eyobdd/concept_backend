/**
 * Unit tests for CallWindowScheduler
 * Tests automatic call scheduling based on call windows
 */

import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { CallWindowScheduler } from "./callWindowScheduler.ts";
import CallWindowConcept from "../concepts/CallWindow/CallWindowConcept.ts";
import CallSchedulerConcept from "../concepts/CallScheduler/CallSchedulerConcept.ts";
import ReflectionSessionConcept from "../concepts/ReflectionSession/ReflectionSessionConcept.ts";
import ProfileConcept from "../concepts/Profile/ProfileConcept.ts";
import JournalEntryConcept from "../concepts/JournalEntry/JournalEntryConcept.ts";

const userAlice = "user:alice" as ID;
const phoneNumber = "+15555551234";

Deno.test("CallWindowScheduler - Automatic call scheduling", async () => {
  const [db, client] = await testDb();
  
  try {
    console.log("\n=== CallWindowScheduler Tests ===\n");
    
    // Initialize concepts
    const callWindowConcept = new CallWindowConcept(db);
    const callSchedulerConcept = new CallSchedulerConcept(db);
    const reflectionSessionConcept = new ReflectionSessionConcept(db);
    const profileConcept = new ProfileConcept(db);
    const journalEntryConcept = new JournalEntryConcept(db);
    
    // Clean up any existing data
    await callWindowConcept.callWindows.deleteMany({ user: userAlice });
    await callSchedulerConcept.scheduledCalls.deleteMany({ user: userAlice });
    await reflectionSessionConcept.reflectionSessions.deleteMany({ user: userAlice });
    await profileConcept.profiles.deleteMany({ user: userAlice });
    await journalEntryConcept.journalEntries.deleteMany({ user: userAlice });
    
    // Test 1: Scheduler initializes correctly
    console.log("1. Testing scheduler initialization...");
    const scheduler = new CallWindowScheduler(db, { pollIntervalMinutes: 1 });
    assertNotEquals(scheduler, null, "Scheduler should be created");
    console.log("✓ Scheduler initialized");
    
    // Test 2: Create profile with phone number
    console.log("\n2. Creating user profile...");
    await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice Smith",
      phoneNumber,
      timezone: "America/New_York",
    });
    console.log("✓ Profile created");
    
    // Test 3: Create a recurring call window for today
    console.log("\n3. Creating recurring call window...");
    const now = new Date();
    const dayOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][now.getDay()];
    
    // Create window that's active right now (current hour to next hour)
    const currentHour = now.getHours();
    const startHour = currentHour;
    const endHour = currentHour + 1;
    
    const startTime = new Date();
    startTime.setHours(startHour, 0, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endHour, 0, 0, 0);
    
    const windowResult = await callWindowConcept.createRecurringCallWindow({
      user: userAlice,
      dayOfWeek: dayOfWeek as any,
      startTime,
      endTime,
    });
    
    assertEquals("error" in windowResult, false, "Window creation should succeed");
    console.log(`✓ Created recurring window for ${dayOfWeek} ${startHour}:00-${endHour}:00`);
    
    // Test 4: Run scheduler check (should schedule a call)
    console.log("\n4. Running scheduler check...");
    // Access private method for testing
    await (scheduler as any).checkAndScheduleCalls();
    
    // Verify call was scheduled
    const activeCallsResult = await callSchedulerConcept._getActiveCallsForUser({ user: userAlice });
    assertEquals(activeCallsResult.length, 1, "Should have scheduled one call");
    console.log("✓ Call was automatically scheduled");
    
    // Test 5: Verify reflection session was created
    console.log("\n5. Verifying reflection session...");
    const sessionsResult = await reflectionSessionConcept._getUserSessions({ user: userAlice });
    assertEquals(sessionsResult.length, 1, "Should have one reflection session");
    assertEquals(sessionsResult[0].status, "IN_PROGRESS", "Session should be IN_PROGRESS");
    console.log("✓ Reflection session created");
    
    // Test 6: Run scheduler again (should NOT schedule another call)
    console.log("\n6. Testing duplicate prevention...");
    await (scheduler as any).checkAndScheduleCalls();
    
    const activeCallsResult2 = await callSchedulerConcept._getActiveCallsForUser({ user: userAlice });
    assertEquals(activeCallsResult2.length, 1, "Should still have only one call");
    console.log("✓ Duplicate call prevented");
    
    // Test 7: Verify scheduler respects existing sessions
    console.log("\n7. Testing scheduler respects existing IN_PROGRESS session...");
    
    // The session from test 4 is still IN_PROGRESS
    // Run scheduler again - should not create duplicate
    await (scheduler as any).checkAndScheduleCalls();
    
    const activeCallsResult3 = await callSchedulerConcept._getActiveCallsForUser({ user: userAlice });
    assertEquals(activeCallsResult3.length, 1, "Should still have only one call");
    console.log("✓ Scheduler respects existing IN_PROGRESS session");
    
    console.log("\n✅ All CallWindowScheduler tests passed!\n");
    
    // Clean up
    await callWindowConcept.callWindows.deleteMany({ user: userAlice });
    await callSchedulerConcept.scheduledCalls.deleteMany({ user: userAlice });
    await reflectionSessionConcept.reflectionSessions.deleteMany({ user: userAlice });
    await profileConcept.profiles.deleteMany({ user: userAlice });
    await journalEntryConcept.journalEntries.deleteMany({ user: userAlice });
    
  } finally {
    await client.close();
  }
});
