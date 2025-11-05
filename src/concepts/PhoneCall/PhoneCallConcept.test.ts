import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PhoneCallConcept from "./PhoneCallConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const session1 = "session:1" as ID;
const session2 = "session:2" as ID;
const callSid1 = "CA1234567890abcdef1234567890abcdef";
const callSid2 = "CA1234567890abcdef1234567890abcde2";

Deno.test("Principle: Phone call lifecycle from initiation to completion", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing Operational Principle ===");

    // 1. Initiate call
    console.log("\n1. Initiating phone call...");
    const initiateResult = await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    assertNotEquals("error" in initiateResult, true, "Initiate should succeed");
    const { phoneCall } = initiateResult as { phoneCall: ID };
    console.log(`   ✓ Call initiated: ${phoneCall}`);

    // 2. Mark connected
    console.log("\n2. Marking call as connected...");
    const connectResult = await phoneCallConcept.markConnected({ twilioCallSid: callSid1 });
    assertEquals("error" in connectResult, false, "Connect should succeed");
    console.log("   ✓ Call connected");

    // 3. Start prompting
    console.log("\n3. Starting prompting phase...");
    const promptResult = await phoneCallConcept.startPrompting({ twilioCallSid: callSid1 });
    assertEquals("error" in promptResult, false, "Start prompting should succeed");
    console.log("   ✓ Prompting started");

    // 4. Append transcript
    console.log("\n4. Appending to transcript...");
    await phoneCallConcept.appendToTranscript({
      twilioCallSid: callSid1,
      text: "User: I'm grateful for my family. ",
    });
    await phoneCallConcept.appendToTranscript({
      twilioCallSid: callSid1,
      text: "They support me every day.",
    });
    console.log("   ✓ Transcript appended");

    // 5. Advance to next prompt
    console.log("\n5. Advancing to next prompt...");
    const advanceResult = await phoneCallConcept.advanceToNextPrompt({
      twilioCallSid: callSid1,
      totalPrompts: 3,
    });
    assertEquals("error" in advanceResult, false, "Advance should succeed");
    console.log("   ✓ Advanced to next prompt");

    // 6. Complete call
    console.log("\n6. Completing call...");
    const completeResult = await phoneCallConcept.markCompleted({ twilioCallSid: callSid1 });
    assertEquals("error" in completeResult, false, "Complete should succeed");
    console.log("   ✓ Call completed");

    // 7. Verify final state
    const callData = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid1 });
    const call = callData[0].call!;
    assertEquals(call.status, "COMPLETED");
    assertEquals(call.currentPromptIndex, 1);
    assertNotEquals(call.completedAt, undefined);
    assertEquals(
      call.accumulatedTranscript,
      "User: I'm grateful for my family. They support me every day.",
    );
    console.log("   ✓ Final state verified");

    console.log("\n=== Operational Principle Test Passed ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: initiateCall enforces one IN_PROGRESS call per user", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing Single Active Call ===");

    // Start first call
    const result1 = await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    assertEquals("error" in result1, false, "First call should succeed");
    console.log("✓ First call initiated");

    // Mark it as IN_PROGRESS
    await phoneCallConcept.markConnected({ twilioCallSid: callSid1 });
    await phoneCallConcept.startPrompting({ twilioCallSid: callSid1 });
    console.log("✓ First call marked IN_PROGRESS");

    // Try to start second call for same user
    const result2 = await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session2,
      twilioCallSid: callSid2,
    });
    assertEquals("error" in result2, true, "Second call should fail");
    console.log("✓ Second call correctly rejected");

    // Different user should succeed
    const result3 = await phoneCallConcept.initiateCall({
      user: userBob,
      reflectionSession: session2,
      twilioCallSid: callSid2,
    });
    assertEquals("error" in result3, false, "Different user should succeed");
    console.log("✓ Different user call succeeded");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: markConnected validates status transition", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing markConnected Validation ===");

    // Initiate call
    await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    console.log("✓ Call initiated");

    // Mark connected (should succeed)
    const result1 = await phoneCallConcept.markConnected({ twilioCallSid: callSid1 });
    assertEquals("error" in result1, false, "First connect should succeed");
    console.log("✓ Call marked as connected");

    // Try to mark connected again (should fail)
    const result2 = await phoneCallConcept.markConnected({ twilioCallSid: callSid1 });
    assertEquals("error" in result2, true, "Second connect should fail");
    console.log("✓ Duplicate connect correctly rejected");

    // Try with non-existent call SID
    const result3 = await phoneCallConcept.markConnected({ twilioCallSid: "invalid" });
    assertEquals("error" in result3, true, "Non-existent SID should fail");
    console.log("✓ Non-existent SID correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: startPrompting validates status transition", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing startPrompting Validation ===");

    // Initiate and connect call
    await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    await phoneCallConcept.markConnected({ twilioCallSid: callSid1 });
    console.log("✓ Call initiated and connected");

    // Start prompting (should succeed)
    const result1 = await phoneCallConcept.startPrompting({ twilioCallSid: callSid1 });
    assertEquals("error" in result1, false, "Start prompting should succeed");
    console.log("✓ Prompting started");

    // Try to start prompting again (should fail)
    const result2 = await phoneCallConcept.startPrompting({ twilioCallSid: callSid1 });
    assertEquals("error" in result2, true, "Second start should fail");
    console.log("✓ Duplicate start correctly rejected");

    // Try starting prompting on INITIATED call (should fail)
    await phoneCallConcept.initiateCall({
      user: userBob,
      reflectionSession: session2,
      twilioCallSid: callSid2,
    });
    const result3 = await phoneCallConcept.startPrompting({ twilioCallSid: callSid2 });
    assertEquals("error" in result3, true, "Start on INITIATED should fail");
    console.log("✓ Start on INITIATED correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: appendToTranscript accumulates text correctly", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing Transcript Accumulation ===");

    // Setup call
    await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    await phoneCallConcept.markConnected({ twilioCallSid: callSid1 });
    await phoneCallConcept.startPrompting({ twilioCallSid: callSid1 });
    console.log("✓ Call setup complete");

    // Append multiple times
    await phoneCallConcept.appendToTranscript({
      twilioCallSid: callSid1,
      text: "First part. ",
    });
    await phoneCallConcept.appendToTranscript({
      twilioCallSid: callSid1,
      text: "Second part. ",
    });
    await phoneCallConcept.appendToTranscript({
      twilioCallSid: callSid1,
      text: "Third part.",
    });
    console.log("✓ Appended 3 transcript segments");

    // Verify accumulation
    const callData = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid1 });
    const call = callData[0].call!;
    assertEquals(
      call.accumulatedTranscript,
      "First part. Second part. Third part.",
    );
    assertEquals(
      call.currentResponseBuffer,
      "First part. Second part. Third part.",
    );
    console.log("✓ Transcript accumulated correctly");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: advanceToNextPrompt clears buffer and increments index", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing Prompt Advancement ===");

    // Setup call
    await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    await phoneCallConcept.markConnected({ twilioCallSid: callSid1 });
    await phoneCallConcept.startPrompting({ twilioCallSid: callSid1 });
    console.log("✓ Call setup complete");

    // Add some text
    await phoneCallConcept.appendToTranscript({
      twilioCallSid: callSid1,
      text: "Response to prompt 1",
    });
    console.log("✓ Added response text");

    // Verify initial state
    let callData = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid1 });
    let call = callData[0].call!;
    assertEquals(call.currentPromptIndex, 0);
    assertEquals(call.currentResponseBuffer, "Response to prompt 1");
    console.log("✓ Initial state verified (index=0, buffer has text)");

    // Advance to next prompt
    const result = await phoneCallConcept.advanceToNextPrompt({
      twilioCallSid: callSid1,
      totalPrompts: 3,
    });
    assertEquals("error" in result, false, "Advance should succeed");
    console.log("✓ Advanced to next prompt");

    // Verify state after advance
    callData = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid1 });
    call = callData[0].call!;
    assertEquals(call.currentPromptIndex, 1);
    assertEquals(call.currentResponseBuffer, "");
    assertEquals(call.accumulatedTranscript, "Response to prompt 1");
    console.log("✓ State after advance verified (index=1, buffer cleared, transcript preserved)");

    // Try to advance past last prompt
    await phoneCallConcept.advanceToNextPrompt({
      twilioCallSid: callSid1,
      totalPrompts: 3,
    });
    const result2 = await phoneCallConcept.advanceToNextPrompt({
      twilioCallSid: callSid1,
      totalPrompts: 3,
    });
    assertEquals("error" in result2, true, "Advance past last should fail");
    console.log("✓ Advance past last prompt correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: markCompleted validates status and sets timestamp", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing Call Completion ===");

    // Setup call
    await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    await phoneCallConcept.markConnected({ twilioCallSid: callSid1 });
    await phoneCallConcept.startPrompting({ twilioCallSid: callSid1 });
    console.log("✓ Call setup complete");

    // Mark completed
    const result = await phoneCallConcept.markCompleted({ twilioCallSid: callSid1 });
    assertEquals("error" in result, false, "Complete should succeed");
    console.log("✓ Call marked as completed");

    // Verify state
    const callData = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid1 });
    const call = callData[0].call!;
    assertEquals(call.status, "COMPLETED");
    assertNotEquals(call.completedAt, undefined);
    console.log("✓ Status and timestamp verified");

    // Try to complete again (should fail)
    const result2 = await phoneCallConcept.markCompleted({ twilioCallSid: callSid1 });
    assertEquals("error" in result2, true, "Second complete should fail");
    console.log("✓ Duplicate complete correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: markAbandoned works from any non-terminal status", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing Call Abandonment ===");

    // Test abandoning from INITIATED
    await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    const result1 = await phoneCallConcept.markAbandoned({
      twilioCallSid: callSid1,
      reason: "User hung up",
    });
    assertEquals("error" in result1, false, "Abandon from INITIATED should succeed");
    console.log("✓ Abandoned from INITIATED status");

    // Verify state
    let callData = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid1 });
    let call = callData[0].call!;
    assertEquals(call.status, "ABANDONED");
    assertEquals(call.errorMessage, "User hung up");
    assertNotEquals(call.completedAt, undefined);
    console.log("✓ Abandonment state verified");

    // Test abandoning from IN_PROGRESS
    await phoneCallConcept.initiateCall({
      user: userBob,
      reflectionSession: session2,
      twilioCallSid: callSid2,
    });
    await phoneCallConcept.markConnected({ twilioCallSid: callSid2 });
    await phoneCallConcept.startPrompting({ twilioCallSid: callSid2 });
    const result2 = await phoneCallConcept.markAbandoned({
      twilioCallSid: callSid2,
      reason: "Connection lost",
    });
    assertEquals("error" in result2, false, "Abandon from IN_PROGRESS should succeed");
    console.log("✓ Abandoned from IN_PROGRESS status");

    // Try to abandon already abandoned call
    const result3 = await phoneCallConcept.markAbandoned({
      twilioCallSid: callSid1,
      reason: "Test",
    });
    assertEquals("error" in result3, true, "Abandon ABANDONED call should fail");
    console.log("✓ Duplicate abandon correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: markFailed works from any non-terminal status", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing Call Failure ===");

    // Setup call
    await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    await phoneCallConcept.markConnected({ twilioCallSid: callSid1 });
    await phoneCallConcept.startPrompting({ twilioCallSid: callSid1 });
    console.log("✓ Call setup complete");

    // Mark failed
    const result = await phoneCallConcept.markFailed({
      twilioCallSid: callSid1,
      error: "Network error",
    });
    assertEquals("error" in result, false, "Mark failed should succeed");
    console.log("✓ Call marked as failed");

    // Verify state
    const callData = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid1 });
    const call = callData[0].call!;
    assertEquals(call.status, "FAILED");
    assertEquals(call.errorMessage, "Network error");
    assertNotEquals(call.completedAt, undefined);
    console.log("✓ Failure state verified");

    // Try to mark failed again
    const result2 = await phoneCallConcept.markFailed({
      twilioCallSid: callSid1,
      error: "Another error",
    });
    assertEquals("error" in result2, true, "Second fail should fail");
    console.log("✓ Duplicate fail correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getActivePhoneCall returns IN_PROGRESS call", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing Active Call Query ===");

    // No active call initially
    let activeData = await phoneCallConcept._getActivePhoneCall({ user: userAlice });
    assertEquals(activeData[0].call, null);
    console.log("✓ No active call initially");

    // Create and start call
    await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    await phoneCallConcept.markConnected({ twilioCallSid: callSid1 });
    await phoneCallConcept.startPrompting({ twilioCallSid: callSid1 });
    console.log("✓ Call started");

    // Should find active call
    activeData = await phoneCallConcept._getActivePhoneCall({ user: userAlice });
    assertNotEquals(activeData[0].call, null);
    assertEquals(activeData[0].call!.status, "IN_PROGRESS");
    assertEquals(activeData[0].call!.twilioCallSid, callSid1);
    console.log("✓ Active call found");

    // Complete the call
    await phoneCallConcept.markCompleted({ twilioCallSid: callSid1 });
    console.log("✓ Call completed");

    // Should not find active call anymore
    activeData = await phoneCallConcept._getActivePhoneCall({ user: userAlice });
    assertEquals(activeData[0].call, null);
    console.log("✓ No active call after completion");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPhoneCallBySession returns call for session", async () => {
  const [db, client] = await testDb();
  const phoneCallConcept = new PhoneCallConcept(db);

  try {
    console.log("\n=== Testing Session Call Query ===");

    // Create call
    await phoneCallConcept.initiateCall({
      user: userAlice,
      reflectionSession: session1,
      twilioCallSid: callSid1,
    });
    console.log("✓ Call created");

    // Query by session
    const sessionData = await phoneCallConcept._getPhoneCallBySession({
      reflectionSession: session1,
    });
    assertNotEquals(sessionData[0].call, null);
    assertEquals(sessionData[0].call!.reflectionSession, session1);
    assertEquals(sessionData[0].call!.twilioCallSid, callSid1);
    console.log("✓ Call found by session");

    // Query non-existent session
    const noData = await phoneCallConcept._getPhoneCallBySession({
      reflectionSession: session2,
    });
    assertEquals(noData[0].call, null);
    console.log("✓ Non-existent session returns null");
    console.log();
  } finally {
    await client.close();
  }
});
