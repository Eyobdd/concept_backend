[0m[38;5;245mrunning 9 tests from ./src/concepts/JournalPrompt/JournalPromptConcept.test.ts[0m
Principle: User creates default prompts, customizes them, and reorders ...
[0m[38;5;245m------- output -------[0m

=== Testing Operational Principle ===

1. Creating default prompts for Alice...
   ✓ Created 5 default prompts

2. Retrieving prompts...
   ✓ Retrieved 5 prompts
   ✓ First prompt: "What are you grateful for today?"

3. Updating prompt text...
   ✓ Updated to: "What made you smile today?"

4. Reordering prompts...
   ✓ Prompts reordered successfully

=== Operational Principle Test Passed ===

[0m[38;5;245m----- output end -----[0m
Principle: User creates default prompts, customizes them, and reorders ... [0m[32mok[0m [0m[38;5;245m(693ms)[0m
Action: createDefaultPrompts enforces one-time creation ...
[0m[38;5;245m------- output -------[0m

=== Testing createDefaultPrompts Uniqueness ===
✓ First creation succeeded
✓ Duplicate creation correctly rejected
✓ Different user creation succeeded

[0m[38;5;245m----- output end -----[0m
Action: createDefaultPrompts enforces one-time creation ... [0m[32mok[0m [0m[38;5;245m(565ms)[0m
Action: updatePromptText validates input ...
[0m[38;5;245m------- output -------[0m

=== Testing updatePromptText Validation ===
✓ Valid update succeeded
✓ Empty text correctly rejected
✓ Invalid position correctly rejected
✓ Non-existent prompt correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: updatePromptText validates input ... [0m[32mok[0m [0m[38;5;245m(533ms)[0m
Action: reorderPrompts validates order ...
[0m[38;5;245m------- output -------[0m

=== Testing reorderPrompts Validation ===
✓ Valid reorder succeeded
✓ Too many prompts correctly rejected
✓ Missing prompts correctly rejected
✓ Duplicate prompts correctly rejected
✓ Wrong user's prompts correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: reorderPrompts validates order ... [0m[32mok[0m [0m[38;5;245m(698ms)[0m
Action: togglePromptActive toggles status ...
[0m[38;5;245m------- output -------[0m

=== Testing togglePromptActive ===
✓ Prompt starts active
✓ Toggled to inactive
✓ Toggled back to active

[0m[38;5;245m----- output end -----[0m
Action: togglePromptActive toggles status ... [0m[32mok[0m [0m[38;5;245m(595ms)[0m
Action: deletePrompt removes and renumbers ...
[0m[38;5;245m------- output -------[0m

=== Testing deletePrompt ===
✓ Starting with 5 prompts
✓ Prompt deleted and remaining renumbered
✓ All positions are contiguous (1, 2, 3, 4)

[0m[38;5;245m----- output end -----[0m
Action: deletePrompt removes and renumbers ... [0m[32mok[0m [0m[38;5;245m(627ms)[0m
Action: addPrompt enforces 5-prompt limit ...
[0m[38;5;245m------- output -------[0m

=== Testing addPrompt ===
✓ Created 5 default prompts
✓ 6th prompt correctly rejected
✓ Prompt added after deletion
✓ New prompt has correct position
✓ Empty text correctly rejected

[0m[38;5;245m----- output end -----[0m
Action: addPrompt enforces 5-prompt limit ... [0m[32mok[0m [0m[38;5;245m(617ms)[0m
Query: _getActivePrompts filters correctly ...
[0m[38;5;245m------- output -------[0m

=== Testing _getActivePrompts Query ===
✓ All 5 prompts initially active
✓ 3 prompts active after deactivating 2
✓ Active prompts maintain position order

[0m[38;5;245m----- output end -----[0m
Query: _getActivePrompts filters correctly ... [0m[32mok[0m [0m[38;5;245m(630ms)[0m
Scenario: Complete prompt customization workflow ...
[0m[38;5;245m------- output -------[0m

=== Testing Complete Workflow ===
✓ Step 1: Created default prompts
✓ Step 2: Customized 2 prompts
✓ Step 3: Deleted 1 prompt
✓ Step 4: Added new prompt
✓ Step 5: Deactivated 1 prompt
✓ Step 6: Final state verified
  - Total prompts: 5
  - Active prompts: 4

[0m[38;5;245m----- output end -----[0m
Scenario: Complete prompt customization workflow ... [0m[32mok[0m [0m[38;5;245m(727ms)[0m

[0m[32mok[0m | 9 passed | 0 failed [0m[38;5;245m(5s)[0m

