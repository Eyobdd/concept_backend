import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ProfileConcept from "./ProfileConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;

Deno.test("Principle: User creates profile and updates information", async () => {
  const [db, client] = await testDb();
  const profileConcept = new ProfileConcept(db);

  try {
    console.log("\n=== Testing Operational Principle ===");

    // 1. Create a profile
    console.log("\n1. Creating profile for Alice...");
    const createResult = await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice Smith",
      phoneNumber: "+12025551234",
      timezone: "America/New_York",
    });
    assertNotEquals("error" in createResult, true, "Profile creation should succeed");
    const { profile: profileId } = createResult as { profile: ID };
    console.log(`   ✓ Created profile: ${profileId}`);

    // 2. Retrieve the profile
    console.log("\n2. Retrieving profile...");
    const profile = await profileConcept._getProfile({ user: userAlice });
    assertNotEquals(profile, null, "Profile should exist");
    assertEquals(profile!.displayName, "Alice Smith", "Display name should match");
    assertEquals(profile!.phoneNumber, "+12025551234", "Phone number should match");
    assertEquals(profile!.timezone, "America/New_York", "Timezone should match");
    console.log(`   ✓ Profile retrieved with correct data`);
    console.log(`   ✓ Display name: ${profile!.displayName}`);
    console.log(`   ✓ Phone: ${profile!.phoneNumber}`);
    console.log(`   ✓ Timezone: ${profile!.timezone}`);

    // 3. Update display name
    console.log("\n3. Updating display name...");
    const updateResult = await profileConcept.updateDisplayName({
      user: userAlice,
      displayName: "Alice Johnson",
    });
    assertEquals("error" in updateResult, false, "Update should succeed");
    
    const updatedProfile = await profileConcept._getProfile({ user: userAlice });
    assertEquals(updatedProfile!.displayName, "Alice Johnson", "Display name should be updated");
    console.log(`   ✓ Display name updated to: ${updatedProfile!.displayName}`);

    console.log("\n=== Operational Principle Test Passed ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createProfile enforces uniqueness per user", async () => {
  const [db, client] = await testDb();
  const profileConcept = new ProfileConcept(db);

  try {
    console.log("\n=== Testing createProfile Uniqueness ===");

    // Create first profile
    const result1 = await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice",
      phoneNumber: "+12025551234",
      timezone: "America/New_York",
    });
    assertEquals("error" in result1, false, "First profile should succeed");
    console.log("✓ First profile created successfully");

    // Try to create duplicate profile for same user
    const result2 = await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice Updated",
      phoneNumber: "+12025555678",
      timezone: "America/Los_Angeles",
    });
    assertEquals("error" in result2, true, "Duplicate profile should fail");
    console.log("✓ Duplicate profile correctly rejected");

    // Create profile for different user should succeed
    const result3 = await profileConcept.createProfile({
      user: userBob,
      displayName: "Bob",
      phoneNumber: "+13105551234",
      timezone: "America/Chicago",
    });
    assertEquals("error" in result3, false, "Different user profile should succeed");
    console.log("✓ Different user profile created successfully");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: createProfile validates phone number format", async () => {
  const [db, client] = await testDb();
  const profileConcept = new ProfileConcept(db);

  try {
    console.log("\n=== Testing Phone Number Validation ===");

    // Valid E.164 format
    const validResult = await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice",
      phoneNumber: "+12025551234",
      timezone: "America/New_York",
    });
    assertEquals("error" in validResult, false, "Valid phone should succeed");
    console.log("✓ Valid E.164 format accepted: +12025551234");

    // Invalid formats
    const invalidFormats = [
      "1234567890",      // Missing +
      "+1",              // Too short
      "12025551234",     // Missing +
      "+0123456789",     // Starts with 0
      "abc",             // Not a number
    ];

    for (const invalid of invalidFormats) {
      const result = await profileConcept.createProfile({
        user: userBob,
        displayName: "Bob",
        phoneNumber: invalid,
        timezone: "America/New_York",
      });
      assertEquals("error" in result, true, `Invalid format should fail: ${invalid}`);
    }
    console.log(`✓ All ${invalidFormats.length} invalid formats correctly rejected`);
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateDisplayName validates and updates correctly", async () => {
  const [db, client] = await testDb();
  const profileConcept = new ProfileConcept(db);

  try {
    console.log("\n=== Testing updateDisplayName ===");

    // Create profile
    await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice",
      phoneNumber: "+12025551234",
      timezone: "America/New_York",
    });
    console.log("✓ Profile created");

    // Update with valid name
    const result1 = await profileConcept.updateDisplayName({
      user: userAlice,
      displayName: "Alice Johnson",
    });
    assertEquals("error" in result1, false, "Valid update should succeed");
    
    const profile1 = await profileConcept._getProfile({ user: userAlice });
    assertEquals(profile1!.displayName, "Alice Johnson", "Name should be updated");
    console.log("✓ Display name updated successfully");

    // Try empty name
    const result2 = await profileConcept.updateDisplayName({
      user: userAlice,
      displayName: "",
    });
    assertEquals("error" in result2, true, "Empty name should fail");
    console.log("✓ Empty display name correctly rejected");

    // Try whitespace-only name
    const result3 = await profileConcept.updateDisplayName({
      user: userAlice,
      displayName: "   ",
    });
    assertEquals("error" in result3, true, "Whitespace-only name should fail");
    console.log("✓ Whitespace-only name correctly rejected");

    // Try updating non-existent profile
    const result4 = await profileConcept.updateDisplayName({
      user: userBob,
      displayName: "Bob",
    });
    assertEquals("error" in result4, true, "Non-existent profile should fail");
    console.log("✓ Non-existent profile correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: updatePhoneNumber validates and updates correctly", async () => {
  const [db, client] = await testDb();
  const profileConcept = new ProfileConcept(db);

  try {
    console.log("\n=== Testing updatePhoneNumber ===");

    // Create profile
    await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice",
      phoneNumber: "+12025551234",
      timezone: "America/New_York",
    });
    console.log("✓ Profile created");

    // Update with valid phone
    const result1 = await profileConcept.updatePhoneNumber({
      user: userAlice,
      phoneNumber: "+13105559999",
    });
    assertEquals("error" in result1, false, "Valid update should succeed");
    
    const profile1 = await profileConcept._getProfile({ user: userAlice });
    assertEquals(profile1!.phoneNumber, "+13105559999", "Phone should be updated");
    console.log("✓ Phone number updated successfully");

    // Try invalid format
    const result2 = await profileConcept.updatePhoneNumber({
      user: userAlice,
      phoneNumber: "1234567890",
    });
    assertEquals("error" in result2, true, "Invalid format should fail");
    console.log("✓ Invalid phone format correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateTimezone updates correctly", async () => {
  const [db, client] = await testDb();
  const profileConcept = new ProfileConcept(db);

  try {
    console.log("\n=== Testing updateTimezone ===");

    // Create profile
    await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice",
      phoneNumber: "+12025551234",
      timezone: "America/New_York",
    });
    console.log("✓ Profile created");

    // Update timezone
    const result = await profileConcept.updateTimezone({
      user: userAlice,
      timezone: "America/Los_Angeles",
    });
    assertEquals("error" in result, false, "Update should succeed");
    
    const profile = await profileConcept._getProfile({ user: userAlice });
    assertEquals(profile!.timezone, "America/Los_Angeles", "Timezone should be updated");
    console.log("✓ Timezone updated successfully");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteProfile removes profile", async () => {
  const [db, client] = await testDb();
  const profileConcept = new ProfileConcept(db);

  try {
    console.log("\n=== Testing deleteProfile ===");

    // Create profile
    await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice",
      phoneNumber: "+12025551234",
      timezone: "America/New_York",
    });
    console.log("✓ Profile created");

    // Verify it exists
    let profile = await profileConcept._getProfile({ user: userAlice });
    assertNotEquals(profile, null, "Profile should exist");
    console.log("✓ Profile exists");

    // Delete it
    const result = await profileConcept.deleteProfile({ user: userAlice });
    assertEquals("error" in result, false, "Delete should succeed");
    console.log("✓ Profile deleted");

    // Verify it's gone
    profile = await profileConcept._getProfile({ user: userAlice });
    assertEquals(profile, null, "Profile should be deleted");
    console.log("✓ Profile no longer exists");

    // Try deleting non-existent profile
    const result2 = await profileConcept.deleteProfile({ user: userBob });
    assertEquals("error" in result2, true, "Deleting non-existent should fail");
    console.log("✓ Non-existent profile deletion correctly rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getAllProfiles returns all profiles", async () => {
  const [db, client] = await testDb();
  const profileConcept = new ProfileConcept(db);

  try {
    console.log("\n=== Testing _getAllProfiles Query ===");

    // Create multiple profiles
    await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice",
      phoneNumber: "+12025551234",
      timezone: "America/New_York",
    });
    await profileConcept.createProfile({
      user: userBob,
      displayName: "Bob",
      phoneNumber: "+13105551234",
      timezone: "America/Los_Angeles",
    });
    console.log("✓ Created 2 profiles");

    // Retrieve all
    const allProfiles = await profileConcept._getAllProfiles();
    assertEquals(allProfiles.length, 2, "Should have 2 profiles");
    console.log(`✓ Retrieved ${allProfiles.length} profiles`);

    const userIds = allProfiles.map((p) => p.user);
    assertEquals(userIds.includes(userAlice), true, "Alice should be in results");
    assertEquals(userIds.includes(userBob), true, "Bob should be in results");
    console.log("✓ All profiles accounted for");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Profile updatedAt timestamp changes on updates", async () => {
  const [db, client] = await testDb();
  const profileConcept = new ProfileConcept(db);

  try {
    console.log("\n=== Testing updatedAt Timestamp ===");

    // Create profile
    await profileConcept.createProfile({
      user: userAlice,
      displayName: "Alice",
      phoneNumber: "+12025551234",
      timezone: "America/New_York",
    });
    
    const profile1 = await profileConcept._getProfile({ user: userAlice });
    const originalTimestamp = profile1!.updatedAt.getTime();
    console.log(`✓ Profile created with timestamp: ${profile1!.updatedAt.toISOString()}`);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update display name
    await profileConcept.updateDisplayName({
      user: userAlice,
      displayName: "Alice Updated",
    });

    const profile2 = await profileConcept._getProfile({ user: userAlice });
    const newTimestamp = profile2!.updatedAt.getTime();
    
    assertEquals(newTimestamp > originalTimestamp, true, "Timestamp should be updated");
    console.log(`✓ Timestamp updated: ${profile2!.updatedAt.toISOString()}`);
    console.log(`✓ Time difference: ${newTimestamp - originalTimestamp}ms`);
    console.log();
  } finally {
    await client.close();
  }
});
