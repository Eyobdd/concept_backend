[0m[38;5;245mrunning 7 tests from ./src/concepts/User/UserConcept.test.ts[0m
Principle: User is created and can be retrieved ...
[0m[38;5;245m------- output -------[0m

=== Testing Operational Principle ===

1. Creating user...
   ✓ Created user: 019a09e7-0ff2-73d0-99ae-c752a500dd97

2. Retrieving user...
   ✓ User retrieved: 019a09e7-0ff2-73d0-99ae-c752a500dd97
   ✓ Created at: 2025-10-22T03:12:09.202Z
   ✓ Timestamp is recent (50ms ago)

=== Operational Principle Test Passed ===

[0m[38;5;245m----- output end -----[0m
Principle: User is created and can be retrieved ... [0m[32mok[0m [0m[38;5;245m(559ms)[0m
Action: createUser generates unique IDs ...
[0m[38;5;245m------- output -------[0m

=== Testing createUser Uniqueness ===
✓ All user IDs are unique
  User 1: 019a09e7-11fa-7e55-a584-cd6b92780b9e
  User 2: 019a09e7-121a-7768-89d4-2b02459ba4c2
  User 3: 019a09e7-122b-71b3-8b73-e47450a80e72

[0m[38;5;245m----- output end -----[0m
Action: createUser generates unique IDs ... [0m[32mok[0m [0m[38;5;245m(536ms)[0m
Action: deleteUser removes user from database ...
[0m[38;5;245m------- output -------[0m

=== Testing deleteUser ===
✓ Created user: 019a09e7-1427-700f-903e-98489e72b20c
✓ User exists in database
✓ User deleted successfully
✓ User removed from database

[0m[38;5;245m----- output end -----[0m
Action: deleteUser removes user from database ... [0m[32mok[0m [0m[38;5;245m(587ms)[0m
Action: deleteUser returns error for non-existent user ...
[0m[38;5;245m------- output -------[0m

=== Testing deleteUser Error Handling ===
✓ Error returned: User user:nonexistent not found.

[0m[38;5;245m----- output end -----[0m
Action: deleteUser returns error for non-existent user ... [0m[32mok[0m [0m[38;5;245m(510ms)[0m
Query: _getAllUsers returns users ordered by creation time ...
[0m[38;5;245m------- output -------[0m

=== Testing _getAllUsers Query ===
✓ Retrieved 3 users
✓ Users ordered by creation time (oldest first)
✓ Timestamps are in ascending order

[0m[38;5;245m----- output end -----[0m
Query: _getAllUsers returns users ordered by creation time ... [0m[32mok[0m [0m[38;5;245m(518ms)[0m
Query: _getUser returns null for non-existent user ...
[0m[38;5;245m------- output -------[0m

=== Testing _getUser with Non-Existent User ===
✓ Returns null for non-existent user

[0m[38;5;245m----- output end -----[0m
Query: _getUser returns null for non-existent user ... [0m[32mok[0m [0m[38;5;245m(439ms)[0m
Scenario: Multiple users can be created and managed independently ...
[0m[38;5;245m------- output -------[0m

=== Testing Multiple User Management ===
✓ Created 3 users
✓ All users exist in database
✓ Deleted Bob
✓ Only Alice and Carol remain

[0m[38;5;245m----- output end -----[0m
Scenario: Multiple users can be created and managed independently ... [0m[32mok[0m [0m[38;5;245m(601ms)[0m

[0m[32mok[0m | 7 passed | 0 failed [0m[38;5;245m(3s)[0m

