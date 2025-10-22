[0m[38;5;245mrunning 9 tests from ./src/concepts/ReflectionSession/ReflectionSessionConcept.test.ts[0m
Principle: User starts session, records responses, sets rating, and completes ...
[0m[38;5;245m------- output -------[0m

=== Testing Operational Principle ===

1. Starting reflection session...
   ✓ Session started: 019a09fa-a446-79c5-8a19-5846a7d06d4e

2. Recording responses...
   ✓ Recorded 3 responses

3. Setting rating...
   ✓ Rating set to 2

4. Completing session...
   ✓ Session completed
   ✓ Final state verified: COMPLETED with rating 2

=== Operational Principle Test Passed ===

[0m[38;5;245m----- output end -----[0m
Principle: User starts session, records responses, sets rating, and completes ... [0m[32mok[0m [0m[38;5;245m(799ms)[0m
Action: startSession enforces one IN_PROGRESS session per user ...
[0m[38;5;245m------- output -------[0m

=== Testing Single Active Session ===
✓ First session started
✓ Second session correctly rejected
✓ Different user session succeeded

[0m[38;5;245m----- output end -----[0m
Action: startSession enforces one IN_PROGRESS session per user ... [0m[32mok[0m [0m[38;5;245m(544ms)[0m
Action: startSession validates prompt count ...
[0m[38;5;245m------- output -------[0m

=== Testing Prompt Count Validation ===
✓ Empty prompts rejected
✓ 6 prompts rejected
✓ 3 prompts accepted

[0m[38;5;245m----- output end -----[0m
Action: startSession validates prompt count ... [0m[32mok[0m [0m[38;5;245m(475ms)[0m
Action: recordResponse validates session state ...
[0m[38;5;245m------- output -------[0m

=== Testing Response Recording Validation ===
✓ Response recorded
✓ Duplicate position rejected
✓ Response after completion rejected

[0m[38;5;245m----- output end -----[0m
Action: recordResponse validates session state ... [0m[32mok[0m [0m[38;5;245m(833ms)[0m
Action: setRating validates rating value ...
[0m[38;5;245m------- output -------[0m

=== Testing Rating Validation ===
✓ All valid ratings (-2 to 2) accepted
✓ All invalid ratings rejected

[0m[38;5;245m----- output end -----[0m
Action: setRating validates rating value ... [0m[32mok[0m [0m[38;5;245m(727ms)[0m
Action: completeSession validates requirements ...
[0m[38;5;245m------- output -------[0m

=== Testing Completion Requirements ===
✓ Completion without rating rejected
✓ Completion without all responses rejected
✓ Completion with all requirements succeeded

[0m[38;5;245m----- output end -----[0m
Action: completeSession validates requirements ... [0m[32mok[0m [0m[38;5;245m(730ms)[0m
Action: abandonSession works correctly ...
[0m[38;5;245m------- output -------[0m

=== Testing Session Abandonment ===
✓ Recorded partial response
✓ Session abandoned
✓ Status set to ABANDONED with endedAt
✓ Cannot record responses after abandonment

[0m[38;5;245m----- output end -----[0m
Action: abandonSession works correctly ... [0m[32mok[0m [0m[38;5;245m(631ms)[0m
Query: _getSessionResponses returns ordered responses ...
[0m[38;5;245m------- output -------[0m

=== Testing Response Ordering ===
✓ Responses returned in correct order (1, 2, 3)

[0m[38;5;245m----- output end -----[0m
Query: _getSessionResponses returns ordered responses ... [0m[32mok[0m [0m[38;5;245m(666ms)[0m
Scenario: Complete reflection workflow ...
[0m[38;5;245m------- output -------[0m

=== Testing Complete Workflow ===
✓ Step 1: Session started
✓ Step 2: Recorded 3 responses
✓ Step 3: Rating set
✓ Step 4: Session completed
✓ Step 5: All data verified
  - Status: COMPLETED
  - Rating: 1
  - Responses: 3

[0m[38;5;245m----- output end -----[0m
Scenario: Complete reflection workflow ... [0m[32mok[0m [0m[38;5;245m(823ms)[0m

[0m[32mok[0m | 9 passed | 0 failed [0m[38;5;245m(6s)[0m

