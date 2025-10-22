[0m[38;5;245mrunning 8 tests from ./src/concepts/JournalEntry/JournalEntryConcept.test.ts[0m
Principle: Create immutable entry from completed session ...
[0m[38;5;245m------- output -------[0m

=== Testing Operational Principle ===

1. Creating journal entry from session...
   ✓ Entry created: 019a09fd-5fb6-7334-98ef-5cbd9bfc0bc3

2. Retrieving entry...
   ✓ Entry retrieved for date: 2025-01-15
   ✓ Rating: 2

3. Retrieving responses...
   ✓ Retrieved 3 responses
   ✓ First response: "My family and health"

=== Operational Principle Test Passed ===

[0m[38;5;245m----- output end -----[0m
Principle: Create immutable entry from completed session ... [0m[32mok[0m [0m[38;5;245m(659ms)[0m
Action: createFromSession enforces one entry per user per date ...
[0m[38;5;245m------- output -------[0m

=== Testing Date Uniqueness ===
✓ First entry created for 2025-01-15
✓ Duplicate entry for same date rejected
✓ Entry for different date succeeded
✓ Entry for different user succeeded

[0m[38;5;245m----- output end -----[0m
Action: createFromSession enforces one entry per user per date ... [0m[32mok[0m [0m[38;5;245m(771ms)[0m
Action: createFromSession validates rating ...
[0m[38;5;245m------- output -------[0m

=== Testing Rating Validation ===
✓ All valid ratings (-2 to 2) accepted
✓ All invalid ratings rejected

[0m[38;5;245m----- output end -----[0m
Action: createFromSession validates rating ... [0m[32mok[0m [0m[38;5;245m(993ms)[0m
Action: deleteEntry removes entry and responses ...
[0m[38;5;245m------- output -------[0m

=== Testing Entry Deletion ===
✓ Entry created
✓ Responses exist
✓ Entry deleted
✓ Entry removed from database
✓ Responses removed from database

[0m[38;5;245m----- output end -----[0m
Action: deleteEntry removes entry and responses ... [0m[32mok[0m [0m[38;5;245m(661ms)[0m
Query: _getEntriesByUser returns entries ordered by date ...
[0m[38;5;245m------- output -------[0m

=== Testing User Entries Query ===
✓ Created 3 entries
✓ Entries ordered by date descending (newest first)

[0m[38;5;245m----- output end -----[0m
Query: _getEntriesByUser returns entries ordered by date ... [0m[32mok[0m [0m[38;5;245m(835ms)[0m
Query: _getEntriesByDateRange filters correctly ...
[0m[38;5;245m------- output -------[0m

=== Testing Date Range Query ===
✓ Created 4 entries
✓ Date range filter works correctly
  - Found 2 entries between 2025-01-15 and 2025-01-20

[0m[38;5;245m----- output end -----[0m
Query: _getEntriesByDateRange filters correctly ... [0m[32mok[0m [0m[38;5;245m(857ms)[0m
Query: _getEntryResponses returns ordered responses ...
[0m[38;5;245m------- output -------[0m

=== Testing Response Ordering ===
✓ Responses ordered by position (1, 2, 3)
✓ All response data preserved (immutable snapshot)

[0m[38;5;245m----- output end -----[0m
Query: _getEntryResponses returns ordered responses ... [0m[32mok[0m [0m[38;5;245m(575ms)[0m
Scenario: Complete journal entry lifecycle ...
[0m[38;5;245m------- output -------[0m

=== Testing Complete Lifecycle ===
✓ Step 1: Entry created
✓ Step 2: Entry retrieved by date
✓ Step 3: Responses retrieved
✓ Step 4: Data verified as immutable snapshot
✓ Step 5: Entry deleted

✓ Complete lifecycle verified

[0m[38;5;245m----- output end -----[0m
Scenario: Complete journal entry lifecycle ... [0m[32mok[0m [0m[38;5;245m(708ms)[0m

[0m[32mok[0m | 8 passed | 0 failed [0m[38;5;245m(6s)[0m

