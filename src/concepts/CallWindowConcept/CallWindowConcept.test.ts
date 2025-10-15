import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import CallWindowConcept from "./CallWindowConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;

// Helper to create Date objects for testing (time only, date doesn't matter for recurring)
const createTime = (hours: number, minutes: number = 0): Date => {
  const date = new Date(2025, 0, 1, hours, minutes, 0, 0);
  return date;
};

Deno.test("Principle: User creates recurring and one-off windows to define availability", async () => {
  const [db, client] = await testDb();
  const callWindowConcept = new CallWindowConcept(db);

  try {
    console.log("\n=== Testing Operational Principle ===");

    // 1. User creates a recurring window for Monday mornings
    console.log("\n1. Creating recurring window for Monday 9:00-11:00...");
    const recurringResult = await callWindowConcept.createRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "MONDAY",
      startTime: createTime(9, 0),
      endTime: createTime(11, 0),
    });
    assertNotEquals(
      "error" in recurringResult,
      true,
      "Recurring window creation should succeed.",
    );
    const { callWindow: recurringWindow } = recurringResult as {
      callWindow: ID;
    };
    console.log(`   ✓ Created recurring window: ${recurringWindow}`);

    // Verify recurring window
    const recurringWindows = await callWindowConcept._getUserRecurringWindows({
      user: userAlice,
    });
    assertEquals(
      recurringWindows.length,
      1,
      "Should have 1 recurring window",
    );
    assertEquals(
      recurringWindows[0].dayOfWeek,
      "MONDAY",
      "Day should be MONDAY",
    );
    console.log(
      `   ✓ Recurring window: ${recurringWindows[0].dayOfWeek} ${recurringWindows[0].startTime.getHours()}:00-${recurringWindows[0].endTime.getHours()}:00`,
    );

    // 2. User creates a one-off window for a specific date
    console.log("\n2. Creating one-off window for 2025-01-15 14:00-16:00...");
    const oneOffResult = await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate: "2025-01-15",
      startTime: createTime(14, 0),
      endTime: createTime(16, 0),
    });
    assertNotEquals(
      "error" in oneOffResult,
      true,
      "One-off window creation should succeed.",
    );
    const { callWindow: oneOffWindow } = oneOffResult as { callWindow: ID };
    console.log(`   ✓ Created one-off window: ${oneOffWindow}`);

    // Verify one-off window
    const oneOffWindows = await callWindowConcept._getUserOneOffWindows({
      user: userAlice,
    });
    assertEquals(oneOffWindows.length, 1, "Should have 1 one-off window");
    assertEquals(
      oneOffWindows[0].specificDate,
      "2025-01-15",
      "Date should be 2025-01-15",
    );
    console.log(
      `   ✓ One-off window: ${oneOffWindows[0].specificDate} ${oneOffWindows[0].startTime.getHours()}:00-${oneOffWindows[0].endTime.getHours()}:00`,
    );

    // 3. User can retrieve all their windows
    console.log("\n3. Retrieving all windows for user...");
    const allWindows = await callWindowConcept._getUserCallWindows({
      user: userAlice,
    });
    assertEquals(allWindows.length, 2, "Should have 2 total windows");
    console.log(`   ✓ Total windows: ${allWindows.length}`);

    console.log("\n=== Operational Principle Test Passed ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createRecurringCallWindow enforces requirements", async () => {
  const [db, client] = await testDb();
  const callWindowConcept = new CallWindowConcept(db);

  try {
    console.log("\n=== Testing createRecurringCallWindow Requirements ===");

    // Requirement: endTime must be later than startTime
    console.log("\n1. Testing time ordering requirement...");
    const invalidTimeResult = await callWindowConcept.createRecurringCallWindow(
      {
        user: userAlice,
        dayOfWeek: "TUESDAY",
        startTime: createTime(15, 0),
        endTime: createTime(14, 0), // Earlier than start
      },
    );
    assertEquals(
      "error" in invalidTimeResult,
      true,
      "Should fail when endTime <= startTime",
    );
    console.log("   ✓ Time ordering requirement enforced");

    // Equal times should also fail
    const equalTimeResult = await callWindowConcept.createRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "TUESDAY",
      startTime: createTime(15, 0),
      endTime: createTime(15, 0),
    });
    assertEquals(
      "error" in equalTimeResult,
      true,
      "Should fail when endTime == startTime",
    );
    console.log("   ✓ Equal times correctly rejected");

    // Requirement: No duplicate (user, dayOfWeek, startTime)
    console.log("\n2. Testing uniqueness requirement...");
    const firstResult = await callWindowConcept.createRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "WEDNESDAY",
      startTime: createTime(10, 0),
      endTime: createTime(12, 0),
    });
    assertNotEquals(
      "error" in firstResult,
      true,
      "First creation should succeed",
    );
    console.log("   ✓ First window created");

    const duplicateResult = await callWindowConcept.createRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "WEDNESDAY",
      startTime: createTime(10, 0),
      endTime: createTime(13, 0), // Different end time, but same key
    });
    assertEquals(
      "error" in duplicateResult,
      true,
      "Duplicate creation should fail",
    );
    console.log("   ✓ Duplicate correctly rejected");

    // Different end time with same start should fail
    const differentEndResult = await callWindowConcept
      .createRecurringCallWindow({
        user: userAlice,
        dayOfWeek: "WEDNESDAY",
        startTime: createTime(10, 0),
        endTime: createTime(11, 0),
      });
    assertEquals(
      "error" in differentEndResult,
      true,
      "Same start time should fail even with different end",
    );
    console.log("   ✓ Same start time with different end rejected");

    // Different start time should succeed
    const differentStartResult = await callWindowConcept
      .createRecurringCallWindow({
        user: userAlice,
        dayOfWeek: "WEDNESDAY",
        startTime: createTime(14, 0),
        endTime: createTime(16, 0),
      });
    assertNotEquals(
      "error" in differentStartResult,
      true,
      "Different start time should succeed",
    );
    console.log("   ✓ Different start time succeeded");

    // Different day should succeed
    const differentDayResult = await callWindowConcept
      .createRecurringCallWindow({
        user: userAlice,
        dayOfWeek: "THURSDAY",
        startTime: createTime(10, 0),
        endTime: createTime(12, 0),
      });
    assertNotEquals(
      "error" in differentDayResult,
      true,
      "Different day should succeed",
    );
    console.log("   ✓ Different day succeeded");

    // Different user should succeed
    const differentUserResult = await callWindowConcept
      .createRecurringCallWindow({
        user: userBob,
        dayOfWeek: "WEDNESDAY",
        startTime: createTime(10, 0),
        endTime: createTime(12, 0),
      });
    assertNotEquals(
      "error" in differentUserResult,
      true,
      "Different user should succeed",
    );
    console.log("   ✓ Different user succeeded\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createOneOffCallWindow enforces requirements", async () => {
  const [db, client] = await testDb();
  const callWindowConcept = new CallWindowConcept(db);

  try {
    console.log("\n=== Testing createOneOffCallWindow Requirements ===");

    // Requirement: endTime must be later than startTime
    console.log("\n1. Testing time ordering requirement...");
    const invalidTimeResult = await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate: "2025-02-01",
      startTime: createTime(15, 0),
      endTime: createTime(14, 0),
    });
    assertEquals(
      "error" in invalidTimeResult,
      true,
      "Should fail when endTime <= startTime",
    );
    console.log("   ✓ Time ordering requirement enforced");

    // Requirement: No duplicate (user, specificDate, startTime)
    console.log("\n2. Testing uniqueness requirement...");
    const firstResult = await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate: "2025-02-15",
      startTime: createTime(10, 0),
      endTime: createTime(12, 0),
    });
    assertNotEquals(
      "error" in firstResult,
      true,
      "First creation should succeed",
    );
    console.log("   ✓ First window created");

    const duplicateResult = await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate: "2025-02-15",
      startTime: createTime(10, 0),
      endTime: createTime(13, 0),
    });
    assertEquals(
      "error" in duplicateResult,
      true,
      "Duplicate creation should fail",
    );
    console.log("   ✓ Duplicate correctly rejected");

    // Different date should succeed
    const differentDateResult = await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate: "2025-02-16",
      startTime: createTime(10, 0),
      endTime: createTime(12, 0),
    });
    assertNotEquals(
      "error" in differentDateResult,
      true,
      "Different date should succeed",
    );
    console.log("   ✓ Different date succeeded");

    // Different start time should succeed
    const differentStartResult = await callWindowConcept.createOneOffCallWindow(
      {
        user: userAlice,
        specificDate: "2025-02-15",
        startTime: createTime(14, 0),
        endTime: createTime(16, 0),
      },
    );
    assertNotEquals(
      "error" in differentStartResult,
      true,
      "Different start time should succeed",
    );
    console.log("   ✓ Different start time succeeded");

    // Different user should succeed
    const differentUserResult = await callWindowConcept.createOneOffCallWindow({
      user: userBob,
      specificDate: "2025-02-15",
      startTime: createTime(10, 0),
      endTime: createTime(12, 0),
    });
    assertNotEquals(
      "error" in differentUserResult,
      true,
      "Different user should succeed",
    );
    console.log("   ✓ Different user succeeded\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteRecurringCallWindow removes window", async () => {
  const [db, client] = await testDb();
  const callWindowConcept = new CallWindowConcept(db);

  try {
    console.log("\n=== Testing deleteRecurringCallWindow ===");

    // Create a window
    const startTime = createTime(9, 0);
    await callWindowConcept.createRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "FRIDAY",
      startTime,
      endTime: createTime(11, 0),
    });
    console.log("✓ Window created");

    // Verify it exists
    let windows = await callWindowConcept._getUserRecurringWindows({
      user: userAlice,
    });
    assertEquals(windows.length, 1, "Should have 1 window");
    console.log("✓ Window verified in database");

    // Delete it
    const deleteResult = await callWindowConcept.deleteRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "FRIDAY",
      startTime,
    });
    assertEquals("error" in deleteResult, false, "Deletion should succeed");
    console.log("✓ Window deleted");

    // Verify it's gone
    windows = await callWindowConcept._getUserRecurringWindows({
      user: userAlice,
    });
    assertEquals(windows.length, 0, "Should have 0 windows");
    console.log("✓ Window removed from database");

    // Attempt to delete non-existent window
    const deleteAgainResult = await callWindowConcept
      .deleteRecurringCallWindow({
        user: userAlice,
        dayOfWeek: "FRIDAY",
        startTime,
      });
    assertEquals(
      "error" in deleteAgainResult,
      true,
      "Deleting non-existent window should fail",
    );
    console.log("✓ Non-existent window deletion correctly rejected\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteOneOffCallWindow removes window", async () => {
  const [db, client] = await testDb();
  const callWindowConcept = new CallWindowConcept(db);

  try {
    console.log("\n=== Testing deleteOneOffCallWindow ===");

    // Create a window
    const startTime = createTime(14, 0);
    const specificDate = "2025-03-20";
    await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate,
      startTime,
      endTime: createTime(16, 0),
    });
    console.log("✓ Window created");

    // Verify it exists
    let windows = await callWindowConcept._getUserOneOffWindows({
      user: userAlice,
    });
    assertEquals(windows.length, 1, "Should have 1 window");
    console.log("✓ Window verified in database");

    // Delete it
    const deleteResult = await callWindowConcept.deleteOneOffCallWindow({
      user: userAlice,
      specificDate,
      startTime,
    });
    assertEquals("error" in deleteResult, false, "Deletion should succeed");
    console.log("✓ Window deleted");

    // Verify it's gone
    windows = await callWindowConcept._getUserOneOffWindows({
      user: userAlice,
    });
    assertEquals(windows.length, 0, "Should have 0 windows");
    console.log("✓ Window removed from database");

    // Attempt to delete non-existent window
    const deleteAgainResult = await callWindowConcept.deleteOneOffCallWindow({
      user: userAlice,
      specificDate,
      startTime,
    });
    assertEquals(
      "error" in deleteAgainResult,
      true,
      "Deleting non-existent window should fail",
    );
    console.log("✓ Non-existent window deletion correctly rejected\n");
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: User manages multiple recurring windows", async () => {
  const [db, client] = await testDb();
  const callWindowConcept = new CallWindowConcept(db);

  try {
    console.log("\n=== Testing Multiple Recurring Windows ===");

    // Create windows for different days
    await callWindowConcept.createRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "MONDAY",
      startTime: createTime(9, 0),
      endTime: createTime(11, 0),
    });
    await callWindowConcept.createRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "WEDNESDAY",
      startTime: createTime(14, 0),
      endTime: createTime(16, 0),
    });
    await callWindowConcept.createRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "FRIDAY",
      startTime: createTime(10, 0),
      endTime: createTime(12, 0),
    });
    console.log("✓ Created 3 recurring windows");

    // Verify all windows
    const windows = await callWindowConcept._getUserRecurringWindows({
      user: userAlice,
    });
    assertEquals(windows.length, 3, "Should have 3 windows");
    console.log("✓ All 3 windows retrieved");

    // Query by specific day
    const mondayWindows = await callWindowConcept._getRecurringWindowsByDay({
      dayOfWeek: "MONDAY",
    });
    assertEquals(mondayWindows.length, 1, "Should have 1 Monday window");
    assertEquals(
      mondayWindows[0].startTime.getHours(),
      9,
      "Monday window should start at 9",
    );
    console.log("✓ Query by day works correctly");

    // Delete one window
    await callWindowConcept.deleteRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "WEDNESDAY",
      startTime: createTime(14, 0),
    });

    const remainingWindows = await callWindowConcept._getUserRecurringWindows({
      user: userAlice,
    });
    assertEquals(remainingWindows.length, 2, "Should have 2 windows left");
    console.log("✓ Window deletion works correctly\n");
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: User manages multiple one-off windows", async () => {
  const [db, client] = await testDb();
  const callWindowConcept = new CallWindowConcept(db);

  try {
    console.log("\n=== Testing Multiple One-Off Windows ===");

    // Create windows for different dates
    await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate: "2025-04-01",
      startTime: createTime(9, 0),
      endTime: createTime(11, 0),
    });
    await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate: "2025-04-05",
      startTime: createTime(14, 0),
      endTime: createTime(16, 0),
    });
    await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate: "2025-04-10",
      startTime: createTime(10, 0),
      endTime: createTime(12, 0),
    });
    console.log("✓ Created 3 one-off windows");

    // Verify all windows
    const windows = await callWindowConcept._getUserOneOffWindows({
      user: userAlice,
    });
    assertEquals(windows.length, 3, "Should have 3 windows");
    console.log("✓ All 3 windows retrieved");

    // Query by specific date
    const april5Windows = await callWindowConcept._getOneOffWindowsByDate({
      specificDate: "2025-04-05",
    });
    assertEquals(april5Windows.length, 1, "Should have 1 window on 2025-04-05");
    assertEquals(
      april5Windows[0].startTime.getHours(),
      14,
      "Window should start at 14",
    );
    console.log("✓ Query by date works correctly");

    // Multiple windows on same date
    await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate: "2025-04-01",
      startTime: createTime(14, 0),
      endTime: createTime(16, 0),
    });

    const april1Windows = await callWindowConcept._getOneOffWindowsByDate({
      specificDate: "2025-04-01",
    });
    assertEquals(
      april1Windows.length,
      2,
      "Should have 2 windows on 2025-04-01",
    );
    console.log("✓ Multiple windows on same date supported\n");
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Mixed recurring and one-off windows", async () => {
  const [db, client] = await testDb();
  const callWindowConcept = new CallWindowConcept(db);

  try {
    console.log("\n=== Testing Mixed Window Types ===");

    // Create both types of windows
    await callWindowConcept.createRecurringCallWindow({
      user: userBob,
      dayOfWeek: "TUESDAY",
      startTime: createTime(9, 0),
      endTime: createTime(11, 0),
    });
    await callWindowConcept.createRecurringCallWindow({
      user: userBob,
      dayOfWeek: "THURSDAY",
      startTime: createTime(14, 0),
      endTime: createTime(16, 0),
    });
    await callWindowConcept.createOneOffCallWindow({
      user: userBob,
      specificDate: "2025-05-01",
      startTime: createTime(10, 0),
      endTime: createTime(12, 0),
    });
    await callWindowConcept.createOneOffCallWindow({
      user: userBob,
      specificDate: "2025-05-15",
      startTime: createTime(13, 0),
      endTime: createTime(15, 0),
    });
    console.log("✓ Created 2 recurring and 2 one-off windows");

    // Verify total count
    const allWindows = await callWindowConcept._getUserCallWindows({
      user: userBob,
    });
    assertEquals(allWindows.length, 4, "Should have 4 total windows");
    console.log("✓ Total window count correct");

    // Verify by type
    const recurring = await callWindowConcept._getUserRecurringWindows({
      user: userBob,
    });
    const oneOff = await callWindowConcept._getUserOneOffWindows({
      user: userBob,
    });
    assertEquals(recurring.length, 2, "Should have 2 recurring windows");
    assertEquals(oneOff.length, 2, "Should have 2 one-off windows");
    console.log("✓ Window type separation works correctly");

    // Verify window types are distinct
    assertEquals(
      recurring[0].windowType,
      "RECURRING",
      "Recurring window should have correct type",
    );
    assertEquals(
      oneOff[0].windowType,
      "ONEOFF",
      "One-off window should have correct type",
    );
    console.log("✓ Window type discriminator works correctly\n");
  } finally {
    await client.close();
  }
});

Deno.test("Query: Window retrieval methods work correctly", async () => {
  const [db, client] = await testDb();
  const callWindowConcept = new CallWindowConcept(db);

  try {
    console.log("\n=== Testing Query Methods ===");

    // Setup: Create windows for multiple users
    await callWindowConcept.createRecurringCallWindow({
      user: userAlice,
      dayOfWeek: "MONDAY",
      startTime: createTime(9, 0),
      endTime: createTime(11, 0),
    });
    await callWindowConcept.createRecurringCallWindow({
      user: userBob,
      dayOfWeek: "MONDAY",
      startTime: createTime(10, 0),
      endTime: createTime(12, 0),
    });
    await callWindowConcept.createOneOffCallWindow({
      user: userAlice,
      specificDate: "2025-06-01",
      startTime: createTime(14, 0),
      endTime: createTime(16, 0),
    });

    // Test _getUserCallWindows
    const aliceWindows = await callWindowConcept._getUserCallWindows({
      user: userAlice,
    });
    assertEquals(aliceWindows.length, 2, "Alice should have 2 windows");
    console.log("✓ _getUserCallWindows works");

    // Test _getUserRecurringWindows
    const aliceRecurring = await callWindowConcept._getUserRecurringWindows({
      user: userAlice,
    });
    assertEquals(aliceRecurring.length, 1, "Alice should have 1 recurring");
    console.log("✓ _getUserRecurringWindows works");

    // Test _getUserOneOffWindows
    const aliceOneOff = await callWindowConcept._getUserOneOffWindows({
      user: userAlice,
    });
    assertEquals(aliceOneOff.length, 1, "Alice should have 1 one-off");
    console.log("✓ _getUserOneOffWindows works");

    // Test _getRecurringWindowsByDay
    const mondayWindows = await callWindowConcept._getRecurringWindowsByDay({
      dayOfWeek: "MONDAY",
    });
    assertEquals(mondayWindows.length, 2, "Should have 2 Monday windows");
    console.log("✓ _getRecurringWindowsByDay works");

    // Test _getOneOffWindowsByDate
    const june1Windows = await callWindowConcept._getOneOffWindowsByDate({
      specificDate: "2025-06-01",
    });
    assertEquals(june1Windows.length, 1, "Should have 1 window on 2025-06-01");
    console.log("✓ _getOneOffWindowsByDate works\n");
  } finally {
    await client.close();
  }
});
