# Zien - Concept Architecture

## Overview

This document describes the concept-based architecture for Zien, a frictionless journaling application that helps users reflect daily through structured prompts.

## Core Concepts (MVP)

### 1. **User** - Identity Management
- **Purpose**: Represent unique user identities
- **State**: User ID, creation timestamp
- **Key Actions**: createUser, deleteUser

### 2. **UserAuthentication** - Phone-Based Auth
- **Purpose**: Authenticate users via phone number verification
- **State**: Credentials (phone numbers), verification codes, sessions
- **Key Actions**: requestVerificationCode, register, login, logout, authenticate
- **Implementation**: Mocked SMS for MVP (console logs), real Twilio later

### 3. **Profile** - User Information
- **Purpose**: Store user profile data (display name, phone, timezone)
- **State**: Profile per user with contact/preference info
- **Key Actions**: createProfile, updateDisplayName, updatePhoneNumber, updateTimezone

### 4. **CallWindow** ✅ (Already Implemented)
- **Purpose**: Define user availability for reflection calls
- **State**: Recurring and one-off call windows
- **Key Actions**: createRecurringCallWindow, createOneOffCallWindow, delete windows

### 5. **CallSession** ✅ (Already Implemented)
- **Purpose**: Track individual call attempts per user per day
- **State**: Call sessions with status (PENDING/MISSED/COMPLETED), retry tracking, queue
- **Key Actions**: createCallSession, enqueueCall, markCallCompleted, markCallMissed

### 6. **JournalPrompt** - Customizable Prompts
- **Purpose**: Allow users to customize reflection questions
- **State**: Up to 5 prompt templates per user, ordered, can be active/inactive
- **Key Actions**: createDefaultPrompts, updatePromptText, reorderPrompts, togglePromptActive
- **Default Prompts**:
  1. "What are you grateful for today?"
  2. "What did you do today?"
  3. "What are you proud of today?"
  4. "What do you want to do tomorrow?"
  5. "Any other thoughts or reflections?"

### 7. **ReflectionSession** - Live Reflection Tracking
- **Purpose**: Track real-time progress during a reflection session
- **State**: Session with status, prompt responses with timestamps, separate rating field
- **Key Actions**: startSession, recordResponse, setRating, completeSession, abandonSession
- **Flow**: Start → Record responses → Set rating → Complete

### 8. **JournalEntry** - Immutable Records
- **Purpose**: Preserve completed reflections as permanent daily records
- **State**: Immutable entries with prompt snapshots, responses, and rating
- **Key Actions**: createFromSession, deleteEntry, queries for retrieval
- **Principle**: Responses and rating are immutable snapshots from the reflection session

## Deferred Concepts (Post-MVP)

### 9. **Tasks** - To-Do Management
- **Rationale**: Deferred to focus on core journaling experience
- **Future**: Extract actionable items from "tomorrow" responses

## Concept Dependencies & Synchronizations

### Key Synchronizations

1. **Registration Flow**
   ```
   when UserAuthentication.register(phone, code)
   then User.createUser()
   then Profile.createProfile(user, defaultName, phone, defaultTimezone)
   then JournalPrompt.createDefaultPrompts(user)
   ```

2. **Session to Journal**
   ```
   when ReflectionSession.completeSession(session)
   where session.status = COMPLETED
   then JournalEntry.createFromSession(session)
   then CallSession.markCallCompleted(user, date, entry)
   ```

3. **Call Initiation** (Future - with Twilio)
   ```
   when CallSession.enqueueCall(user, date)
   then TwilioService.initiateCall(user.phoneNumber, callSession)
   ```

## Data Flow

### User Journey
1. **Register**: Phone verification → User + Profile + Default Prompts created
2. **Customize**: User modifies prompts via JournalPrompt
3. **Reflect**: User starts reflection → ReflectionSession tracks progress
4. **Complete**: Session completes → Immutable JournalEntry created
5. **Review**: User views past entries via JournalEntry queries

## Implementation Status

### ✅ Completed
- CallWindow (spec + implementation + tests)
- CallSession (spec + implementation + tests)
- JournalPrompt (spec only)
- ReflectionSession (spec only)
- JournalEntry (spec only)
- Profile (spec only)
- User (spec only)
- UserAuthentication (spec only)

### 🔄 In Progress
- TypeScript implementations for new concepts
- Test suites for new concepts
- Frontend integration

### 📋 Planned
- Twilio integration (replace mocked SMS)
- Tasks concept (post-MVP)
- Advanced analytics/trends

## Design Decisions

### Why Separate ReflectionSession and JournalEntry?
- **ReflectionSession**: Mutable, tracks live progress, can be abandoned
- **JournalEntry**: Immutable, permanent record, created only from completed sessions
- **Benefit**: Clean separation of concerns, allows partial sessions without polluting journal

### Why Separate JournalPrompt from Prompts?
- **JournalPrompt**: User's current prompt templates (mutable)
- **PromptResponses**: Snapshots in entries (immutable)
- **Benefit**: Users can modify prompts without affecting past entries

### Why Phone Auth for MVP?
- Aligns with future phone call feature
- Modern, passwordless UX
- Mocked SMS keeps development simple

### Why No Tasks in MVP?
- Core value = frictionless journaling
- Tasks are extension, not essential
- Can add later without architectural changes

## File Structure

```
concept_backend/src/concepts/
├── CallWindow/
│   ├── call_window.spec
│   ├── CallWindowConcept.ts
│   ├── CallWindowConcept.test.ts
│   ├── design-notes.md
│   └── test-output.md
├── CallSession/
│   ├── call_session.spec
│   ├── CallSessionConcept.ts
│   ├── CallSessionConcept.test.ts
│   ├── design-notes.md
│   └── test-output.md
├── JournalPrompt/
│   └── journal_prompt.spec
├── ReflectionSession/
│   └── reflection_session.spec
├── JournalEntry/
│   └── journal_entry.spec
├── Profile/
│   └── profile.spec
├── User/
│   └── user.spec
└── UserAuthentication/
    └── user_authentication.spec
```

## Next Steps

1. Implement TypeScript classes for all new concepts
2. Create comprehensive test suites
3. Update frontend to integrate with backend concepts
4. Document synchronizations in app composition layer
