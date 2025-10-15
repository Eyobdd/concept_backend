# CallWindowConcept Implementation Notes

## Implementation Decisions

### 1. Window Type Discriminator
- **Decision**: Use a `windowType` field ("RECURRING" | "ONEOFF") to distinguish between window types
- **Rationale**: Allows storing both types in a single collection while maintaining type safety through TypeScript discriminated unions

### 2. Time Representation
- **Decision**: Store `startTime` and `endTime` as JavaScript Date objects
- **Rationale**: These represent times of day that can be compared. Using Date objects allows natural time comparison and MongoDB native support

### 3. Date Representation for One-Off Windows
- **Decision**: Store `specificDate` as ISO string (YYYY-MM-DD)
- **Rationale**: Represents calendar dates without time components, consistent with CallSessionConcept approach

### 4. Single Collection Architecture
- **Decision**: Store all windows (recurring and one-off) in one `callWindows` collection
- **Rationale**: 
  - Simplifies queries for all user windows
  - Uses `windowType` discriminator for filtering
  - Reduces database complexity

### 5. Uniqueness Constraints
- **Recurring**: Unique on (user, dayOfWeek, startTime)
- **One-Off**: Unique on (user, specificDate, startTime)
- **Rationale**: Prevents duplicate windows while allowing multiple windows per day/date with different start times

## Specification Compliance

All actions from the spec are fully implemented with proper requirement enforcement and query methods for testing.

## No Design Changes Required (Implementation vs Specification)
The specification was complete and well-formed. No changes were necessary during implementation.
