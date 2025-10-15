---
timestamp: 'Tue Oct 14 2025 22:55:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_225548.1bead12a.md]]'
content_id: 0c3237ff78a991ca5bf0f77dcb2d94af01d0a5d838917ab5a3806c0ad2bc70f9
---

# response:

```
<concept_spec>
	concept CallWindowConcept[User]

	purpose
    Define a user's availability for receiving calls

  principle
    This concept manages the windows of time when a user is available for calls, supporting both recurring weekly schedules and specific one-off date-based availabilities.

  state
    # A User has a set of windows defining their availability
    a set of Users with
      a set of CallWindows

    # A CallWindow is a generic concept for availability
    a set of CallWindows with
      a user User
      a startTime DateTime
      a endTime DateTime

    # A Recurring window applies every week on a given day
    a RecurringWindows set of CallWindows with
      a dayOfWeek of MONDAY or TUESDAY or WEDNESDAY or THURSDAY or FRIDAY or SATURDAY or SUNDAY

    # A specific override or one-off window for a particular date
    a OneOffWindows set of CallWindows with
      a specificDate Date

  actions
    createRecurringCallWindow(user:User, dayOfWeek: MONDAY or TUESDAY or WEDNESDAY or THURSDAY or FRIDAY or SATURDAY or SUNDAY, startTime: DateTime, endTime:DateTime): CallWindow
      requires: 
        - The endTime must be later than the startTime.
        - There is no existing RecurringWindow rw for the user such that rw.dayOfWeek = dayOfWeek and rw.startTime = startTime.
      effect:
        - A new CallWindow, cw_new, is added to the CallWindows set and the RecurringWindows subset.
        - cw_new is added to the user.callWindows relation.
        - cw_new.user is set to the input user.
        - cw_new.dayOfWeek is set to the input dayOfWeek.
        - cw_new.startTime is set to the input startTime.
        - cw_new.endTime is set to the input endTime.
        - The action returns cw_new.
  
    createOneOffCallWindow(user:User, specificDate :Date, startTime:DateTime, endTime: DateTime): CallWindow
      requires: 
        - The endTime must be later than the startTime.
        - There is no existing OneOffWindow ow for the user such that ow.specificDate = specificDate and ow.startTime = startTime.
      effect:
        - A new CallWindow, cw_new, is added to the CallWindows set and the OneOffWindows subset.
        - cw_new is added to the user.callWindows relation.
        - cw_new.user is set to the input user.
        - cw_new.specificDate is set to the input specificDate.
        - cw_new.startTime is set to the input startTime.
        - cw_new.endTime is set to the input endTime.
        - The action returns cw_new.

    deleteRecurringCallWindow(user:User, dayOfWeek: MONDAY or TUESDAY or WEDNESDAY or THURSDAY or FRIDAY or SATURDAY or SUNDAY, startTime: DateTime)
      requires: 
        - There exists a RecurringWindow rw such that rw.user = user, rw.dayOfWeek = dayOfWeek, and rw.startTime = startTime.
      effect:
        - The window rw is removed from the CallWindows set (and by extension, the RecurringWindows subset).
        - The window rw is removed from the user.callWindows relation.

    deleteOneOffCallWindow(user:User, specificDate: Date, startTime: DateTime)
      requires: 
        - There exists a OneOffWindow ow such that ow.user = user, ow.specificDate = specificDate, and ow.startTime = startTime.
      effect:
        - The window ow is removed from the CallWindows set (and by extension, the OneOffWindows subset).
        - The window ow is removed from the user.callWindows relation.

<concept_spec/>
```

```
<concept_spec>
	concept CallSessionConcept[User, JournalEntry]

	purpose
    Manage the lifecycle of a specific call attempt for a user on a given day

  principle
    This concept tracks individual call sessions from creation to completion, including retry attempts and queuing for execution. It is the operational counterpart to the strategic availability defined in CallWindowConcept.

  state
    # The daily CallSession entity, decoupled from window definitions
    a set of CallSessions with
      a user User
      a onDate Date
      a numRetries Number
      a lastAttempt DateTime
      a source of MANUAL or SCHEDULED
      a status of PENDING or MISSED or COMPLETED
      an optional journalEntry JournalEntry

    # The central queue for initiated calls
    an element CallQueue with
      a pendingCalls seq of CallSessions
    
  actions
    createCallSession(user:User, onDate:Date, source: MANUAL or SCHEDULED): CallSession
      requires:  There is no existing CallSession cs such that cs.user = user and cs.onDate = onDate.
      effect: 
        - A new CallSession, cs_new, is added to the CallSessions set.
        - cs_new.user is set to the input user.
        - cs_new.onDate is set to the input onDate.
        - cs_new.status is set to PENDING.
        - cs_new.numRetries is set to 0.
        - cs_new.source is set to the input source.
        - cs_new.lastAttempt and cs_new.journalEntry are unset.
        - The action returns cs_new.

    deleteCallSession(user:User, onDate: Date)
      requires: There exists a CallSession cs such that cs.user = user and cs.onDate = onDate.
      effect:
        - The CallSession cs is removed from the CallSessions set.
        - If cs is present in CallQueue.pendingCalls, it is removed from that sequence.

    enqueueCall(user:User, onDate: Date)
      requires:
        - There exists a CallSession cs such that cs.user = user and cs.onDate = onDate.
        - cs.status must be PENDING.
        - cs must not already be in the CallQueue.pendingCalls sequence.
      effect:
        - cs.numRetries is incremented by 1.
        - cs.lastAttempt is updated to the current system DateTime.
        - cs is appended to the end of the CallQueue.pendingCalls sequence.

    markCallCompleted(user:User, onDate: Date, entry: JournalEntry)
      requires:
        - There exists a CallSession cs such that cs.user = user and cs.onDate = onDate.
      effect:
        - cs.status is set to COMPLETED.
        - cs.journalEntry is set to the input entry.
        - If cs is present in CallQueue.pendingCalls, it is removed from that sequence.

    markCallMissed(user:User, onDate: Date)
      requires:
        - There exists a CallSession cs such that cs.user = user and cs.onDate = onDate.
      effect:
        - cs.status is set to MISSED.
        - If cs is present in CallQueue.pendingCalls, it is removed from that sequence.

<concept_spec/>
```
