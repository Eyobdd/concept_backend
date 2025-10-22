[@api-extraction-from-spec](api-extraction-from-spec.md)

# Extracting from code

The following is an explanation of how concepts are implemented, for the purposes of understanding how to extract an API.

[@implementing-concepts](../background/implementing-concepts.md)

# prompt: 

Now, analyze the following Concept Implementations and generate the API documentation based on these instructions.

### CallSessionConcept

**Implementation**
[@call-session-implementation](../concepts/CallSessionConcept/implementation.md)
### CallWindowConcept

**Implementation**
[@call-window-implementation](../concepts/CallWindowConcept/implementation.md)

### Current API Description
[@20251020_065705.dea52600](../../context/design/tools/api-extraction-from-code.md/20251020_065705.dea52600.md)

# response:

Based on the provided instructions and the referenced concept implementations for `CallSessionConcept` and `CallWindowConcept`, here is the extracted API documentation in the specified Markdown format.

# API Specification: CallSession Concept

**Purpose:** Manage the lifecycle of a real-time call, including participants and their status.

---

## API Endpoints

### POST /api/CallSession/createSession

**Description:** Creates a new real-time call session and designates the creator as the host.

**Requirements:**
- `host` must be a valid User ID.

**Effects:**
- A new call session is created with a unique ID.
- The `host` is added as the first participant of the session.
- The new session's ID is returned.

**Request Body:**
```json
{
  "host": "ID",
  "name": "string"
}
```

**Success Response Body (Action):**
```json
{
  "session": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/CallSession/joinSession

**Description:** Adds a user to an existing call session.

**Requirements:**
- The session with the given `session` ID must exist.
- The `user` must not already be a participant in the session.

**Effects:**
- The `user` is added to the list of participants for the specified session.

**Request Body:**
```json
{
  "user": "ID",
  "session": "ID"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/CallSession/leaveSession

**Description:** Removes a user from a call session they are currently in.

**Requirements:**
- The `user` must be a current participant in the session identified by `session`.

**Effects:**
- The `user` is removed from the list of participants for the specified session.

**Request Body:**
```json
{
  "user": "ID",
  "session": "ID"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/CallSession/endSession

**Description:** Ends a call session, removing all participants. This can only be done by the session host.

**Requirements:**
- The session with the given `session` ID must exist.
- The `user` must be the host of the session.

**Effects:**
- The session is marked as inactive or deleted.
- All participants are removed from the session.

**Request Body:**
```json
{
  "user": "ID",
  "session": "ID"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/CallSession/_getParticipants

**Description:** Retrieves a list of all participants currently in a specific call session.

**Requirements:**
- The session with the given `session` ID must exist.

**Effects:**
- Returns a list of all user IDs participating in the session.

**Request Body:**
```json
{
  "session": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

# API Specification: CallWindow Concept

**Purpose:** Allow users to define and manage time windows during which they are available for calls.

---

## API Endpoints

### POST /api/CallWindow/createWindow

**Description:** Creates a new time window to indicate a user's availability for calls.

**Requirements:**
- `owner` must be a valid User ID.
- `endTime` must be a timestamp that occurs after `startTime`.

**Effects:**
- A new availability window is created with a unique ID.
- The window is associated with the `owner` and stores the `startTime` and `endTime`.
- The new window's ID is returned.

**Request Body:**
```json
{
  "owner": "ID",
  "startTime": "number",
  "endTime": "number"
}
```

**Success Response Body (Action):**
```json
{
  "window": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/CallWindow/updateWindow

**Description:** Updates the start and end times for an existing availability window.

**Requirements:**
- The window with the given `window` ID must exist.
- The `owner` must be the owner of the specified window.
- `endTime` must be a timestamp that occurs after `startTime`.

**Effects:**
- The `startTime` and `endTime` for the specified `window` are updated.

**Request Body:**
```json
{
  "owner": "ID",
  "window": "ID",
  "startTime": "number",
  "endTime": "number"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/CallWindow/deleteWindow

**Description:** Deletes a user's availability window.

**Requirements:**
- The window with the given `window` ID must exist.
- The `owner` must be the owner of the specified window.

**Effects:**
- The specified `window` is removed from the system.

**Request Body:**
```json
{
  "owner": "ID",
  "window": "ID"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/CallWindow/_getWindowsForUser

**Description:** Retrieves all availability windows for a specific user.

**Requirements:**
- `user` must be a valid User ID.

**Effects:**
- Returns a list of all availability windows associated with the given `user`.

**Request Body:**
```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "window": "ID",
    "startTime": "number",
    "endTime": "number"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---