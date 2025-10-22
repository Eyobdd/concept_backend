import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";

// Mock user creation function
let userIdCounter = 0;
const createMockUser = async (): Promise<ID> => {
  return `user:mock${userIdCounter++}` as ID;
};

Deno.test("Principle: User registers, logs in, and authenticates", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n=== Testing Operational Principle ===");

    const phoneNumber = "+12025551234";

    // 1. Request verification code
    console.log("\n1. Requesting verification code...");
    const requestResult = await authConcept.requestVerificationCode({
      phoneNumber,
    });
    assertEquals("error" in requestResult, false, "Request should succeed");
    console.log(`   ✓ Verification code requested for ${phoneNumber}`);

    // Get the code (in production, user would receive via SMS)
    const code = await authConcept._getVerificationCode({ phoneNumber });
    assertNotEquals(code, null, "Code should exist");
    console.log(`   ✓ Code generated: ${code}`);

    // 2. Register with code
    console.log("\n2. Registering user...");
    const registerResult = await authConcept.register({
      phoneNumber,
      code: code!,
      createUser: createMockUser,
    });
    assertNotEquals("error" in registerResult, true, "Registration should succeed");
    const { user } = registerResult as { user: ID };
    console.log(`   ✓ User registered: ${user}`);

    // 3. Request new code for login
    console.log("\n3. Requesting login code...");
    await authConcept.requestVerificationCode({ phoneNumber });
    const loginCode = await authConcept._getVerificationCode({ phoneNumber });
    console.log(`   ✓ Login code generated: ${loginCode}`);

    // 4. Login
    console.log("\n4. Logging in...");
    const loginResult = await authConcept.login({
      phoneNumber,
      code: loginCode!,
    });
    assertNotEquals("error" in loginResult, true, "Login should succeed");
    const { token } = loginResult as { token: string };
    console.log(`   ✓ Login successful, token: ${token.substring(0, 8)}...`);

    // 5. Authenticate with token
    console.log("\n5. Authenticating with token...");
    const authResult = await authConcept.authenticate({ token });
    assertNotEquals("error" in authResult, true, "Auth should succeed");
    const { user: authenticatedUser } = authResult as { user: ID };
    assertEquals(authenticatedUser, user, "Should return same user");
    console.log(`   ✓ Authenticated as user: ${authenticatedUser}`);

    console.log("\n=== Operational Principle Test Passed ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("Action: requestVerificationCode validates phone format", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  console.log("\n=== Testing Phone Number Validation ===");

  // Valid format
  const result1 = await authConcept.requestVerificationCode({
    phoneNumber: "+12025551234",
  });
  assertEquals("error" in result1, false, "Valid phone should succeed");
  console.log("✓ Valid E.164 format accepted");

  // Invalid formats
  const invalidNumbers = ["1234567890", "+0123", "abc", ""];
  for (const invalid of invalidNumbers) {
    const result = await authConcept.requestVerificationCode({
      phoneNumber: invalid,
    });
    assertEquals("error" in result, true, `Invalid format should fail: ${invalid}`);
  }
  console.log(`✓ All ${invalidNumbers.length} invalid formats rejected`);
  console.log();

  await client.close();
});

Deno.test("Action: requestVerificationCode replaces existing codes", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  console.log("\n=== Testing Code Replacement ===");

  const phoneNumber = "+12025551234";

  // Request first code
  await authConcept.requestVerificationCode({ phoneNumber });
  const code1 = await authConcept._getVerificationCode({ phoneNumber });
  console.log(`✓ First code: ${code1}`);

  // Request second code
  await authConcept.requestVerificationCode({ phoneNumber });
  const code2 = await authConcept._getVerificationCode({ phoneNumber });
  console.log(`✓ Second code: ${code2}`);

  assertNotEquals(code1, code2, "Codes should be different");
  console.log("✓ Old code replaced with new code");
  console.log();

  await client.close();
});

Deno.test("Action: register validates verification code", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n=== Testing Registration Validation ===");

    const phoneNumber = "+12025551234";

    // Request code
    await authConcept.requestVerificationCode({ phoneNumber });
    const correctCode = await authConcept._getVerificationCode({ phoneNumber });

    // Try with wrong code
    const result1 = await authConcept.register({
      phoneNumber,
      code: "000000",
      createUser: createMockUser,
    });
    assertEquals("error" in result1, true, "Wrong code should fail");
    console.log("✓ Wrong code rejected");

    // Try with correct code
    const result2 = await authConcept.register({
      phoneNumber,
      code: correctCode!,
      createUser: createMockUser,
    });
    assertEquals("error" in result2, false, "Correct code should succeed");
    console.log("✓ Correct code accepted");

    // Try to register same number again
    await authConcept.requestVerificationCode({ phoneNumber });
    const newCode = await authConcept._getVerificationCode({ phoneNumber });
    
    const result3 = await authConcept.register({
      phoneNumber,
      code: newCode!,
      createUser: createMockUser,
    });
    assertEquals("error" in result3, true, "Duplicate phone should fail");
    console.log("✓ Duplicate phone number rejected");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: login requires verified credentials", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n=== Testing Login Requirements ===");

    const phoneNumber = "+12025551234";

    // Try to login without registration
    await authConcept.requestVerificationCode({ phoneNumber });
    const code1 = await authConcept._getVerificationCode({ phoneNumber });
    
    const result1 = await authConcept.login({
      phoneNumber,
      code: code1!,
    });
    assertEquals("error" in result1, true, "Login without registration should fail");
    console.log("✓ Login without registration rejected");

    // Register user
    await authConcept.requestVerificationCode({ phoneNumber });
    const regCode = await authConcept._getVerificationCode({ phoneNumber });
    await authConcept.register({
      phoneNumber,
      code: regCode!,
      createUser: createMockUser,
    });
    console.log("✓ User registered");

    // Now login should work
    await authConcept.requestVerificationCode({ phoneNumber });
    const loginCode = await authConcept._getVerificationCode({ phoneNumber });
    
    const result2 = await authConcept.login({
      phoneNumber,
      code: loginCode!,
    });
    assertEquals("error" in result2, false, "Login after registration should succeed");
    console.log("✓ Login after registration succeeded");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: logout removes session", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n=== Testing Logout ===");

    const phoneNumber = "+12025551234";

    // Register and login
    await authConcept.requestVerificationCode({ phoneNumber });
    const regCode = await authConcept._getVerificationCode({ phoneNumber });
    await authConcept.register({
      phoneNumber,
      code: regCode!,
      createUser: createMockUser,
    });

    await authConcept.requestVerificationCode({ phoneNumber });
    const loginCode = await authConcept._getVerificationCode({ phoneNumber });
    const { token } = (await authConcept.login({
      phoneNumber,
      code: loginCode!,
    })) as { token: string };
    console.log("✓ User logged in");

    // Verify session works
    const authResult1 = await authConcept.authenticate({ token });
    assertEquals("error" in authResult1, false, "Session should be valid");
    console.log("✓ Session valid before logout");

    // Logout
    const logoutResult = await authConcept.logout({ token });
    assertEquals("error" in logoutResult, false, "Logout should succeed");
    console.log("✓ Logout successful");

    // Verify session no longer works
    const authResult2 = await authConcept.authenticate({ token });
    assertEquals("error" in authResult2, true, "Session should be invalid");
    console.log("✓ Session invalid after logout");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: authenticate rejects expired sessions", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n=== Testing Session Expiration ===");

    const phoneNumber = "+12025551234";

    // Register and login
    await authConcept.requestVerificationCode({ phoneNumber });
    const regCode = await authConcept._getVerificationCode({ phoneNumber });
    const { user } = (await authConcept.register({
      phoneNumber,
      code: regCode!,
      createUser: createMockUser,
    })) as { user: ID };

    await authConcept.requestVerificationCode({ phoneNumber });
    const loginCode = await authConcept._getVerificationCode({ phoneNumber });
    const { token } = (await authConcept.login({
      phoneNumber,
      code: loginCode!,
    })) as { token: string };

    // Manually expire the session
    const sessions = authConcept.sessions;
    await sessions.updateOne(
      { token },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }, // 1 second ago
    );
    console.log("✓ Session manually expired");

    // Try to authenticate
    const authResult = await authConcept.authenticate({ token });
    assertEquals("error" in authResult, true, "Expired session should fail");
    console.log("✓ Expired session rejected");

    // Verify session was removed
    const sessionUser = await authConcept._getSessionUser({ token });
    assertEquals(sessionUser, null, "Session should be deleted");
    console.log("✓ Expired session cleaned up");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteAccount removes credentials and sessions", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n=== Testing Account Deletion ===");

    const phoneNumber = "+12025551234";

    // Register and login
    await authConcept.requestVerificationCode({ phoneNumber });
    const regCode = await authConcept._getVerificationCode({ phoneNumber });
    const { user } = (await authConcept.register({
      phoneNumber,
      code: regCode!,
      createUser: createMockUser,
    })) as { user: ID };

    await authConcept.requestVerificationCode({ phoneNumber });
    const loginCode = await authConcept._getVerificationCode({ phoneNumber });
    const { token } = (await authConcept.login({
      phoneNumber,
      code: loginCode!,
    })) as { token: string };
    console.log("✓ User registered and logged in");

    // Delete account
    const deleteResult = await authConcept.deleteAccount({ user });
    assertEquals("error" in deleteResult, false, "Delete should succeed");
    console.log("✓ Account deleted");

    // Verify session no longer works
    const authResult = await authConcept.authenticate({ token });
    assertEquals("error" in authResult, true, "Session should be invalid");
    console.log("✓ Session invalidated");

    // Verify can't find user by phone
    const foundUser = await authConcept._getUserByPhone({ phoneNumber });
    assertEquals(foundUser, null, "User should not be found");
    console.log("✓ Credentials removed");
    console.log();
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Multiple sessions for same user", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n=== Testing Multiple Sessions ===");

    const phoneNumber = "+12025551234";

    // Register
    await authConcept.requestVerificationCode({ phoneNumber });
    const regCode = await authConcept._getVerificationCode({ phoneNumber });
    const { user } = (await authConcept.register({
      phoneNumber,
      code: regCode!,
      createUser: createMockUser,
    })) as { user: ID };
    console.log("✓ User registered");

    // Login from device 1
    await authConcept.requestVerificationCode({ phoneNumber });
    const code1 = await authConcept._getVerificationCode({ phoneNumber });
    const { token: token1 } = (await authConcept.login({
      phoneNumber,
      code: code1!,
    })) as { token: string };
    console.log("✓ Logged in from device 1");

    // Login from device 2
    await authConcept.requestVerificationCode({ phoneNumber });
    const code2 = await authConcept._getVerificationCode({ phoneNumber });
    const { token: token2 } = (await authConcept.login({
      phoneNumber,
      code: code2!,
    })) as { token: string };
    console.log("✓ Logged in from device 2");

    // Both sessions should work
    const auth1 = await authConcept.authenticate({ token: token1 });
    const auth2 = await authConcept.authenticate({ token: token2 });
    assertEquals("error" in auth1, false, "Session 1 should be valid");
    assertEquals("error" in auth2, false, "Session 2 should be valid");
    console.log("✓ Both sessions valid");

    // Check session count
    const sessions = await authConcept._getUserSessions({ user });
    assertEquals(sessions.length, 2, "Should have 2 sessions");
    console.log(`✓ User has ${sessions.length} active sessions`);

    // Logout from device 1
    await authConcept.logout({ token: token1 });
    console.log("✓ Logged out from device 1");

    // Device 2 should still work
    const auth2After = await authConcept.authenticate({ token: token2 });
    assertEquals("error" in auth2After, false, "Session 2 should still be valid");
    console.log("✓ Device 2 session still valid");
    console.log();
  } finally {
    await client.close();
  }
});
