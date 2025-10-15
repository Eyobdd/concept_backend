[0m[38;5;245mrunning 10 tests from ./src/concepts/CallSessionConcept/CallSessionConcept.test.ts[0m
Principle: User creates call session, enqueues it, and marks it completed ...
[0m[38;5;245m------- output -------[0m

=== Testing Operational Principle ===

1. Creating call session for Alice on 2025-01-15...
   ✓ Created call session: 0199e5e5-e1d8-7767-bb96-b7df50639484
   ✓ Session state: status=PENDING, retries=0, source=SCHEDULED

2. Enqueuing call session...
   ✓ Call session enqueued successfully
   ✓ Queue contains 1 session(s)
   ✓ Session updated: retries=1, lastAttempt set

3. Marking call as completed...
   ✓ Call marked as COMPLETED
   ✓ Final state: status=COMPLETED, journalEntry=journal:entry1
   ✓ Session removed from queue

=== Operational Principle Test Passed ===

[0m[38;5;245m----- output end -----[0m
Principle: User creates call session, enqueues it, and marks it completed ... [0m[32mok[0m [0m[38;5;245m(724ms)[0m
Action: createCallSession enforces uniqueness constraint ...
[0m[38;5;245m------- output -------[0m

=== Testing createCallSession Uniqueness ===
✓ First session created successfully
✓ Duplicate creation correctly rejected
✓ Different date creation succeeded
✓ Different user creation succeeded

[0m[38;5;245m----- output end -----[0m
Action: createCallSession enforces uniqueness constraint ... [0m[32mok[0m [0m[38;5;245m(634ms)[0m
Action: deleteCallSession removes session and clears from queue ...
[0m[38;5;245m------- output -------[0m

=== Testing deleteCallSession ===
✓ Session created and enqueued
✓ Session deleted
✓ Session removed from database
✓ Session removed from queue
✓ Deletion of non-existent session correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: deleteCallSession removes session and clears from queue ... [0m[32mok[0m [0m[38;5;245m(694ms)[0m
Action: enqueueCall enforces all requirements ...
[0m[38;5;245m------- output -------[0m

=== Testing enqueueCall Requirements ===
✓ Requirement: Session must exist - enforced
✓ Requirement: Status must be PENDING - enforced
✓ First enqueue succeeded
✓ Requirement: Must not already be in queue - enforced

[0m[38;5;245m----- output end -----[0m
Action: enqueueCall enforces all requirements ... [0m[32mok[0m [0m[38;5;245m(867ms)[0m
Action: markCallCompleted updates status and removes from queue ...
[0m[38;5;245m------- output -------[0m

=== Testing markCallCompleted ===
✓ Session marked as completed
✓ Status and journal entry correctly updated
✓ Session removed from queue
✓ Non-existent session correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: markCallCompleted updates status and removes from queue ... [0m[32mok[0m [0m[38;5;245m(686ms)[0m
Action: markCallMissed updates status and removes from queue ...
[0m[38;5;245m------- output -------[0m

=== Testing markCallMissed ===
✓ Session marked as missed
✓ Status correctly updated to MISSED
✓ Session removed from queue
✓ Non-existent session correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: markCallMissed updates status and removes from queue ... [0m[32mok[0m [0m[38;5;245m(675ms)[0m
Scenario: Multiple retries with enqueue ...
[0m[38;5;245m------- output -------[0m

=== Testing Multiple Retry Scenario ===
✓ First enqueue: retries = 1
✓ Second enqueue: retries = 2
✓ Third enqueue: retries = 3
✓ Multiple retry scenario completed successfully

[0m[38;5;245m----- output end -----[0m
Scenario: Multiple retries with enqueue ... [0m[32mok[0m [0m[38;5;245m(898ms)[0m
Scenario: Queue ordering with multiple sessions ...
[0m[38;5;245m------- output -------[0m

=== Testing Queue Ordering ===
✓ Created 3 sessions
✓ Queue maintains FIFO order
✓ Queue correctly updated after completion

[0m[38;5;245m----- output end -----[0m
Scenario: Queue ordering with multiple sessions ... [0m[32mok[0m [0m[38;5;245m(939ms)[0m
Query: _getUserCallSessions retrieves all sessions for a user ...
[0m[38;5;245m------- output -------[0m

=== Testing _getUserCallSessions Query ===
✓ Retrieved all 3 sessions for Alice
✓ Retrieved 1 session for Bob

[0m[38;5;245m----- output end -----[0m
Query: _getUserCallSessions retrieves all sessions for a user ... [0m[32mok[0m [0m[38;5;245m(666ms)[0m
Query: _getCallSessionsByStatus filters correctly ...
[0m[38;5;245m------- output -------[0m

=== Testing _getCallSessionsByStatus Query ===
✓ Found 1 PENDING session
✓ Found 1 COMPLETED session
✓ Found 1 MISSED session

[0m[38;5;245m----- output end -----[0m
Query: _getCallSessionsByStatus filters correctly ... [0m[32mok[0m [0m[38;5;245m(736ms)[0m

[0m[32mok[0m | 10 passed | 0 failed [0m[38;5;245m(7s)[0m

