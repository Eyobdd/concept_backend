import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import JournalPromptConcept from "./JournalPromptConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;

Deno.test("Principle: User creates default prompts, customizes them, and reorders", async () => {
  const [db, client] = await testDb();
  const journalPromptConcept = new JournalPromptConcept(db);

  try {
    console.log("\n=== Testing Operational Principle ===");

    // 1. Create default prompts
    console.log("\n1. Creating default prompts for Alice...");
    const createResult = await journalPromptConcept.createDefaultPrompts({
      user: userAlice,
    });
    assertEquals("error" in createResult, false, "Should create defaults");
    console.log("   ✓ Created 5 default prompts");

    // 2. Retrieve prompts
    console.log("\n2. Retrieving prompts...");
    const prompts = await journalPromptConcept._getUserPrompts({
      user: userAlice,
    });
    assertEquals(prompts.length, 5, "Should have 5 prompts");
    assertEquals(prompts[0].promptText, "What are you grateful for today?");
    assertEquals(prompts[0].position, 1);
    assertEquals(prompts[0].isActive, true);
    console.log(`   ✓ Retrieved ${prompts.length} prompts`);
    console.log(`   ✓ First prompt: "${prompts[0].promptText}"`);

    // 3. Update a prompt
    console.log("\n3. Updating prompt text...");
    const updateResult = await journalPromptConcept.updatePromptText({
      user: userAlice,
      position: 1,
      newText: "What made you smile today?",
    });
    assertEquals("error" in updateResult, false, "Update should succeed");

    const updatedPrompts = await journalPromptConcept._getUserPrompts({
      user: userAlice,
    });
    assertEquals(
      updatedPrompts[0].promptText,
      "What made you smile today?",
      "Text should be updated",
    );
    console.log(`   ✓ Updated to: "${updatedPrompts[0].promptText}"`);

    // 4. Reorder prompts
    console.log("\n4. Reordering prompts...");
    const promptIds = prompts.map((p) => p._id);
    const newOrder = [promptIds[4], promptIds[0], promptIds[1], promptIds[2], promptIds[3]];
    
    const reorderResult = await journalPromptConcept.reorderPrompts({
      user: userAlice,
      newOrder,
    });
    assertEquals("error" in reorderResult, false, "Reorder should succeed");

    const reorderedPrompts = await journalPromptConcept._getUserPrompts({
      user: userAlice,
    });
    assertEquals(reorderedPrompts[0]._id, promptIds[4], "First should be old 5th");
    assertEquals(reorderedPrompts[0].position, 1, "Position should be 1");
    console.log("   ✓ Prompts reordered successfully");

    console.log("\n=== Operational Principle Test Passed ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createDefaultPrompts enforces one-time creation", async () => {
  const [db, client] = await testDb();
  const journalPromptConcept = new JournalPromptConcept(db);

  try {
    console.log("\n=== Testing createDefaultPrompts Uniqueness ===");

    // First creation should succeed
    const result1 = await journalPromptConcept.createDefaultPrompts({
      user: userAlice,
    });
    assertEquals("error" in result1, false, "First creation should succeed");
    console.log("✓ First creation succeeded");

    // Second creation should fail
    const result2 = await journalPromptConcept.createDefaultPrompts({
      user: userAlice,
    });
    assertEquals("error" in result2, true, "Second creation should fail");
    console.log("✓ Duplicate creation correctly rejected");

    // Different user should succeed
    const result3 = await journalPromptConcept.createDefaultPrompts({
      user: userBob,
    });
    assertEquals("error" in result3, false, "Different user should succeed");
    console.log("✓ Different user creation succeeded");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: updatePromptText validates input", async () => {
  const [db, client] = await testDb();
  const journalPromptConcept = new JournalPromptConcept(db);

  try {
    console.log("\n=== Testing updatePromptText Validation ===");

    await journalPromptConcept.createDefaultPrompts({ user: userAlice });

    // Valid update
    const result1 = await journalPromptConcept.updatePromptText({
      user: userAlice,
      position: 1,
      newText: "New prompt text",
    });
    assertEquals("error" in result1, false, "Valid update should succeed");
    console.log("✓ Valid update succeeded");

    // Empty text
    const result2 = await journalPromptConcept.updatePromptText({
      user: userAlice,
      position: 1,
      newText: "",
    });
    assertEquals("error" in result2, true, "Empty text should fail");
    console.log("✓ Empty text correctly rejected");

    // Invalid position
    const result3 = await journalPromptConcept.updatePromptText({
      user: userAlice,
      position: 10,
      newText: "Test",
    });
    assertEquals("error" in result3, true, "Invalid position should fail");
    console.log("✓ Invalid position correctly rejected");

    // Non-existent user
    const result4 = await journalPromptConcept.updatePromptText({
      user: userBob,
      position: 1,
      newText: "Test",
    });
    assertEquals("error" in result4, true, "Non-existent prompt should fail");
    console.log("✓ Non-existent prompt correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: reorderPrompts validates order", async () => {
  const [db, client] = await testDb();
  const journalPromptConcept = new JournalPromptConcept(db);

  try {
    console.log("\n=== Testing reorderPrompts Validation ===");

    await journalPromptConcept.createDefaultPrompts({ user: userAlice });
    const prompts = await journalPromptConcept._getUserPrompts({ user: userAlice });
    const promptIds = prompts.map((p) => p._id);

    // Valid reorder
    const result1 = await journalPromptConcept.reorderPrompts({
      user: userAlice,
      newOrder: [promptIds[1], promptIds[0], promptIds[2], promptIds[3], promptIds[4]],
    });
    assertEquals("error" in result1, false, "Valid reorder should succeed");
    console.log("✓ Valid reorder succeeded");

    // Too many prompts
    const result2 = await journalPromptConcept.reorderPrompts({
      user: userAlice,
      newOrder: [...promptIds, "extra" as ID],
    });
    assertEquals("error" in result2, true, "Too many prompts should fail");
    console.log("✓ Too many prompts correctly rejected");

    // Missing prompts
    const result3 = await journalPromptConcept.reorderPrompts({
      user: userAlice,
      newOrder: [promptIds[0], promptIds[1]],
    });
    assertEquals("error" in result3, true, "Missing prompts should fail");
    console.log("✓ Missing prompts correctly rejected");

    // Duplicate prompts
    const result4 = await journalPromptConcept.reorderPrompts({
      user: userAlice,
      newOrder: [promptIds[0], promptIds[0], promptIds[1], promptIds[2], promptIds[3]],
    });
    assertEquals("error" in result4, true, "Duplicate prompts should fail");
    console.log("✓ Duplicate prompts correctly rejected");

    // Wrong user's prompts
    await journalPromptConcept.createDefaultPrompts({ user: userBob });
    const bobPrompts = await journalPromptConcept._getUserPrompts({ user: userBob });
    
    const result5 = await journalPromptConcept.reorderPrompts({
      user: userAlice,
      newOrder: bobPrompts.map((p) => p._id),
    });
    assertEquals("error" in result5, true, "Wrong user's prompts should fail");
    console.log("✓ Wrong user's prompts correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: togglePromptActive toggles status", async () => {
  const [db, client] = await testDb();
  const journalPromptConcept = new JournalPromptConcept(db);

  try {
    console.log("\n=== Testing togglePromptActive ===");

    await journalPromptConcept.createDefaultPrompts({ user: userAlice });

    // Initial state
    let prompts = await journalPromptConcept._getUserPrompts({ user: userAlice });
    assertEquals(prompts[0].isActive, true, "Should start active");
    console.log("✓ Prompt starts active");

    // Toggle to inactive
    await journalPromptConcept.togglePromptActive({
      user: userAlice,
      position: 1,
    });
    prompts = await journalPromptConcept._getUserPrompts({ user: userAlice });
    assertEquals(prompts[0].isActive, false, "Should be inactive");
    console.log("✓ Toggled to inactive");

    // Toggle back to active
    await journalPromptConcept.togglePromptActive({
      user: userAlice,
      position: 1,
    });
    prompts = await journalPromptConcept._getUserPrompts({ user: userAlice });
    assertEquals(prompts[0].isActive, true, "Should be active again");
    console.log("✓ Toggled back to active");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: deletePrompt removes and renumbers", async () => {
  const [db, client] = await testDb();
  const journalPromptConcept = new JournalPromptConcept(db);

  try {
    console.log("\n=== Testing deletePrompt ===");

    await journalPromptConcept.createDefaultPrompts({ user: userAlice });
    
    let prompts = await journalPromptConcept._getUserPrompts({ user: userAlice });
    assertEquals(prompts.length, 5, "Should start with 5");
    const secondPromptText = prompts[1].promptText;
    console.log(`✓ Starting with ${prompts.length} prompts`);

    // Delete position 1
    await journalPromptConcept.deletePrompt({
      user: userAlice,
      position: 1,
    });

    prompts = await journalPromptConcept._getUserPrompts({ user: userAlice });
    assertEquals(prompts.length, 4, "Should have 4 prompts");
    assertEquals(prompts[0].promptText, secondPromptText, "Second should become first");
    assertEquals(prompts[0].position, 1, "Position should be renumbered to 1");
    console.log("✓ Prompt deleted and remaining renumbered");

    // Verify all positions are contiguous
    for (let i = 0; i < prompts.length; i++) {
      assertEquals(prompts[i].position, i + 1, `Position ${i} should be ${i + 1}`);
    }
    console.log("✓ All positions are contiguous (1, 2, 3, 4)");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: addPrompt enforces 5-prompt limit", async () => {
  const [db, client] = await testDb();
  const journalPromptConcept = new JournalPromptConcept(db);

  try {
    console.log("\n=== Testing addPrompt ===");

    await journalPromptConcept.createDefaultPrompts({ user: userAlice });
    console.log("✓ Created 5 default prompts");

    // Try to add 6th prompt
    const result1 = await journalPromptConcept.addPrompt({
      user: userAlice,
      promptText: "Extra prompt",
    });
    assertEquals("error" in result1, true, "Should reject 6th prompt");
    console.log("✓ 6th prompt correctly rejected");

    // Delete one, then add should work
    await journalPromptConcept.deletePrompt({ user: userAlice, position: 1 });
    
    const result2 = await journalPromptConcept.addPrompt({
      user: userAlice,
      promptText: "New prompt",
    });
    assertEquals("error" in result2, false, "Should accept after deletion");
    assertNotEquals("prompt" in result2 && result2.prompt, undefined);
    console.log("✓ Prompt added after deletion");

    const prompts = await journalPromptConcept._getUserPrompts({ user: userAlice });
    assertEquals(prompts.length, 5, "Should have 5 again");
    assertEquals(prompts[4].promptText, "New prompt", "New prompt should be last");
    assertEquals(prompts[4].position, 5, "New prompt should have position 5");
    console.log("✓ New prompt has correct position");

    // Empty text should fail
    const result3 = await journalPromptConcept.addPrompt({
      user: userAlice,
      promptText: "",
    });
    assertEquals("error" in result3, true, "Empty text should fail");
    console.log("✓ Empty text correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getActivePrompts filters correctly", async () => {
  const [db, client] = await testDb();
  const journalPromptConcept = new JournalPromptConcept(db);

  try {
    console.log("\n=== Testing _getActivePrompts Query ===");

    await journalPromptConcept.createDefaultPrompts({ user: userAlice });

    // All should be active initially
    let activePrompts = await journalPromptConcept._getActivePrompts({
      user: userAlice,
    });
    assertEquals(activePrompts.length, 5, "All 5 should be active");
    console.log("✓ All 5 prompts initially active");

    // Deactivate 2 prompts
    await journalPromptConcept.togglePromptActive({ user: userAlice, position: 2 });
    await journalPromptConcept.togglePromptActive({ user: userAlice, position: 4 });

    activePrompts = await journalPromptConcept._getActivePrompts({
      user: userAlice,
    });
    assertEquals(activePrompts.length, 3, "Should have 3 active");
    console.log("✓ 3 prompts active after deactivating 2");

    // Verify they're in order
    assertEquals(activePrompts[0].position, 1);
    assertEquals(activePrompts[1].position, 3);
    assertEquals(activePrompts[2].position, 5);
    console.log("✓ Active prompts maintain position order");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Complete prompt customization workflow", async () => {
  const [db, client] = await testDb();
  const journalPromptConcept = new JournalPromptConcept(db);

  try {
    console.log("\n=== Testing Complete Workflow ===");

    // 1. Create defaults
    await journalPromptConcept.createDefaultPrompts({ user: userAlice });
    console.log("✓ Step 1: Created default prompts");

    // 2. Customize some prompts
    await journalPromptConcept.updatePromptText({
      user: userAlice,
      position: 1,
      newText: "What made you happy today?",
    });
    await journalPromptConcept.updatePromptText({
      user: userAlice,
      position: 5,
      newText: "What's on your mind?",
    });
    console.log("✓ Step 2: Customized 2 prompts");

    // 3. Delete one
    await journalPromptConcept.deletePrompt({ user: userAlice, position: 3 });
    console.log("✓ Step 3: Deleted 1 prompt");

    // 4. Add a new one
    await journalPromptConcept.addPrompt({
      user: userAlice,
      promptText: "What did you learn today?",
    });
    console.log("✓ Step 4: Added new prompt");

    // 5. Deactivate one
    await journalPromptConcept.togglePromptActive({ user: userAlice, position: 2 });
    console.log("✓ Step 5: Deactivated 1 prompt");

    // 6. Verify final state
    const allPrompts = await journalPromptConcept._getUserPrompts({ user: userAlice });
    const activePrompts = await journalPromptConcept._getActivePrompts({ user: userAlice });

    assertEquals(allPrompts.length, 5, "Should have 5 total prompts");
    assertEquals(activePrompts.length, 4, "Should have 4 active prompts");
    assertEquals(allPrompts[0].promptText, "What made you happy today?");
    assertEquals(allPrompts[4].promptText, "What did you learn today?");
    
    console.log("✓ Step 6: Final state verified");
    console.log(`  - Total prompts: ${allPrompts.length}`);
    console.log(`  - Active prompts: ${activePrompts.length}`);
    console.log();
  } finally {
    await client.close();
  }
});
