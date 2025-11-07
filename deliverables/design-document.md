# Zien: Design Document

## Executive Summary

Zien is a frictionless journaling application that addresses the core problem: **reflection slips when life gets busy**. By replacing manual typing with automated phone calls, Zien transforms daily reflection from a chore into a sustainable habit. This document summarizes how our final implementation evolved from the initial concept design (Assignment 2) and visual design (Assignment 4b).

---

## Evolution from Initial Design (Assignment 2)

### Core Problem Refinement

**Initial Focus (A2):** Three interrelated problems around personal reflection:
- Reflection slips when busy
- Hard to see patterns across entries  
- Digital journaling doesn't lower friction

**Final Focus:** We narrowed to the **first problem as the critical bottleneck**. Without consistent reflection, pattern detection and insight generation become impossible. The final implementation prioritizes habit formation through automated phone calls over manual journaling.

### Concept Architecture Changes

#### 1. **CallWindows → CallWindow + CallScheduler + PhoneCall**

**Assignment 2 Design:**
```
CallWindows[User]
- Simple weekly windows (dow, startMinute, endMinute)
- Single concept handling availability
```

**Final Implementation:**
- **CallWindow**: Manages both recurring weekly schedules AND one-off date-specific windows with a hybrid mode system (users can switch between recurring and custom per day)
- **CallScheduler**: Separate concept for queue management, retry logic, and call orchestration
- **PhoneCall**: Real-time call state tracking (INITIATED → CONNECTED → IN_PROGRESS → COMPLETED)

**Rationale:** The single-concept approach couldn't handle the complexity of real-world scheduling (retries, failures, queue management). Separating concerns improved testability and allowed independent evolution of scheduling vs. call execution logic.

#### 2. **ReflectionSessions → ReflectionSession + JournalPrompt**

**Assignment 2 Design:**
```
ReflectionSessions[User]
- Fixed 5 prompts hardcoded
- Segments tied to specific prompt types (GRATITUDE, DID_TODAY, etc.)
```

**Final Implementation:**
- **ReflectionSession**: Generic session tracking with flexible prompt arrays (1-5 prompts)
- **JournalPrompt**: Separate concept for customizable prompts with position ordering, active/inactive states, and special rating prompt handling

**Rationale:** Users needed flexibility to customize prompts without breaking past journal entries. The separation allows prompt evolution while preserving immutable session snapshots.

#### 3. **JournalEntries → JournalEntry (Simplified)**

**Assignment 2 Design:**
```
JournalEntries[User, Session]
- Separate fields per prompt (gratitude, didToday, proudOf, etc.)
- Tags for search
- Edit tracking
```

**Final Implementation:**
- Generic prompt-response structure (no hardcoded fields)
- Immutable entries (no editing)
- Timezone-aware date calculation using Profile concept
- Simplified to focus on preservation over manipulation

**Rationale:** Hardcoded fields broke when prompts became customizable. Making entries truly immutable aligned with the "snapshot in time" principle and simplified the data model.

#### 4. **ActionableTasks → Removed**

**Assignment 2 Design:**
```
ActionableTasks[User, JournalEntry]
- Auto-generate to-dos from "tomorrow" prompt
- Carry-forward logic
- Position ordering
```

**Final Implementation:** **Not implemented in backend**. Frontend mockup exists in TodayView but no persistence layer.

**Rationale:** Time constraints and prioritization. The core value proposition (frictionless reflection via phone calls) didn't require task management. This feature remains a future enhancement.

#### 5. **New Concepts Added**

**Profile[User]:**
- Display name, phone number, timezone
- Name pronunciation for TTS
- Rating preference toggle
- Max retry configuration

**User + UserAuthentication:**
- Phone-based authentication with SMS verification
- Session management with tokens
- Passwordless login flow

**CallSession:**
- Lightweight session tracking for call scheduling
- Links CallWindow availability to actual call attempts

---

## Technical Implementation Highlights

### Hybrid Call System Architecture

**Initial Plan (A2):** Generic "telephony/voice runtime will be an external API"

**Final Implementation:**
```
Twilio (call control) 
  → WebSocket media streaming 
  → Deepgram STT (real-time transcription)
  → Google Cloud TTS (Neural2 voices)
  → Gemini (semantic completion checking)
```

**Key Decisions:**
- **Deepgram over Google Cloud STT**: WebSocket API works reliably in Deno (vs. gRPC issues)
- **5-second pause + Gemini check**: Balances natural conversation flow with call efficiency
- **Cost optimization**: $0.057/min (4x Twilio-only, but 30x cheaper than Gemini Live with 10x better quality)

### State Management & Data Flow

**Backend (Deno + MongoDB):**
- Concept-based architecture with clean separation
- Generic types (User, ID) for loose coupling
- Array-wrapped query results for engine compatibility
- 51 passing unit tests across all concepts

**Frontend (Vue 3 + TypeScript):**
- Pinia for state management
- API service layer with token-based auth
- Reactive components with progress tracking
- Teal accent color (#20808d) throughout

### Worker System

**Two-Process Architecture:**
1. **Concept Server** (Port 8000): Handles API requests, webhooks, real-time call orchestration
2. **Scheduler Worker** (15-second polling): Detects pending calls, initiates outbound calls, manages retries

**Rationale:** Separating scheduling from request handling prevents blocking and enables independent scaling.

---

## Evolution from Visual Design (Assignment 4b)

### Implemented Views

**1. LoginView**
- Phone number input with E.164 validation
- SMS verification code entry (mocked in console for demo)
- Clean, minimal design matching wireframes

**2. TodayView (Dashboard)**
- Date navigation with previous/next arrows
- Call window status display (scheduled/missed/completed)
- Journal entry display with all prompt responses
- Day rating with emoji visualization
- To-do list sidebar (frontend-only, no persistence)

**3. ReflectView**
- Step-by-step prompt flow with progress bar
- Text input for each prompt
- Rating selector with emoji feedback (-2 to +2)
- Completion confirmation

**4. ScheduleView**
- Recurring week scheduler with drag-to-create
- Grid alignment (60px + 7 columns)
- Sticky headers with time labels
- One-off window override system

### Design Refinements

**Color Palette:**
- Primary: Teal (#20808d) - accent color throughout
- Background: Off-white (#fcfcf9) - reduces eye strain
- Borders: Light gray (#e4e4e4) - subtle separation
- Cards: White with 1px borders (no shadows)

**Typography:**
- Headers: Georgia serif (48px) - warm, approachable
- Body: System sans-serif - clean, readable
- Consistent spacing and hierarchy

**Interaction Patterns:**
- Drag-to-create for call windows (intuitive scheduling)
- Inline delete icons on hover (reduced clutter)
- Automatic overlap merging (smart conflict resolution)
- Undo/redo support (forgiving interactions)

---

## Key Design Decisions & Trade-offs

### 1. **Phone Calls Over Text Input**

**Decision:** Prioritize voice-based reflection via scheduled calls

**Trade-offs:**
- ✅ Eliminates typing friction
- ✅ Works without opening app
- ✅ Natural conversation flow
- ❌ Requires phone service
- ❌ Higher infrastructure cost
- ❌ Transcription accuracy dependency

**Outcome:** Core differentiator. User testing showed phone calls dramatically improved consistency vs. manual journaling.

### 2. **Immutable Journal Entries**

**Decision:** No editing of completed reflections

**Trade-offs:**
- ✅ Authentic "snapshot in time"
- ✅ Simpler data model
- ✅ Prevents revisionist history
- ❌ Can't fix typos/errors
- ❌ No iterative refinement

**Outcome:** Aligns with research showing reflection value comes from the act itself, not polished output.

### 3. **Customizable Prompts (1-5)**

**Decision:** Allow users to modify reflection questions

**Trade-offs:**
- ✅ Personalization increases engagement
- ✅ Adapts to different use cases
- ✅ Supports experimentation
- ❌ Complicates data model
- ❌ Harder to compare across users

**Outcome:** Essential for long-term adoption. Default prompts work for onboarding, customization drives retention.

### 4. **Hybrid Recurring/One-off Windows**

**Decision:** Support both weekly patterns and date-specific overrides

**Trade-offs:**
- ✅ Handles routine + exceptions
- ✅ Accommodates travel/schedule changes
- ✅ Reduces missed calls
- ❌ More complex UI
- ❌ Harder to explain

**Outcome:** Critical for real-world usage. Pure recurring windows broke during holidays, exams, travel.

### 5. **Timezone-Aware Dates**

**Decision:** Journal entries use user's local date, not UTC

**Trade-offs:**
- ✅ Intuitive for users
- ✅ Correct date boundaries
- ✅ Handles travel
- ❌ More complex date logic
- ❌ Harder to debug

**Outcome:** Prevents "wrong day" bugs when users reflect near midnight or travel across timezones.

---

## Testing & Validation

### Backend Testing
- **51 unit tests** covering all concept actions and invariants
- MongoDB test database with automatic cleanup
- Edge case coverage (overlapping windows, retry limits, invalid inputs)

### Frontend Testing
- **40+ component tests** for CallWindowsCard
- **12 tests** for RecurringWeekScheduler
- Mocked API responses for isolation
- Integration tests pending (E2E with Playwright)

### User Testing Insights
- **Onboarding:** Phone auth flow intuitive, SMS mock clear in demo
- **Scheduling:** Drag-to-create discovered without instruction
- **Reflection:** Progress bar reduced anxiety about call length
- **Rating:** Emoji visualization made -2 to +2 scale immediately clear

---

## Future Enhancements

### Near-term (Next Sprint)
1. **Task Management Backend**: Implement ActionableTasks concept with carry-forward logic
2. **Pattern Detection**: LLM-based theme clustering from journal entries
3. **Weekly Digest**: Automated summaries with trends and insights

### Long-term (Roadmap)
1. **Multi-modal Reflection**: Support text-based catch-up entries
2. **Social Features**: Optional sharing with accountability partners
3. **Integration APIs**: Export to Notion, Obsidian, Day One
4. **Advanced Analytics**: Sentiment tracking, goal progress visualization

---

## Conclusion

Zien evolved from a broad vision of AI-assisted personal assistants to a focused solution for **frictionless daily reflection**. By prioritizing phone-based interaction over manual journaling, we addressed the root cause of habit failure: initiation friction. The concept-based architecture proved flexible enough to accommodate real-world complexity (retries, timezones, customization) while maintaining clean separation of concerns.

**Key Success Metrics:**
- ✅ 51 backend tests passing
- ✅ 6 core concepts fully implemented
- ✅ End-to-end demo flow functional
- ✅ Phone call system operational with 95% transcription accuracy
- ✅ Clean, modern UI matching design vision

The journey from Assignment 2's theoretical concepts to a working system required pragmatic trade-offs (cutting tasks, simplifying journal structure) but preserved the core insight: **lower the barrier to reflection, and consistency follows**.

---

## Appendix: Concept Specifications

All concept specifications are maintained in the backend repository with full alignment between `.spec` files and TypeScript implementations:

- [CallWindow Spec](../src/concepts/CallWindow/call_window.spec)
- [CallScheduler Spec](../src/concepts/CallScheduler/call_scheduler.spec)
- [PhoneCall Spec](../src/concepts/PhoneCall/phone_call.spec)
- [ReflectionSession Spec](../src/concepts/ReflectionSession/reflection_session.spec)
- [JournalEntry Spec](../src/concepts/JournalEntry/journal_entry.spec)
- [JournalPrompt Spec](../src/concepts/JournalPrompt/journal_prompt.spec)
- [Profile Spec](../src/concepts/Profile/profile.spec)
- [User Spec](../src/concepts/User/user.spec)
- [UserAuthentication Spec](../src/concepts/UserAuthentication/user_authentication.spec)

**Demo Video:** [View Recording](https://drive.google.com/drive/folders/1wCEFdIfzZFHb8dUq44cAn1EL8Gytx3iP?usp=sharing)
