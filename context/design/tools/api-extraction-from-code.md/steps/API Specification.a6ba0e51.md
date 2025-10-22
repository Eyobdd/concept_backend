---
timestamp: 'Mon Oct 20 2025 06:57:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_065705.dea52600.md]]'
content_id: a6ba0e5159ad5dd17bde830a91c917f905ca5e11ae914c021320ecb1aa7e8b20
---

# API Specification: CallSession Concept

**Purpose:** Manage the lifecycle of a real-time call, including participants and their status.

***

## API Endpoints

### POST /api/CallSession/createSession

**Description:** Creates a new real-time call session and designates the creator as the host.

**Requirements:**

* `host` must be a valid User ID.

**Effects:**

* A new call session is created with a unique ID.
* The `host` is added as the first participant of the session.
* The new session's ID is returned.

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

***

### POST /api/CallSession/joinSession

**Description:** Adds a user to an existing call session.

**Requirements:**

* The session with the given `session` ID must exist.
* The `user` must not already be a participant in the session.

**Effects:**

* The `user` is added to the list of participants for the specified session.

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

***

### POST /api/CallSession/leaveSession

**Description:** Removes a user from a call session they are currently in.

**Requirements:**

* The `user` must be a current participant in the session identified by `session`.

**Effects:**

* The `user` is removed from the list of participants for the specified session.

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

***

### POST /api/CallSession/endSession

**Description:** Ends a call session, removing all participants. This can only be done by the session host.

**Requirements:**

* The session with the given `session` ID must exist.
* The `user` must be the host of the session.

**Effects:**

* The session is marked as inactive or deleted.
* All participants are removed from the session.

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

***

### POST /api/CallSession/\_getParticipants

**Description:** Retrieves a list of all participants currently in a specific call session.

**Requirements:**

* The session with the given `session` ID must exist.

**Effects:**

* Returns a list of all user IDs participating in the session.

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

***
