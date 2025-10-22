---
timestamp: 'Mon Oct 20 2025 06:57:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_065705.dea52600.md]]'
content_id: eb8cf4c12535e9af4bb1c893db037782785ec32d8b6675089a26249e533bdf8d
---

# API Specification: CallWindow Concept

**Purpose:** Allow users to define and manage time windows during which they are available for calls.

***

## API Endpoints

### POST /api/CallWindow/createWindow

**Description:** Creates a new time window to indicate a user's availability for calls.

**Requirements:**

* `owner` must be a valid User ID.
* `endTime` must be a timestamp that occurs after `startTime`.

**Effects:**

* A new availability window is created with a unique ID.
* The window is associated with the `owner` and stores the `startTime` and `endTime`.
* The new window's ID is returned.

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

***

### POST /api/CallWindow/updateWindow

**Description:** Updates the start and end times for an existing availability window.

**Requirements:**

* The window with the given `window` ID must exist.
* The `owner` must be the owner of the specified window.
* `endTime` must be a timestamp that occurs after `startTime`.

**Effects:**

* The `startTime` and `endTime` for the specified `window` are updated.

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

***

### POST /api/CallWindow/deleteWindow

**Description:** Deletes a user's availability window.

**Requirements:**

* The window with the given `window` ID must exist.
* The `owner` must be the owner of the specified window.

**Effects:**

* The specified `window` is removed from the system.

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

***

### POST /api/CallWindow/\_getWindowsForUser

**Description:** Retrieves all availability windows for a specific user.

**Requirements:**

* `user` must be a valid User ID.

**Effects:**

* Returns a list of all availability windows associated with the given `user`.

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

***
