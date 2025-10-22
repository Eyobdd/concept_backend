import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserConcept from "./UserConcept.ts";

Deno.test("Principle: User is created and can be retrieved", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  try {
    console.log("\n=== Testing Operational Principle ===");

    // 1. Create a user
    console.log("\n1. Creating user...");
    const { user: userId } = await userConcept.createUser();
    console.log(`   ✓ Created user: ${userId}`);

    // 2. Retrieve the user
    console.log("\n2. Retrieving user...");
    const user = await userConcept._getUser({ user: userId });
    assertNotEquals(user, null, "User should exist");
    console.log(`   ✓ User retrieved: ${user!._id}`);
    console.log(`   ✓ Created at: ${user!.createdAt.toISOString()}`);

    // 3. Verify timestamp is recent
    const now = new Date();
    const timeDiff = now.getTime() - user!.createdAt.getTime();
    assertEquals(timeDiff < 5000, true, "Timestamp should be recent");
    console.log(`   ✓ Timestamp is recent (${timeDiff}ms ago)`);

    console.log("\n=== Operational Principle Test Passed ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createUser generates unique IDs", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  try {
    console.log("\n=== Testing createUser Uniqueness ===");

    const { user: user1 } = await userConcept.createUser();
    const { user: user2 } = await userConcept.createUser();
    const { user: user3 } = await userConcept.createUser();

    assertNotEquals(user1, user2, "User IDs should be unique");
    assertNotEquals(user2, user3, "User IDs should be unique");
    assertNotEquals(user1, user3, "User IDs should be unique");

    console.log("✓ All user IDs are unique");
    console.log(`  User 1: ${user1}`);
    console.log(`  User 2: ${user2}`);
    console.log(`  User 3: ${user3}`);
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteUser removes user from database", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  try {
    console.log("\n=== Testing deleteUser ===");

    // Create user
    const { user: userId } = await userConcept.createUser();
    console.log(`✓ Created user: ${userId}`);

    // Verify user exists
    let user = await userConcept._getUser({ user: userId });
    assertNotEquals(user, null, "User should exist");
    console.log("✓ User exists in database");

    // Delete user
    const result = await userConcept.deleteUser({ user: userId });
    assertEquals("error" in result, false, "Delete should succeed");
    console.log("✓ User deleted successfully");

    // Verify user no longer exists
    user = await userConcept._getUser({ user: userId });
    assertEquals(user, null, "User should be deleted");
    console.log("✓ User removed from database");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteUser returns error for non-existent user", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  try {
    console.log("\n=== Testing deleteUser Error Handling ===");

    const fakeUserId = "user:nonexistent" as ID;
    const result = await userConcept.deleteUser({ user: fakeUserId });

    assertEquals("error" in result, true, "Should return error");
    if ("error" in result) {
      console.log(`✓ Error returned: ${result.error}`);
    }
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getAllUsers returns users ordered by creation time", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  try {
    console.log("\n=== Testing _getAllUsers Query ===");

    // Create multiple users with small delays
    const { user: user1 } = await userConcept.createUser();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const { user: user2 } = await userConcept.createUser();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const { user: user3 } = await userConcept.createUser();

    // Retrieve all users
    const allUsers = await userConcept._getAllUsers();

    assertEquals(allUsers.length, 3, "Should have 3 users");
    console.log(`✓ Retrieved ${allUsers.length} users`);

    // Verify ordering (oldest first)
    assertEquals(allUsers[0]._id, user1, "First user should be oldest");
    assertEquals(allUsers[1]._id, user2, "Second user should be middle");
    assertEquals(allUsers[2]._id, user3, "Third user should be newest");
    console.log("✓ Users ordered by creation time (oldest first)");

    // Verify timestamps are in order
    assertEquals(
      allUsers[0].createdAt.getTime() <= allUsers[1].createdAt.getTime(),
      true,
      "Timestamps should be ordered"
    );
    assertEquals(
      allUsers[1].createdAt.getTime() <= allUsers[2].createdAt.getTime(),
      true,
      "Timestamps should be ordered"
    );
    console.log("✓ Timestamps are in ascending order");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getUser returns null for non-existent user", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  try {
    console.log("\n=== Testing _getUser with Non-Existent User ===");

    const fakeUserId = "user:nonexistent" as ID;
    const user = await userConcept._getUser({ user: fakeUserId });

    assertEquals(user, null, "Should return null for non-existent user");
    console.log("✓ Returns null for non-existent user");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Multiple users can be created and managed independently", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  try {
    console.log("\n=== Testing Multiple User Management ===");

    // Create multiple users
    const { user: alice } = await userConcept.createUser();
    const { user: bob } = await userConcept.createUser();
    const { user: carol } = await userConcept.createUser();

    console.log("✓ Created 3 users");

    // Verify all exist
    const allUsers = await userConcept._getAllUsers();
    assertEquals(allUsers.length, 3, "Should have 3 users");
    console.log("✓ All users exist in database");

    // Delete one user
    await userConcept.deleteUser({ user: bob });
    console.log("✓ Deleted Bob");

    // Verify only 2 remain
    const remainingUsers = await userConcept._getAllUsers();
    assertEquals(remainingUsers.length, 2, "Should have 2 users remaining");
    
    const userIds = remainingUsers.map((u) => u._id);
    assertEquals(userIds.includes(alice), true, "Alice should remain");
    assertEquals(userIds.includes(carol), true, "Carol should remain");
    assertEquals(userIds.includes(bob), false, "Bob should be deleted");
    console.log("✓ Only Alice and Carol remain");
    console.log();
  } finally {
    await client.close();
  }
});
