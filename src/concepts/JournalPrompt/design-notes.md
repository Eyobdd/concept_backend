# JournalPromptConcept Implementation Notes

## Key Implementation Decisions

### 1. Maximum 5 Prompts Per User
- **Implementation**: Enforced in `addPrompt` action
- **Rationale**: Keeps reflection calls focused and manageable (5-10 minutes max)
- **Benefit**: Prevents overwhelming users with too many questions

### 2. Contiguous Position Numbering
- **Implementation**: Positions always form sequence 1, 2, 3, 4, 5
- **Maintained by**: `deletePrompt` automatically renumbers remaining prompts
- **Rationale**: Simplifies ordering logic, no gaps in sequence
- **Example**: Delete position 2 → positions 3, 4, 5 become 2, 3, 4

### 3. Default Prompts
- **Standard Questions**:
  1. "What are you grateful for today?"
  2. "What did you do today?"
  3. "What are you proud of today?"
  4. "What do you want to do tomorrow?"
  5. "Any other thoughts or reflections?"
- **Rationale**: Provides immediate value, users can customize later
- **Pattern**: Gratitude → Reflection → Pride → Planning → Open-ended

### 4. Active/Inactive Toggle
- **Implementation**: `isActive` boolean flag
- **Use Case**: Temporarily disable prompts without deleting them
- **Query Support**: `_getActivePrompts` filters for reflection sessions
- **Benefit**: Flexibility without data loss

### 5. Reordering Validation
- **Requirements**:
  - Must include all user's prompts exactly once
  - No duplicates allowed
  - Cannot exceed 5 prompts
  - Cannot include other users' prompts
- **Rationale**: Maintains data integrity, prevents user errors
- **Implementation**: Comprehensive validation before updating positions

### 6. Position-Based Updates
- **Pattern**: Most actions use `(user, position)` as identifier
- **Rationale**: Positions are user-facing (1-5), more intuitive than IDs
- **Alternative**: Could use prompt IDs, but positions are simpler for UI

## Testing Coverage
- 9 test cases covering:
  - Operational principle (create, customize, reorder)
  - Uniqueness enforcement (one-time default creation)
  - Input validation (empty text, invalid positions)
  - Reorder validation (duplicates, missing prompts, wrong user)
  - Toggle functionality
  - Delete and renumber logic
  - 5-prompt limit enforcement
  - Active/inactive filtering
  - Complete workflow scenario

## Concept Independence
- Depends only on generic `User` type (ID)
- No references to other concepts
- Self-contained prompt management
- Can be used independently for any prompt-based system

## Design Trade-offs

### Position vs ID-Based Operations
- **Current**: Position-based (1-5)
- **Alternative**: ID-based operations
- **Rationale**: Positions are more user-friendly, match UI expectations

### Automatic Renumbering
- **Current**: Automatic on delete
- **Alternative**: Allow gaps in positions
- **Rationale**: Simplifies logic, maintains clean sequence

### 5-Prompt Hard Limit
- **Current**: Hard limit enforced
- **Alternative**: Configurable limit per user
- **Rationale**: Keeps MVP simple, prevents scope creep on calls

## Future Enhancements (Post-MVP)
- Prompt categories/tags
- Prompt templates library
- Conditional prompts (show based on previous answers)
- Multi-language support
- Prompt analytics (which prompts get best responses)

## No Design Changes Required
The specification was clear and complete. Implementation adds appropriate validation and maintains position integrity through renumbering logic.
