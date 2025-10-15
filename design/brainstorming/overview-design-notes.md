# Concept Implementation Overview

High-level design decisions across implemented concepts. See individual `design-notes.md` files for details.

## Implementation Status

**Completed**: CallSessionConcept, CallWindowConcept (19/19 tests passing)  
**Pending**: JournalEntryConcept (spec created, simpler implementation than the call concepts)

*Note: Due to the larger-than-anticipated scope of CallWindowConcept and CallSessionConcept, JournalEntryConcept implementation is still pending. The spec has been created and follows similar patterns but represents a simpler implementation.*

## Interesting Development Moments

1. **Learning SSF Queue Modeling**  
   [@20251014_172607.63c62bb2](../../context/design/brainstorming/questioning.md/20251014_172607.63c62bb2.md)  
   Learned how to describe a queue structure in the SSF (State-Space Framework) model, which became crucial for CallSessionConcept's queue implementation.

2. **Major CallConcept Design Update**  
   [@20251014_181053.f8ccc0b0](../../context/design/brainstorming/questioning.md/20251014_181053.f8ccc0b0.md)  
   Significant revision to the original CallConcept design, refining the state and actions.

3. **Action Design Refinement**  
   [@20251014_220454.03ee763a](../../context/design/brainstorming/questioning.md/20251014_220454.03ee763a.md)  
   Updated action specifications to better align with concept principles and implementation requirements.

4. **Concept Separation Decision**  
   [@20251014_223905.0eb97c6a](../../context/design/brainstorming/questioning.md/20251014_223905.0eb97c6a.md)  
   Split CallConcept into CallSessionConcept (operational) and CallWindowConcept (strategic) to separate concerns and improve modularity.

5. **Spec Completion**  
   [@20251014_225548.1bead12a](../../context/design/brainstorming/questioning.md/20251014_225548.1bead12a.md)  
   Finalized the updated CallSessionConcept and CallWindowConcept specifications, ready for implementation.

## CallSessionConcept

**Purpose**: Manage individual call attempt lifecycle

**Key Decisions**:
- **Queue**: Single MongoDB document with CallSession ID array (FIFO, atomic operations)
- **Date/DateTime**: ISO strings for dates, Date objects for timestamps (prevents timezone issues)
- **Retry Tracking**: No maximum limit (intentional flexibility)

**Testing**: 10 tests covering operational principle, requirements, queue ordering

## CallWindowConcept

**Purpose**: Define user availability (recurring weekly + one-off date-specific windows)

**Key Decisions**:
- **Window Types**: Single collection with discriminator ("RECURRING" | "ONEOFF")
  - Recurring: Weekly (e.g., "Every Monday 9-11am")
  - One-Off: Specific dates (e.g., "Jan 15, 2025 2-4pm")
- **Uniqueness**: (user, dayOfWeek, startTime) for recurring; (user, specificDate, startTime) for one-off
- **Multiple Windows**: Allowed per day/date with different start times

**Testing**: 9 tests covering both window types, uniqueness, mixed scenarios

## JournalEntryConcept (Pending Implementation)

**Purpose**: Preserve structured daily journal entries with prompts/responses for reflection

**Key Features** (from spec):
- One entry per (user, date) with rating (-2 to 2)
- Multiple prompts per entry with question-response pairs
- Timestamp tracking for response duration
- Future: Audio recording support (requires GridFS)

**Actions**: createJournalEntry, addPrompt, updateRating, updatePromptResponse, deleteJournalEntry

## Shared Implementation Patterns

**Error Handling**: Discriminated unions `Empty | { error: string }` for type-safe error checking  
**Query Methods**: Underscore prefix (e.g., `_getUserCallSessions`) for test helpers  
**Collections**: Concept name prefix (e.g., `"CallSession."`) for namespace separation

## Testing Approach

- **Operational Principle**: Primary workflow demonstration
- **Requirements**: Each precondition explicitly tested
- **Edge Cases**: Duplicates, non-existent entities, boundaries
- **Human-Readable**: Console output with ✓ checkmarks + programmatic assertions

## Design Fidelity

Both implemented specs were complete and well-formed. No major changes required during implementation—only minor clarifications (e.g., exact time representation formats).
