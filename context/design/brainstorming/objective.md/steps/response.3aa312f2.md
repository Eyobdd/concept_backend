---
timestamp: 'Tue Oct 14 2025 08:38:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_083829.e8968ca2.md]]'
content_id: 3aa312f2b62833e86803aa2d06430a1c9f5f1bb45c5b1c3575b3378a8b3badfe
---

# response:

Here's a concise summary of your application's objective and core concepts:

## Zien - "Focus, so you can see what matters."

**Purpose:** Zien is designed to enhance personal focus and intentionality by transforming daily reflection into actionable next-day priorities through a frictionless, guided audio experience. It aims to bridge the intention-action gap, empowering users to be more productive and gain deeper insights into their lives, ultimately benefiting both themselves and those around them.

***

### Core Concepts & Their Purposes:

* **CallWindows:**
  * **Purpose:** To define user-specified, low-friction windows of availability for Zien to initiate reflection calls, without requiring users to manage their calendars or remember to initiate reflection themselves.

* **ReflectionSessions:**
  * **Purpose:** To conduct a structured, time-boxed audio call that guides the user through five key reflection prompts, capturing raw audio and transcriptions to form the basis of daily journaling.

* **JournalEntries:**
  * **Purpose:** To maintain a clean, structured, and searchable daily record of user reflections derived from completed sessions, enabling pattern recognition and qualitative data tracking over time.

* **ActionableTasks:**
  * **Purpose:** To transform the "what to do tomorrow" intentions from journal entries into a persistent, bite-sized, and carry-forward checklist, ensuring daily actionability and reducing planning overhead.

***

### Synchronization of Concepts:

* **Window/Session Sync (Initiate Calls):** Enabled `CallWindows` trigger the initiation of `ReflectionSessions` at scheduled times, ensuring regular reflection.
* **Session/Journal Sync (Derive Entry):** A completed `ReflectionSession` automatically generates a `JournalEntry`, ensuring that raw reflections are systematically interpreted and stored.
* **Journal/Tasks Sync (Materialize Tomorrow List):** Changes in the "tomorrowPlan" within `JournalEntries` (either upon creation or editing) trigger the generation or update of `ActionableTasks`, translating intentions into executable steps.
* **Daily Rollover Sync (Keep Intent Alive):** At midnight, unfinished `ActionableTasks` due yesterday are automatically carried forward to the current day, ensuring that intentions persist until completion.
