import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import JournalEntryConcept from "./JournalEntryConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const session1 = "session:1" as ID;
const session2 = "session:2" as ID;
const prompt1 = "prompt:1" as ID;
const prompt2 = "prompt:2" as ID;
const prompt3 = "prompt:3" as ID;

const sampleSessionData = {
  user: userAlice,
  reflectionSession: session1,
  endedAt: new Date("2025-01-15T20:30:00Z"),
  rating: 2,
};

const sampleResponses = [
  {
    promptId: prompt1,
    promptText: "What are you grateful for?",
    position: 1,
    responseText: "My family and health",
    responseStarted: new Date("2025-01-15T20:00:00Z"),
    responseFinished: new Date("2025-01-15T20:05:00Z"),
  },
  {
    promptId: prompt2,
    promptText: "What did you do today?",
    position: 2,
    responseText: "Worked on my project",
    responseStarted: new Date("2025-01-15T20:10:00Z"),
    responseFinished: new Date("2025-01-15T20:15:00Z"),
  },
  {
    promptId: prompt3,
    promptText: "What are you proud of?",
    position: 3,
    responseText: "Finishing a difficult task",
    responseStarted: new Date("2025-01-15T20:20:00Z"),
    responseFinished: new Date("2025-01-15T20:25:00Z"),
  },
];

Deno.test("Principle: Create immutable entry from completed session", async () => {
  const [db, client] = await testDb();
  const journalConcept = new JournalEntryConcept(db);

  try {
    console.log("\n=== Testing Operational Principle ===");

    // 1. Create entry from session
    console.log("\n1. Creating journal entry from session...");
    const createResult = await journalConcept.createFromSession({
      sessionData: sampleSessionData,
      sessionResponses: sampleResponses,
    });
    assertNotEquals("error" in createResult, true, "Create should succeed");
    const { entry } = createResult as { entry: ID };
    console.log(`   ✓ Entry created: ${entry}`);

    // 2. Retrieve entry
    console.log("\n2. Retrieving entry...");
    const entryDoc = await journalConcept._getEntryByDate({
      user: userAlice,
      date: "2025-01-15",
    });
    assertNotEquals(entryDoc, null, "Entry should exist");
    assertEquals(entryDoc!.rating, 2, "Rating should match");
    assertEquals(entryDoc!.reflectionSession, session1, "Session should match");
    console.log(`   ✓ Entry retrieved for date: ${entryDoc!.creationDate}`);
    console.log(`   ✓ Rating: ${entryDoc!.rating}`);

    // 3. Retrieve responses
    console.log("\n3. Retrieving responses...");
    const responses = await journalConcept._getEntryResponses({ entry });
    assertEquals(responses.length, 3, "Should have 3 responses");
    assertEquals(responses[0].position, 1, "First response position should be 1");
    assertEquals(responses[0].promptText, "What are you grateful for?");
    assertEquals(responses[0].responseText, "My family and health");
    console.log(`   ✓ Retrieved ${responses.length} responses`);
    console.log(`   ✓ First response: "${responses[0].responseText}"`);

    console.log("\n=== Operational Principle Test Passed ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createFromSession enforces one entry per user per date", async () => {
  const [db, client] = await testDb();
  const journalConcept = new JournalEntryConcept(db);

  try {
    console.log("\n=== Testing Date Uniqueness ===");

    // Create first entry
    const result1 = await journalConcept.createFromSession({
      sessionData: sampleSessionData,
      sessionResponses: sampleResponses,
    });
    assertEquals("error" in result1, false, "First entry should succeed");
    console.log("✓ First entry created for 2025-01-15");

    // Try to create duplicate for same date
    const result2 = await journalConcept.createFromSession({
      sessionData: {
        ...sampleSessionData,
        reflectionSession: session2,
      },
      sessionResponses: sampleResponses,
    });
    assertEquals("error" in result2, true, "Duplicate date should fail");
    console.log("✓ Duplicate entry for same date rejected");

    // Different date should succeed
    const result3 = await journalConcept.createFromSession({
      sessionData: {
        ...sampleSessionData,
        endedAt: new Date("2025-01-16T20:30:00Z"),
      },
      sessionResponses: sampleResponses,
    });
    assertEquals("error" in result3, false, "Different date should succeed");
    console.log("✓ Entry for different date succeeded");

    // Different user, same date should succeed
    const result4 = await journalConcept.createFromSession({
      sessionData: {
        ...sampleSessionData,
        user: userBob,
      },
      sessionResponses: sampleResponses,
    });
    assertEquals("error" in result4, false, "Different user should succeed");
    console.log("✓ Entry for different user succeeded");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: createFromSession validates rating", async () => {
  const [db, client] = await testDb();
  const journalConcept = new JournalEntryConcept(db);

  try {
    console.log("\n=== Testing Rating Validation ===");

    // Valid ratings
    for (const rating of [-2, -1, 0, 1, 2]) {
      const result = await journalConcept.createFromSession({
        sessionData: {
          ...sampleSessionData,
          rating,
          endedAt: new Date(`2025-01-${15 + rating + 2}T20:30:00Z`),
        },
        sessionResponses: sampleResponses,
      });
      assertEquals("error" in result, false, `Rating ${rating} should succeed`);
    }
    console.log("✓ All valid ratings (-2 to 2) accepted");

    // Invalid ratings
    const invalidRatings = [-3, 3, 1.5];
    for (let i = 0; i < invalidRatings.length; i++) {
      const result = await journalConcept.createFromSession({
        sessionData: {
          ...sampleSessionData,
          rating: invalidRatings[i],
          endedAt: new Date(`2025-01-${20 + i}T20:30:00Z`),
        },
        sessionResponses: sampleResponses,
      });
      assertEquals("error" in result, true, `Rating ${invalidRatings[i]} should fail`);
    }
    console.log("✓ All invalid ratings rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteEntry removes entry and responses", async () => {
  const [db, client] = await testDb();
  const journalConcept = new JournalEntryConcept(db);

  try {
    console.log("\n=== Testing Entry Deletion ===");

    // Create entry
    const { entry } = (await journalConcept.createFromSession({
      sessionData: sampleSessionData,
      sessionResponses: sampleResponses,
    })) as { entry: ID };
    console.log("✓ Entry created");

    // Verify responses exist
    let responses = await journalConcept._getEntryResponses({ entry });
    assertEquals(responses.length, 3, "Should have 3 responses");
    console.log("✓ Responses exist");

    // Delete entry
    const deleteResult = await journalConcept.deleteEntry({ entry });
    assertEquals("error" in deleteResult, false, "Delete should succeed");
    console.log("✓ Entry deleted");

    // Verify entry is gone
    const entryDoc = await journalConcept._getEntryByDate({
      user: userAlice,
      date: "2025-01-15",
    });
    assertEquals(entryDoc, null, "Entry should be deleted");
    console.log("✓ Entry removed from database");

    // Verify responses are gone
    responses = await journalConcept._getEntryResponses({ entry });
    assertEquals(responses.length, 0, "Responses should be deleted");
    console.log("✓ Responses removed from database");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getEntriesByUser returns entries ordered by date", async () => {
  const [db, client] = await testDb();
  const journalConcept = new JournalEntryConcept(db);

  try {
    console.log("\n=== Testing User Entries Query ===");

    // Create entries for different dates
    const dates = ["2025-01-15", "2025-01-17", "2025-01-16"];
    for (const date of dates) {
      await journalConcept.createFromSession({
        sessionData: {
          ...sampleSessionData,
          endedAt: new Date(`${date}T20:30:00Z`),
        },
        sessionResponses: sampleResponses,
      });
    }
    console.log(`✓ Created ${dates.length} entries`);

    // Retrieve all entries
    const entries = await journalConcept._getEntriesByUser({ user: userAlice });
    assertEquals(entries.length, 3, "Should have 3 entries");
    
    // Verify descending order (newest first)
    assertEquals(entries[0].creationDate, "2025-01-17");
    assertEquals(entries[1].creationDate, "2025-01-16");
    assertEquals(entries[2].creationDate, "2025-01-15");
    console.log("✓ Entries ordered by date descending (newest first)");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getEntriesByDateRange filters correctly", async () => {
  const [db, client] = await testDb();
  const journalConcept = new JournalEntryConcept(db);

  try {
    console.log("\n=== Testing Date Range Query ===");

    // Create entries across multiple dates
    const dates = ["2025-01-10", "2025-01-15", "2025-01-20", "2025-01-25"];
    for (const date of dates) {
      await journalConcept.createFromSession({
        sessionData: {
          ...sampleSessionData,
          endedAt: new Date(`${date}T20:30:00Z`),
        },
        sessionResponses: sampleResponses,
      });
    }
    console.log(`✓ Created ${dates.length} entries`);

    // Query for range
    const entries = await journalConcept._getEntriesByDateRange({
      user: userAlice,
      startDate: "2025-01-15",
      endDate: "2025-01-20",
    });

    assertEquals(entries.length, 2, "Should have 2 entries in range");
    assertEquals(entries[0].creationDate, "2025-01-15");
    assertEquals(entries[1].creationDate, "2025-01-20");
    console.log("✓ Date range filter works correctly");
    console.log(`  - Found ${entries.length} entries between 2025-01-15 and 2025-01-20`);
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getEntryResponses returns ordered responses", async () => {
  const [db, client] = await testDb();
  const journalConcept = new JournalEntryConcept(db);

  try {
    console.log("\n=== Testing Response Ordering ===");

    const { entry } = (await journalConcept.createFromSession({
      sessionData: sampleSessionData,
      sessionResponses: sampleResponses,
    })) as { entry: ID };

    const responses = await journalConcept._getEntryResponses({ entry });
    
    assertEquals(responses.length, 3);
    assertEquals(responses[0].position, 1);
    assertEquals(responses[1].position, 2);
    assertEquals(responses[2].position, 3);
    console.log("✓ Responses ordered by position (1, 2, 3)");

    // Verify immutability - all fields preserved
    assertEquals(responses[0].promptText, "What are you grateful for?");
    assertEquals(responses[0].responseText, "My family and health");
    assertNotEquals(responses[0].responseStarted, undefined);
    assertNotEquals(responses[0].responseFinished, undefined);
    console.log("✓ All response data preserved (immutable snapshot)");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Complete journal entry lifecycle", async () => {
  const [db, client] = await testDb();
  const journalConcept = new JournalEntryConcept(db);

  try {
    console.log("\n=== Testing Complete Lifecycle ===");

    // Create entry
    const { entry } = (await journalConcept.createFromSession({
      sessionData: sampleSessionData,
      sessionResponses: sampleResponses,
    })) as { entry: ID };
    console.log("✓ Step 1: Entry created");

    // Retrieve by date
    const entryByDate = await journalConcept._getEntryByDate({
      user: userAlice,
      date: "2025-01-15",
    });
    assertNotEquals(entryByDate, null);
    console.log("✓ Step 2: Entry retrieved by date");

    // Retrieve responses
    const responses = await journalConcept._getEntryResponses({ entry });
    assertEquals(responses.length, 3);
    console.log("✓ Step 3: Responses retrieved");

    // Verify immutability (all data is snapshot)
    assertEquals(entryByDate!.rating, 2);
    assertEquals(responses[0].promptText, "What are you grateful for?");
    assertEquals(responses[0].responseText, "My family and health");
    console.log("✓ Step 4: Data verified as immutable snapshot");

    // Delete entry
    await journalConcept.deleteEntry({ entry });
    const deletedEntry = await journalConcept._getEntryByDate({
      user: userAlice,
      date: "2025-01-15",
    });
    assertEquals(deletedEntry, null);
    console.log("✓ Step 5: Entry deleted");

    console.log("\n✓ Complete lifecycle verified");
    console.log();
  } finally {
    await client.close();
  }
});
