---
timestamp: 'Tue Oct 14 2025 22:39:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_223905.0eb97c6a.md]]'
content_id: 82208f80e67e1c8c151a1be9c887c39c46309d1edc5849e651a2e05d401822a5
---

# response:

Excellent question. Based on the principles outlined in the provided concept design guide, the answer is a definitive **yes**. Breaking the `CallConcept` into two distinct concepts is highly recommended.

Here is an analysis based on the guide's principles, followed by concise notes for refining your state model and actions.

### Breaking Down `CallConcept`

You should split `CallConcept` into `CallWindowConcept` and `CallSessionConcept`.

**Reasoning based on the 61040 Guide:**

1. **Separation of Concerns (Multiple Structures):** This is the strongest argument. The guide explicitly gives an example of splitting `User` into two declarations: one for authentication (`username`, `password`) and one for profile (`Avatar`, `displayName`). Your situation is a perfect parallel:
   * **`CallWindowConcept`** is about **Configuration**. It defines a user's general availability and preferences. This is relatively static data that a user sets up once and modifies occasionally.
   * **`CallSessionConcept`** is about **Execution & State**. It represents the daily, operational instances derived from that configuration. It's dynamic, with statuses changing throughout the day (`PENDING`, `MISSED`, `COMPLETED`), and it manages the active process via the `CallQueue`.

2. **Modularity and Reusability:** The `CallWindowConcept` is a generic scheduling pattern. By isolating it, you could reuse it for other purposes in your system (e.g., scheduling meetings, defining support hours) without carrying the baggage of call sessions and journaling. The guide alludes to this with its example of a generic `Commenting` concept that can be applied to different `Items` (`Posts`, `Articles`, etc.).

3. **Clarity:** Separating the concepts makes the purpose of each one clearer. `CallWindowConcept` answers "When is the user generally available?". `CallSessionConcept` answers "What is the status of today's call attempt for this user?". This division is intuitive for both technical and non-technical stakeholders.

***

### Notes on Refining the State Model

Here are concise notes to improve the SSF state declarations.

* **Remove Redundant Relation:** You have `a set of Users with a set of CallWindows` and `a set of CallWindows with a user User`. The guide suggests choosing one form based on naturalness or multiplicity. However, to implement `deleteCallWindow(window)`, you need the back-pointer from `CallWindow` to `User`. The current model is therefore correct, but it's worth noting this explicit choice. The primary relation is ownership (`User` has `CallWindows`), and the back-pointer (`CallWindow` has a `User`) is for operational convenience.

* **Refine Time Primitives:** In `RecurringWindows`, `startTime` and `endTime` are `DateTime`. A `DateTime` includes a specific date, which is incorrect for a weekly recurring event. The model would be more accurate with a `TimeOfDay` primitive (e.g., "14:30:00"). If SSF doesn't support this, you could use a `String` with a clear format constraint (e.g., "HH:MM") or a `Number` representing minutes from midnight.

* **Improve Clarity of Subsets:** The current subset declarations are good. To make them even clearer, you could rename them slightly to emphasize their nature:
  ```
  a RecurringCallWindows set of CallWindows with ...
  a OneOffCallWindows set of CallWindows with ...
  ```
  (Your current naming is also fine, but this can add a little clarity).

* **Establish Link Between Session and Window:** A `CallSession` is generated because a user is available according to their `CallWindows`. The model doesn't capture this causal link. Consider adding a field to `CallSession` to track which window(s) triggered its creation. This improves auditability.
  ```
  a set of CallSessions with
    ...
    a triggeringWindow CallWindow
  ```

***

### Notes on Refining the Actions

Here are concise notes on the actions, assuming they will be split between the two new concepts.

#### Actions for `CallWindowConcept[User]`

* **`createRecurringCallWindow` & `createOneOffCallWindow`:** These are well-defined. Their `requires` clause (`endTime > startTime`) is essential. They correctly establish the bidirectional relationship between `User` and the new `CallWindow`.
* **`deleteCallWindow`:** The logic is sound. It correctly removes the window from the main set and the user's relational set. As noted above, this action justifies the `user` field on `CallWindow`.

#### Actions for `CallSessionConcept[User, JournalEntry]`

* **`createCallSession`:** The `requires` clause preventing duplicates for a `(user, date)` pair is critical and well-implemented. This is the "factory" action for this concept.
* **`deleteCallSession`:** Good. The effect correctly includes cleaning up the `CallQueue`, preventing orphaned references.
* **`enqueueCall`:**
  * This is the core operational action. The logic of incrementing retries and setting `lastAttempt` here is perfect.
  * The `requires` clause `cs must not already be in the CallQueue.pendingCalls` is crucial for preventing a session from being queued multiple times simultaneously.
* **Missing Action: `dequeueCall` or `completeCall`:** There's an action to put a session *in* the queue, but no action to process it and take it *out*. You will need one or more actions to handle the lifecycle after a call is queued:
  * **`processNextCall()`:** Takes the head of `CallQueue.pendingCalls`, performs the call logic, and then either updates its status (`MISSED`, `COMPLETED`) or removes it from the queue.
  * **`updateCallSessionStatus(session: CallSession, status: ...)`:** A dedicated action to update a session's status, perhaps linking a `JournalEntry` if the status is `COMPLETED`.
