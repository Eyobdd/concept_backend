[0m[38;5;245mrunning 9 tests from ./src/concepts/CallWindowConcept/CallWindowConcept.test.ts[0m
Principle: User creates recurring and one-off windows to define availability ...
[0m[38;5;245m------- output -------[0m

=== Testing Operational Principle ===

1. Creating recurring window for Monday 9:00-11:00...
   ✓ Created recurring window: 0199e5f1-24e5-7c9b-85ea-8fca47db5a06
   ✓ Recurring window: MONDAY 9:00-11:00

2. Creating one-off window for 2025-01-15 14:00-16:00...
   ✓ Created one-off window: 0199e5f1-2524-7171-8993-dc8d8123504a
   ✓ One-off window: 2025-01-15 14:00-16:00

3. Retrieving all windows for user...
   ✓ Total windows: 2

=== Operational Principle Test Passed ===

[0m[38;5;245m----- output end -----[0m
Principle: User creates recurring and one-off windows to define availability ... [0m[32mok[0m [0m[38;5;245m(591ms)[0m
Action: createRecurringCallWindow enforces requirements ...
[0m[38;5;245m------- output -------[0m

=== Testing createRecurringCallWindow Requirements ===

1. Testing time ordering requirement...
   ✓ Time ordering requirement enforced
   ✓ Equal times correctly rejected

2. Testing uniqueness requirement...
   ✓ First window created
   ✓ Duplicate correctly rejected
   ✓ Same start time with different end rejected
   ✓ Different start time succeeded
   ✓ Different day succeeded
   ✓ Different user succeeded

[0m[38;5;245m----- output end -----[0m
Action: createRecurringCallWindow enforces requirements ... [0m[32mok[0m [0m[38;5;245m(597ms)[0m
Action: createOneOffCallWindow enforces requirements ...
[0m[38;5;245m------- output -------[0m

=== Testing createOneOffCallWindow Requirements ===

1. Testing time ordering requirement...
   ✓ Time ordering requirement enforced

2. Testing uniqueness requirement...
   ✓ First window created
   ✓ Duplicate correctly rejected
   ✓ Different date succeeded
   ✓ Different start time succeeded
   ✓ Different user succeeded

[0m[38;5;245m----- output end -----[0m
Action: createOneOffCallWindow enforces requirements ... [0m[32mok[0m [0m[38;5;245m(644ms)[0m
Action: deleteRecurringCallWindow removes window ...
[0m[38;5;245m------- output -------[0m

=== Testing deleteRecurringCallWindow ===
✓ Window created
✓ Window verified in database
✓ Window deleted
✓ Window removed from database
✓ Non-existent window deletion correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: deleteRecurringCallWindow removes window ... [0m[32mok[0m [0m[38;5;245m(604ms)[0m
Action: deleteOneOffCallWindow removes window ...
[0m[38;5;245m------- output -------[0m

=== Testing deleteOneOffCallWindow ===
✓ Window created
✓ Window verified in database
✓ Window deleted
✓ Window removed from database
✓ Non-existent window deletion correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: deleteOneOffCallWindow removes window ... [0m[32mok[0m [0m[38;5;245m(543ms)[0m
Scenario: User manages multiple recurring windows ...
[0m[38;5;245m------- output -------[0m

=== Testing Multiple Recurring Windows ===
✓ Created 3 recurring windows
✓ All 3 windows retrieved
✓ Query by day works correctly
✓ Window deletion works correctly

[0m[38;5;245m----- output end -----[0m
Scenario: User manages multiple recurring windows ... [0m[32mok[0m [0m[38;5;245m(671ms)[0m
Scenario: User manages multiple one-off windows ...
[0m[38;5;245m------- output -------[0m

=== Testing Multiple One-Off Windows ===
✓ Created 3 one-off windows
✓ All 3 windows retrieved
✓ Query by date works correctly
✓ Multiple windows on same date supported

[0m[38;5;245m----- output end -----[0m
Scenario: User manages multiple one-off windows ... [0m[32mok[0m [0m[38;5;245m(632ms)[0m
Scenario: Mixed recurring and one-off windows ...
[0m[38;5;245m------- output -------[0m

=== Testing Mixed Window Types ===
✓ Created 2 recurring and 2 one-off windows
✓ Total window count correct
✓ Window type separation works correctly
✓ Window type discriminator works correctly

[0m[38;5;245m----- output end -----[0m
Scenario: Mixed recurring and one-off windows ... [0m[32mok[0m [0m[38;5;245m(632ms)[0m
Query: Window retrieval methods work correctly ...
[0m[38;5;245m------- output -------[0m

=== Testing Query Methods ===
✓ _getUserCallWindows works
✓ _getUserRecurringWindows works
✓ _getUserOneOffWindows works
✓ _getRecurringWindowsByDay works
✓ _getOneOffWindowsByDate works

[0m[38;5;245m----- output end -----[0m
Query: Window retrieval methods work correctly ... [0m[32mok[0m [0m[38;5;245m(671ms)[0m

[0m[32mok[0m | 9 passed | 0 failed [0m[38;5;245m(5s)[0m

