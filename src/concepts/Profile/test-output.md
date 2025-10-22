[0m[38;5;245mrunning 9 tests from ./src/concepts/Profile/ProfileConcept.test.ts[0m
Principle: User creates profile and updates information ...
[0m[38;5;245m------- output -------[0m

=== Testing Operational Principle ===

1. Creating profile for Alice...
   ✓ Created profile: 986fc0aa-4df0-4df5-ad71-343cfa25c05b

2. Retrieving profile...
   ✓ Profile retrieved with correct data
   ✓ Display name: Alice Smith
   ✓ Phone: +12025551234
   ✓ Timezone: America/New_York

3. Updating display name...
   ✓ Display name updated to: Alice Johnson

=== Operational Principle Test Passed ===

[0m[38;5;245m----- output end -----[0m
Principle: User creates profile and updates information ... [0m[32mok[0m [0m[38;5;245m(605ms)[0m
Action: createProfile enforces uniqueness per user ...
[0m[38;5;245m------- output -------[0m

=== Testing createProfile Uniqueness ===
✓ First profile created successfully
✓ Duplicate profile correctly rejected
✓ Different user profile created successfully

[0m[38;5;245m----- output end -----[0m
Action: createProfile enforces uniqueness per user ... [0m[32mok[0m [0m[38;5;245m(615ms)[0m
Action: createProfile validates phone number format ...
[0m[38;5;245m------- output -------[0m

=== Testing Phone Number Validation ===
✓ Valid E.164 format accepted: +12025551234
✓ All 5 invalid formats correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: createProfile validates phone number format ... [0m[32mok[0m [0m[38;5;245m(556ms)[0m
Action: updateDisplayName validates and updates correctly ...
[0m[38;5;245m------- output -------[0m

=== Testing updateDisplayName ===
✓ Profile created
✓ Display name updated successfully
✓ Empty display name correctly rejected
✓ Whitespace-only name correctly rejected
✓ Non-existent profile correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: updateDisplayName validates and updates correctly ... [0m[32mok[0m [0m[38;5;245m(541ms)[0m
Action: updatePhoneNumber validates and updates correctly ...
[0m[38;5;245m------- output -------[0m

=== Testing updatePhoneNumber ===
✓ Profile created
✓ Phone number updated successfully
✓ Invalid phone format correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: updatePhoneNumber validates and updates correctly ... [0m[32mok[0m [0m[38;5;245m(537ms)[0m
Action: updateTimezone updates correctly ...
[0m[38;5;245m------- output -------[0m

=== Testing updateTimezone ===
✓ Profile created
✓ Timezone updated successfully

[0m[38;5;245m----- output end -----[0m
Action: updateTimezone updates correctly ... [0m[32mok[0m [0m[38;5;245m(532ms)[0m
Action: deleteProfile removes profile ...
[0m[38;5;245m------- output -------[0m

=== Testing deleteProfile ===
✓ Profile created
✓ Profile exists
✓ Profile deleted
✓ Profile no longer exists
✓ Non-existent profile deletion correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: deleteProfile removes profile ... [0m[32mok[0m [0m[38;5;245m(536ms)[0m
Query: _getAllProfiles returns all profiles ...
[0m[38;5;245m------- output -------[0m

=== Testing _getAllProfiles Query ===
✓ Created 2 profiles
✓ Retrieved 2 profiles
✓ All profiles accounted for

[0m[38;5;245m----- output end -----[0m
Query: _getAllProfiles returns all profiles ... [0m[32mok[0m [0m[38;5;245m(580ms)[0m
Scenario: Profile updatedAt timestamp changes on updates ...
[0m[38;5;245m------- output -------[0m

=== Testing updatedAt Timestamp ===
✓ Profile created with timestamp: 2025-10-22T03:16:04.241Z
✓ Timestamp updated: 2025-10-22T03:16:04.406Z
✓ Time difference: 165ms

[0m[38;5;245m----- output end -----[0m
Scenario: Profile updatedAt timestamp changes on updates ... [0m[32mok[0m [0m[38;5;245m(659ms)[0m

[0m[32mok[0m | 9 passed | 0 failed [0m[38;5;245m(5s)[0m

