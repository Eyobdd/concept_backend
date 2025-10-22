import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ReflectionSessionConcept from "./ReflectionSessionConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const callSession1 = "callSession:1" as ID;
const prompt1 = "prompt:1" as ID;
const prompt2 = "prompt:2" as ID;
const prompt3 = "prompt:3" as ID;

const samplePrompts = [
  { promptId: prompt1, promptText: "What are you grateful for?" },
  { promptId: prompt2, promptText: "What did you do today?" },
  { promptId: prompt3, promptText: "What are you proud of?" },
];

Deno.test("Principle: User starts session, records responses, sets rating, and completes", async () => {
  const [db, client] = await testDb();
  const reflectionConcept = new ReflectionSessionConcept(db);

  try {
    console.log("\n=== Testing Operational Principle ===");

    // 1. Start session
    console.log("\n1. Starting reflection session...");
    const startResult = await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: samplePrompts,
    });
    assertNotEquals("error" in startResult, true, "Start should succeed");
    const { session } = startResult as { session: ID };
    console.log(`   ✓ Session started: ${session}`);

    // 2. Record responses
    console.log("\n2. Recording responses...");
    for (let i = 0; i < samplePrompts.length; i++) {
      const result = await reflectionConcept.recordResponse({
        session,
        promptId: samplePrompts[i].promptId,
        promptText: samplePrompts[i].promptText,
        position: i + 1,
        responseText: `Response to prompt ${i + 1}`,
      });
      assertEquals("error" in result, false, `Response ${i + 1} should succeed`);
    }
    console.log(`   ✓ Recorded ${samplePrompts.length} responses`);

    // 3. Set rating
    console.log("\n3. Setting rating...");
    const ratingResult = await reflectionConcept.setRating({
      session,
      rating: 2,
    });
    assertEquals("error" in ratingResult, false, "Rating should succeed");
    console.log("   ✓ Rating set to 2");

    // 4. Complete session
    console.log("\n4. Completing session...");
    const completeResult = await reflectionConcept.completeSession({
      session,
      expectedPromptCount: samplePrompts.length,
    });
    assertEquals("error" in completeResult, false, "Complete should succeed");
    console.log("   ✓ Session completed");

    // 5. Verify final state
    const sessionDoc = await reflectionConcept._getSession({ session });
    assertEquals(sessionDoc!.status, "COMPLETED");
    assertEquals(sessionDoc!.rating, 2);
    assertNotEquals(sessionDoc!.endedAt, undefined);
    console.log("   ✓ Final state verified: COMPLETED with rating 2");

    console.log("\n=== Operational Principle Test Passed ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: startSession enforces one IN_PROGRESS session per user", async () => {
  const [db, client] = await testDb();
  const reflectionConcept = new ReflectionSessionConcept(db);

  try {
    console.log("\n=== Testing Single Active Session ===");

    // Start first session
    const result1 = await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: samplePrompts,
    });
    assertEquals("error" in result1, false, "First session should succeed");
    console.log("✓ First session started");

    // Try to start second session
    const result2 = await reflectionConcept.startSession({
      user: userAlice,
      callSession: "callSession:2" as ID,
      prompts: samplePrompts,
    });
    assertEquals("error" in result2, true, "Second session should fail");
    console.log("✓ Second session correctly rejected");

    // Different user should succeed
    const result3 = await reflectionConcept.startSession({
      user: userBob,
      callSession: "callSession:3" as ID,
      prompts: samplePrompts,
    });
    assertEquals("error" in result3, false, "Different user should succeed");
    console.log("✓ Different user session succeeded");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: startSession validates prompt count", async () => {
  const [db, client] = await testDb();
  const reflectionConcept = new ReflectionSessionConcept(db);

  try {
    console.log("\n=== Testing Prompt Count Validation ===");

    // Too few prompts
    const result1 = await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: [],
    });
    assertEquals("error" in result1, true, "Empty prompts should fail");
    console.log("✓ Empty prompts rejected");

    // Too many prompts
    const tooMany = Array(6).fill(samplePrompts[0]);
    const result2 = await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: tooMany,
    });
    assertEquals("error" in result2, true, "6 prompts should fail");
    console.log("✓ 6 prompts rejected");

    // Valid count
    const result3 = await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: samplePrompts,
    });
    assertEquals("error" in result3, false, "3 prompts should succeed");
    console.log("✓ 3 prompts accepted");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: recordResponse validates session state", async () => {
  const [db, client] = await testDb();
  const reflectionConcept = new ReflectionSessionConcept(db);

  try {
    console.log("\n=== Testing Response Recording Validation ===");

    // Start session
    const { session } = (await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: samplePrompts,
    })) as { session: ID };

    // Record response
    const result1 = await reflectionConcept.recordResponse({
      session,
      promptId: prompt1,
      promptText: "Test prompt",
      position: 1,
      responseText: "Test response",
    });
    assertEquals("error" in result1, false, "First response should succeed");
    console.log("✓ Response recorded");

    // Try duplicate position
    const result2 = await reflectionConcept.recordResponse({
      session,
      promptId: prompt2,
      promptText: "Another prompt",
      position: 1,
      responseText: "Another response",
    });
    assertEquals("error" in result2, true, "Duplicate position should fail");
    console.log("✓ Duplicate position rejected");

    // Complete session
    await reflectionConcept.setRating({ session, rating: 1 });
    await reflectionConcept.recordResponse({
      session,
      promptId: prompt2,
      promptText: "Prompt 2",
      position: 2,
      responseText: "Response 2",
    });
    await reflectionConcept.recordResponse({
      session,
      promptId: prompt3,
      promptText: "Prompt 3",
      position: 3,
      responseText: "Response 3",
    });
    await reflectionConcept.completeSession({ session, expectedPromptCount: 3 });

    // Try to record after completion
    const result3 = await reflectionConcept.recordResponse({
      session,
      promptId: prompt1,
      promptText: "Late prompt",
      position: 4,
      responseText: "Late response",
    });
    assertEquals("error" in result3, true, "Response after completion should fail");
    console.log("✓ Response after completion rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: setRating validates rating value", async () => {
  const [db, client] = await testDb();
  const reflectionConcept = new ReflectionSessionConcept(db);

  try {
    console.log("\n=== Testing Rating Validation ===");

    const { session } = (await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: samplePrompts,
    })) as { session: ID };

    // Valid ratings
    for (const rating of [-2, -1, 0, 1, 2]) {
      const result = await reflectionConcept.setRating({ session, rating });
      assertEquals("error" in result, false, `Rating ${rating} should succeed`);
    }
    console.log("✓ All valid ratings (-2 to 2) accepted");

    // Invalid ratings
    for (const rating of [-3, 3, 1.5, NaN]) {
      const result = await reflectionConcept.setRating({ session, rating });
      assertEquals("error" in result, true, `Rating ${rating} should fail`);
    }
    console.log("✓ All invalid ratings rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: completeSession validates requirements", async () => {
  const [db, client] = await testDb();
  const reflectionConcept = new ReflectionSessionConcept(db);

  try {
    console.log("\n=== Testing Completion Requirements ===");

    const { session } = (await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: samplePrompts,
    })) as { session: ID };

    // Try to complete without rating
    const result1 = await reflectionConcept.completeSession({
      session,
      expectedPromptCount: 3,
    });
    assertEquals("error" in result1, true, "Complete without rating should fail");
    console.log("✓ Completion without rating rejected");

    // Set rating but missing responses
    await reflectionConcept.setRating({ session, rating: 1 });
    const result2 = await reflectionConcept.completeSession({
      session,
      expectedPromptCount: 3,
    });
    assertEquals("error" in result2, true, "Complete without all responses should fail");
    console.log("✓ Completion without all responses rejected");

    // Add all responses
    for (let i = 0; i < 3; i++) {
      await reflectionConcept.recordResponse({
        session,
        promptId: samplePrompts[i].promptId,
        promptText: samplePrompts[i].promptText,
        position: i + 1,
        responseText: `Response ${i + 1}`,
      });
    }

    // Now should succeed
    const result3 = await reflectionConcept.completeSession({
      session,
      expectedPromptCount: 3,
    });
    assertEquals("error" in result3, false, "Complete with all requirements should succeed");
    console.log("✓ Completion with all requirements succeeded");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: abandonSession works correctly", async () => {
  const [db, client] = await testDb();
  const reflectionConcept = new ReflectionSessionConcept(db);

  try {
    console.log("\n=== Testing Session Abandonment ===");

    const { session } = (await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: samplePrompts,
    })) as { session: ID };

    // Record partial responses
    await reflectionConcept.recordResponse({
      session,
      promptId: prompt1,
      promptText: "Prompt 1",
      position: 1,
      responseText: "Response 1",
    });
    console.log("✓ Recorded partial response");

    // Abandon session
    const abandonResult = await reflectionConcept.abandonSession({ session });
    assertEquals("error" in abandonResult, false, "Abandon should succeed");
    console.log("✓ Session abandoned");

    // Verify state
    const sessionDoc = await reflectionConcept._getSession({ session });
    assertEquals(sessionDoc!.status, "ABANDONED");
    assertNotEquals(sessionDoc!.endedAt, undefined);
    console.log("✓ Status set to ABANDONED with endedAt");

    // Can't record more responses
    const result = await reflectionConcept.recordResponse({
      session,
      promptId: prompt2,
      promptText: "Prompt 2",
      position: 2,
      responseText: "Response 2",
    });
    assertEquals("error" in result, true, "Response after abandon should fail");
    console.log("✓ Cannot record responses after abandonment");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getSessionResponses returns ordered responses", async () => {
  const [db, client] = await testDb();
  const reflectionConcept = new ReflectionSessionConcept(db);

  try {
    console.log("\n=== Testing Response Ordering ===");

    const { session } = (await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: samplePrompts,
    })) as { session: ID };

    // Record responses out of order
    await reflectionConcept.recordResponse({
      session,
      promptId: prompt3,
      promptText: "Prompt 3",
      position: 3,
      responseText: "Response 3",
    });
    await reflectionConcept.recordResponse({
      session,
      promptId: prompt1,
      promptText: "Prompt 1",
      position: 1,
      responseText: "Response 1",
    });
    await reflectionConcept.recordResponse({
      session,
      promptId: prompt2,
      promptText: "Prompt 2",
      position: 2,
      responseText: "Response 2",
    });

    // Retrieve responses
    const responses = await reflectionConcept._getSessionResponses({ session });
    assertEquals(responses.length, 3);
    assertEquals(responses[0].position, 1);
    assertEquals(responses[1].position, 2);
    assertEquals(responses[2].position, 3);
    console.log("✓ Responses returned in correct order (1, 2, 3)");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Complete reflection workflow", async () => {
  const [db, client] = await testDb();
  const reflectionConcept = new ReflectionSessionConcept(db);

  try {
    console.log("\n=== Testing Complete Workflow ===");

    // Start session
    const { session } = (await reflectionConcept.startSession({
      user: userAlice,
      callSession: callSession1,
      prompts: samplePrompts,
    })) as { session: ID };
    console.log("✓ Step 1: Session started");

    // Record all responses
    for (let i = 0; i < samplePrompts.length; i++) {
      await reflectionConcept.recordResponse({
        session,
        promptId: samplePrompts[i].promptId,
        promptText: samplePrompts[i].promptText,
        position: i + 1,
        responseText: `My answer to: ${samplePrompts[i].promptText}`,
      });
    }
    console.log(`✓ Step 2: Recorded ${samplePrompts.length} responses`);

    // Set rating
    await reflectionConcept.setRating({ session, rating: 1 });
    console.log("✓ Step 3: Rating set");

    // Complete session
    await reflectionConcept.completeSession({ session, expectedPromptCount: 3 });
    console.log("✓ Step 4: Session completed");

    // Verify final state
    const sessionDoc = await reflectionConcept._getSession({ session });
    const responses = await reflectionConcept._getSessionResponses({ session });

    assertEquals(sessionDoc!.status, "COMPLETED");
    assertEquals(sessionDoc!.rating, 1);
    assertEquals(responses.length, 3);
    assertNotEquals(sessionDoc!.endedAt, undefined);

    console.log("✓ Step 5: All data verified");
    console.log(`  - Status: ${sessionDoc!.status}`);
    console.log(`  - Rating: ${sessionDoc!.rating}`);
    console.log(`  - Responses: ${responses.length}`);
    console.log();
  } finally {
    await client.close();
  }
});
