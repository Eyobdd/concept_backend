import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import CallSessionConcept from "./CallSessionConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const journalEntry1 = "journal:entry1" as ID;
const journalEntry2 = "journal:entry2" as ID;

Deno.test("Principle: User creates call session, enqueues it, and marks it completed", async () => {
  const [db, client] = await testDb();
  const callSessionConcept = new CallSessionConcept(db);

  try {
    console.log("\n=== Testing Operational Principle ===");

    // 1. Create a call session for a user on a specific date
    console.log("\n1. Creating call session for Alice on 2025-01-15...");
    const createResult = await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-01-15",
      source: "SCHEDULED",
    });
    assertNotEquals(
      "error" in createResult,
      true,
      "Call session creation should succeed.",
    );
    const { callSession } = createResult as { callSession: ID };
    console.log(`   ✓ Created call session: ${callSession}`);

    // Verify initial state
    const session = await callSessionConcept._getCallSession({
      user: userAlice,
      onDate: "2025-01-15",
    });
    assertEquals(session?.status, "PENDING", "Initial status should be PENDING");
    assertEquals(session?.numRetries, 0, "Initial retries should be 0");
    assertEquals(session?.source, "SCHEDULED", "Source should be SCHEDULED");
    console.log(
      `   ✓ Session state: status=${session?.status}, retries=${session?.numRetries}, source=${session?.source}`,
    );

    // 2. Enqueue the call for execution
    console.log("\n2. Enqueuing call session...");
    const enqueueResult = await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-01-15",
    });
    assertEquals(
      "error" in enqueueResult,
      false,
      "Enqueuing should succeed.",
    );
    console.log("   ✓ Call session enqueued successfully");

    // Verify queue state
    const queue = await callSessionConcept._getCallQueue();
    assertEquals(queue.length, 1, "Queue should contain one call session");
    assertEquals(
      queue[0],
      callSession,
      "Queue should contain our call session",
    );
    console.log(`   ✓ Queue contains ${queue.length} session(s)`);

    // Verify retry count incremented
    const sessionAfterEnqueue = await callSessionConcept._getCallSession({
      user: userAlice,
      onDate: "2025-01-15",
    });
    assertEquals(
      sessionAfterEnqueue?.numRetries,
      1,
      "Retry count should be incremented",
    );
    assertNotEquals(
      sessionAfterEnqueue?.lastAttempt,
      undefined,
      "lastAttempt should be set",
    );
    console.log(
      `   ✓ Session updated: retries=${sessionAfterEnqueue?.numRetries}, lastAttempt set`,
    );

    // 3. Mark the call as completed with a journal entry
    console.log("\n3. Marking call as completed...");
    const completeResult = await callSessionConcept.markCallCompleted({
      user: userAlice,
      onDate: "2025-01-15",
      entry: journalEntry1,
    });
    assertEquals(
      "error" in completeResult,
      false,
      "Marking completed should succeed.",
    );
    console.log("   ✓ Call marked as COMPLETED");

    // Verify final state
    const completedSession = await callSessionConcept._getCallSession({
      user: userAlice,
      onDate: "2025-01-15",
    });
    assertEquals(
      completedSession?.status,
      "COMPLETED",
      "Status should be COMPLETED",
    );
    assertEquals(
      completedSession?.journalEntry,
      journalEntry1,
      "Journal entry should be set",
    );
    console.log(
      `   ✓ Final state: status=${completedSession?.status}, journalEntry=${completedSession?.journalEntry}`,
    );

    // Verify removed from queue
    const queueAfterComplete = await callSessionConcept._getCallQueue();
    assertEquals(
      queueAfterComplete.length,
      0,
      "Queue should be empty after completion",
    );
    console.log("   ✓ Session removed from queue");

    console.log("\n=== Operational Principle Test Passed ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createCallSession enforces uniqueness constraint", async () => {
  const [db, client] = await testDb();
  const callSessionConcept = new CallSessionConcept(db);

  try {
    console.log("\n=== Testing createCallSession Uniqueness ===");

    // Create first session
    const result1 = await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-01-20",
      source: "MANUAL",
    });
    assertNotEquals(
      "error" in result1,
      true,
      "First creation should succeed.",
    );
    console.log("✓ First session created successfully");

    // Attempt to create duplicate session
    const result2 = await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-01-20",
      source: "SCHEDULED",
    });
    assertEquals(
      "error" in result2,
      true,
      "Duplicate creation should fail.",
    );
    console.log("✓ Duplicate creation correctly rejected");

    // Different date should work
    const result3 = await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-01-21",
      source: "MANUAL",
    });
    assertNotEquals(
      "error" in result3,
      true,
      "Different date should succeed.",
    );
    console.log("✓ Different date creation succeeded");

    // Different user should work
    const result4 = await callSessionConcept.createCallSession({
      user: userBob,
      onDate: "2025-01-20",
      source: "MANUAL",
    });
    assertNotEquals(
      "error" in result4,
      true,
      "Different user should succeed.",
    );
    console.log("✓ Different user creation succeeded\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteCallSession removes session and clears from queue", async () => {
  const [db, client] = await testDb();
  const callSessionConcept = new CallSessionConcept(db);

  try {
    console.log("\n=== Testing deleteCallSession ===");

    // Create and enqueue a session
    await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-02-01",
      source: "MANUAL",
    });
    await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-02-01",
    });

    // Verify it's in the queue
    let queue = await callSessionConcept._getCallQueue();
    assertEquals(queue.length, 1, "Queue should have one session");
    console.log("✓ Session created and enqueued");

    // Delete the session
    const deleteResult = await callSessionConcept.deleteCallSession({
      user: userAlice,
      onDate: "2025-02-01",
    });
    assertEquals("error" in deleteResult, false, "Deletion should succeed.");
    console.log("✓ Session deleted");

    // Verify session is gone
    const session = await callSessionConcept._getCallSession({
      user: userAlice,
      onDate: "2025-02-01",
    });
    assertEquals(session, null, "Session should not exist");
    console.log("✓ Session removed from database");

    // Verify removed from queue
    queue = await callSessionConcept._getCallQueue();
    assertEquals(queue.length, 0, "Queue should be empty");
    console.log("✓ Session removed from queue");

    // Attempt to delete non-existent session
    const deleteResult2 = await callSessionConcept.deleteCallSession({
      user: userAlice,
      onDate: "2025-02-01",
    });
    assertEquals(
      "error" in deleteResult2,
      true,
      "Deleting non-existent session should fail.",
    );
    console.log("✓ Deletion of non-existent session correctly rejected\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: enqueueCall enforces all requirements", async () => {
  const [db, client] = await testDb();
  const callSessionConcept = new CallSessionConcept(db);

  try {
    console.log("\n=== Testing enqueueCall Requirements ===");

    // Requirement: Session must exist
    const result1 = await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-03-01",
    });
    assertEquals(
      "error" in result1,
      true,
      "Enqueuing non-existent session should fail.",
    );
    console.log("✓ Requirement: Session must exist - enforced");

    // Create a session
    await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-03-01",
      source: "MANUAL",
    });

    // Requirement: Status must be PENDING
    await callSessionConcept.markCallCompleted({
      user: userAlice,
      onDate: "2025-03-01",
      entry: journalEntry1,
    });
    const result2 = await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-03-01",
    });
    assertEquals(
      "error" in result2,
      true,
      "Enqueuing completed session should fail.",
    );
    console.log("✓ Requirement: Status must be PENDING - enforced");

    // Create another session for duplicate test
    await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-03-02",
      source: "MANUAL",
    });

    // First enqueue should succeed
    const result3 = await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-03-02",
    });
    assertEquals("error" in result3, false, "First enqueue should succeed.");
    console.log("✓ First enqueue succeeded");

    // Requirement: Must not already be in queue
    const result4 = await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-03-02",
    });
    assertEquals(
      "error" in result4,
      true,
      "Enqueuing already queued session should fail.",
    );
    console.log("✓ Requirement: Must not already be in queue - enforced\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: markCallCompleted updates status and removes from queue", async () => {
  const [db, client] = await testDb();
  const callSessionConcept = new CallSessionConcept(db);

  try {
    console.log("\n=== Testing markCallCompleted ===");

    // Create and enqueue a session
    await callSessionConcept.createCallSession({
      user: userBob,
      onDate: "2025-04-01",
      source: "SCHEDULED",
    });
    await callSessionConcept.enqueueCall({
      user: userBob,
      onDate: "2025-04-01",
    });

    // Mark as completed
    const result = await callSessionConcept.markCallCompleted({
      user: userBob,
      onDate: "2025-04-01",
      entry: journalEntry2,
    });
    assertEquals("error" in result, false, "Marking completed should succeed.");
    console.log("✓ Session marked as completed");

    // Verify status and journal entry
    const session = await callSessionConcept._getCallSession({
      user: userBob,
      onDate: "2025-04-01",
    });
    assertEquals(session?.status, "COMPLETED", "Status should be COMPLETED");
    assertEquals(
      session?.journalEntry,
      journalEntry2,
      "Journal entry should be set",
    );
    console.log("✓ Status and journal entry correctly updated");

    // Verify removed from queue
    const queue = await callSessionConcept._getCallQueue();
    assertEquals(queue.length, 0, "Queue should be empty");
    console.log("✓ Session removed from queue");

    // Test with non-existent session
    const result2 = await callSessionConcept.markCallCompleted({
      user: userBob,
      onDate: "2025-04-02",
      entry: journalEntry1,
    });
    assertEquals(
      "error" in result2,
      true,
      "Marking non-existent session should fail.",
    );
    console.log("✓ Non-existent session correctly rejected\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: markCallMissed updates status and removes from queue", async () => {
  const [db, client] = await testDb();
  const callSessionConcept = new CallSessionConcept(db);

  try {
    console.log("\n=== Testing markCallMissed ===");

    // Create and enqueue a session
    await callSessionConcept.createCallSession({
      user: userBob,
      onDate: "2025-05-01",
      source: "SCHEDULED",
    });
    await callSessionConcept.enqueueCall({
      user: userBob,
      onDate: "2025-05-01",
    });

    // Mark as missed
    const result = await callSessionConcept.markCallMissed({
      user: userBob,
      onDate: "2025-05-01",
    });
    assertEquals("error" in result, false, "Marking missed should succeed.");
    console.log("✓ Session marked as missed");

    // Verify status
    const session = await callSessionConcept._getCallSession({
      user: userBob,
      onDate: "2025-05-01",
    });
    assertEquals(session?.status, "MISSED", "Status should be MISSED");
    console.log("✓ Status correctly updated to MISSED");

    // Verify removed from queue
    const queue = await callSessionConcept._getCallQueue();
    assertEquals(queue.length, 0, "Queue should be empty");
    console.log("✓ Session removed from queue");

    // Test with non-existent session
    const result2 = await callSessionConcept.markCallMissed({
      user: userBob,
      onDate: "2025-05-02",
    });
    assertEquals(
      "error" in result2,
      true,
      "Marking non-existent session should fail.",
    );
    console.log("✓ Non-existent session correctly rejected\n");
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Multiple retries with enqueue", async () => {
  const [db, client] = await testDb();
  const callSessionConcept = new CallSessionConcept(db);

  try {
    console.log("\n=== Testing Multiple Retry Scenario ===");

    // Create a session
    await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-06-01",
      source: "MANUAL",
    });

    // First attempt
    await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-06-01",
    });
    let session = await callSessionConcept._getCallSession({
      user: userAlice,
      onDate: "2025-06-01",
    });
    assertEquals(session?.numRetries, 1, "First retry should be 1");
    console.log("✓ First enqueue: retries = 1");

    // Simulate call failure - remove from queue manually to allow re-enqueue
    await callSessionConcept.markCallMissed({
      user: userAlice,
      onDate: "2025-06-01",
    });

    // Change status back to PENDING for retry
    await callSessionConcept.callSessions.updateOne(
      { user: userAlice, onDate: "2025-06-01" },
      { $set: { status: "PENDING" } },
    );

    // Second attempt
    await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-06-01",
    });
    session = await callSessionConcept._getCallSession({
      user: userAlice,
      onDate: "2025-06-01",
    });
    assertEquals(session?.numRetries, 2, "Second retry should be 2");
    console.log("✓ Second enqueue: retries = 2");

    // Remove from queue again
    await callSessionConcept.markCallMissed({
      user: userAlice,
      onDate: "2025-06-01",
    });
    await callSessionConcept.callSessions.updateOne(
      { user: userAlice, onDate: "2025-06-01" },
      { $set: { status: "PENDING" } },
    );

    // Third attempt
    await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-06-01",
    });
    session = await callSessionConcept._getCallSession({
      user: userAlice,
      onDate: "2025-06-01",
    });
    assertEquals(session?.numRetries, 3, "Third retry should be 3");
    console.log("✓ Third enqueue: retries = 3");

    console.log("✓ Multiple retry scenario completed successfully\n");
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Queue ordering with multiple sessions", async () => {
  const [db, client] = await testDb();
  const callSessionConcept = new CallSessionConcept(db);

  try {
    console.log("\n=== Testing Queue Ordering ===");

    // Create multiple sessions
    const result1 = await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-07-01",
      source: "MANUAL",
    });
    const session1 = (result1 as { callSession: ID }).callSession;

    const result2 = await callSessionConcept.createCallSession({
      user: userBob,
      onDate: "2025-07-01",
      source: "SCHEDULED",
    });
    const session2 = (result2 as { callSession: ID }).callSession;

    const result3 = await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-07-02",
      source: "MANUAL",
    });
    const session3 = (result3 as { callSession: ID }).callSession;

    console.log("✓ Created 3 sessions");

    // Enqueue in order
    await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-07-01",
    });
    await callSessionConcept.enqueueCall({ user: userBob, onDate: "2025-07-01" });
    await callSessionConcept.enqueueCall({
      user: userAlice,
      onDate: "2025-07-02",
    });

    // Verify queue order
    const queue = await callSessionConcept._getCallQueue();
    assertEquals(queue.length, 3, "Queue should have 3 sessions");
    assertEquals(queue[0], session1, "First session should be Alice 07-01");
    assertEquals(queue[1], session2, "Second session should be Bob 07-01");
    assertEquals(queue[2], session3, "Third session should be Alice 07-02");
    console.log("✓ Queue maintains FIFO order");

    // Complete middle session
    await callSessionConcept.markCallCompleted({
      user: userBob,
      onDate: "2025-07-01",
      entry: journalEntry1,
    });

    // Verify queue updated correctly
    const queueAfter = await callSessionConcept._getCallQueue();
    assertEquals(queueAfter.length, 2, "Queue should have 2 sessions");
    assertEquals(queueAfter[0], session1, "First should still be Alice 07-01");
    assertEquals(queueAfter[1], session3, "Second should be Alice 07-02");
    console.log("✓ Queue correctly updated after completion\n");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getUserCallSessions retrieves all sessions for a user", async () => {
  const [db, client] = await testDb();
  const callSessionConcept = new CallSessionConcept(db);

  try {
    console.log("\n=== Testing _getUserCallSessions Query ===");

    // Create multiple sessions for Alice
    await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-08-01",
      source: "MANUAL",
    });
    await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-08-02",
      source: "SCHEDULED",
    });
    await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-08-03",
      source: "MANUAL",
    });

    // Create one for Bob
    await callSessionConcept.createCallSession({
      user: userBob,
      onDate: "2025-08-01",
      source: "MANUAL",
    });

    // Query Alice's sessions
    const aliceSessions = await callSessionConcept._getUserCallSessions({
      user: userAlice,
    });
    assertEquals(aliceSessions.length, 3, "Alice should have 3 sessions");
    console.log("✓ Retrieved all 3 sessions for Alice");

    // Query Bob's sessions
    const bobSessions = await callSessionConcept._getUserCallSessions({
      user: userBob,
    });
    assertEquals(bobSessions.length, 1, "Bob should have 1 session");
    console.log("✓ Retrieved 1 session for Bob\n");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getCallSessionsByStatus filters correctly", async () => {
  const [db, client] = await testDb();
  const callSessionConcept = new CallSessionConcept(db);

  try {
    console.log("\n=== Testing _getCallSessionsByStatus Query ===");

    // Create sessions with different statuses
    await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-09-01",
      source: "MANUAL",
    });
    await callSessionConcept.createCallSession({
      user: userAlice,
      onDate: "2025-09-02",
      source: "MANUAL",
    });
    await callSessionConcept.createCallSession({
      user: userBob,
      onDate: "2025-09-01",
      source: "SCHEDULED",
    });

    // Mark one as completed
    await callSessionConcept.markCallCompleted({
      user: userAlice,
      onDate: "2025-09-01",
      entry: journalEntry1,
    });

    // Mark one as missed
    await callSessionConcept.markCallMissed({
      user: userBob,
      onDate: "2025-09-01",
    });

    // Query by status
    const pendingSessions = await callSessionConcept._getCallSessionsByStatus({
      status: "PENDING",
    });
    assertEquals(pendingSessions.length, 1, "Should have 1 PENDING session");
    console.log("✓ Found 1 PENDING session");

    const completedSessions = await callSessionConcept
      ._getCallSessionsByStatus({ status: "COMPLETED" });
    assertEquals(completedSessions.length, 1, "Should have 1 COMPLETED session");
    console.log("✓ Found 1 COMPLETED session");

    const missedSessions = await callSessionConcept._getCallSessionsByStatus({
      status: "MISSED",
    });
    assertEquals(missedSessions.length, 1, "Should have 1 MISSED session");
    console.log("✓ Found 1 MISSED session\n");
  } finally {
    await client.close();
  }
});
