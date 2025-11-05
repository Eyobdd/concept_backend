/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // User - Public endpoint for registration
  "/api/User/createUser": "needed for registration flow before authentication",
  
  // UserAuthentication - Public endpoints for login/registration
  "/api/UserAuthentication/requestVerificationCode": "public endpoint to request verification codes",
  "/api/UserAuthentication/register": "public endpoint for user registration",
  "/api/UserAuthentication/login": "public endpoint for user login",
  "/api/UserAuthentication/authenticate": "needed to validate session tokens",
  "/api/UserAuthentication/logout": "needed to invalidate session tokens",
  "/api/UserAuthentication/createVerifiedCredentials": "public endpoint for completing registration with verified phone",
  "/api/UserAuthentication/_getUserByPhone": "needed to check if user exists during registration",
  "/api/UserAuthentication/_getVerificationCode": "testing/debug endpoint for verification codes",
  
  // ReflectionSession - Session-based endpoints (no user auth needed, just session ID)
  "/api/ReflectionSession/setRating": "sets rating for a reflection session using session ID only",
  "/api/ReflectionSession/abandonSession": "abandons a session directly without Requesting concept to avoid Engine timeout issues",
  "/api/ReflectionSession/_getActiveSession": "checks for active session directly without Requesting concept to avoid Engine timeout issues",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Profile - All require authentication
  "/api/Profile/createProfile",
  "/api/Profile/updateDisplayName",
  "/api/Profile/updatePhoneNumber",
  "/api/Profile/updateTimezone",
  "/api/Profile/updateRatingPreference",
  "/api/Profile/deleteProfile",
  "/api/Profile/_getProfile",
  "/api/Profile/_getAllProfiles",
  
  // JournalPrompt - All require authentication
  "/api/JournalPrompt/createDefaultPrompts",
  "/api/JournalPrompt/updatePromptText",
  "/api/JournalPrompt/reorderPrompts",
  "/api/JournalPrompt/togglePromptActive",
  "/api/JournalPrompt/deletePrompt",
  "/api/JournalPrompt/addPrompt",
  "/api/JournalPrompt/_getUserPrompts",
  "/api/JournalPrompt/_getActivePrompts",
  
  // ReflectionSession - Most require authentication (abandonSession and _getActiveSession in inclusions to avoid timeout)
  "/api/ReflectionSession/startSession",
  "/api/ReflectionSession/recordResponse",
  "/api/ReflectionSession/completeSession",
  "/api/ReflectionSession/_getSessionResponses",
  "/api/ReflectionSession/_getUserSessions",
  "/api/ReflectionSession/_getSession",
  "/api/ReflectionSession/getSessionStatus",
  
  // JournalEntry - All require authentication
  "/api/JournalEntry/formatDateInTimezone",
  "/api/JournalEntry/createFromSession",
  "/api/JournalEntry/deleteEntry",
  "/api/JournalEntry/_getEntriesByUser",
  "/api/JournalEntry/_getEntriesWithResponsesByUser",
  "/api/JournalEntry/_getEntriesByDateRange",
  "/api/JournalEntry/_getEntryByDate",
  "/api/JournalEntry/_getEntryResponses",
  
  // CallWindow - All require authentication
  "/api/CallWindow/createRecurringCallWindow",
  "/api/CallWindow/createOneOffCallWindow",
  "/api/CallWindow/deleteRecurringCallWindow",
  "/api/CallWindow/deleteOneOffCallWindow",
  "/api/CallWindow/_getUserCallWindows",
  "/api/CallWindow/_getUserRecurringWindows",
  "/api/CallWindow/_getUserOneOffWindows",
  "/api/CallWindow/_getRecurringWindowsByDay",
  "/api/CallWindow/_getOneOffWindowsByDate",
  "/api/CallWindow/mergeOverlappingOneOffWindows",
  "/api/CallWindow/setDayModeCustom",
  "/api/CallWindow/setDayModeRecurring",
  "/api/CallWindow/shouldUseRecurring",
  
  // CallSession - All require authentication (if implemented)
  "/api/CallSession/createSession",
  "/api/CallSession/completeSession",
  "/api/CallSession/_getSession",
  "/api/CallSession/_getUserSessions",
  
  // UserAuthentication - Authenticated actions
  "/api/UserAuthentication/deleteAccount",
  "/api/UserAuthentication/_getSessionUser",
  "/api/UserAuthentication/_getUserSessions",
  
  // User - Authenticated actions
  "/api/User/deleteUser",
  "/api/User/_getUser",
  "/api/User/_getAllUsers",
];
