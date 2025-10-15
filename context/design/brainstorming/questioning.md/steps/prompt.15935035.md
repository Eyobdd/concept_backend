---
timestamp: 'Tue Oct 14 2025 22:55:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_225514.7e72d6ff.md]]'
content_id: 15935035762b8f405d571807758ce18bec1ebf4f8cf49bf9a839994cb8f83104
---

# prompt: Can you implement the changes suggested [@20251014\_223905.0eb97c6a](../../context/design/brainstorming/questioning.md/20251014_223905.0eb97c6a.md) and give me the two concepts CallSessionConcept and CallWindowConcept in the same spec format that I gave to you here.

Reminder on formatting and expectations of Concepts according to the 6.1040 rubric
[@concept-state](../background/detailed/concept-state.md)
[@concept-rubric](../background/detailed/concept-rubric.md)
[@concept-specifications](../background/concept-specifications.md)

it should be in the EXACT same format as the spec below. The only difference is that instead of one large on it should be two smaller ones. They both be placed within code blocks that like the one below. None of the actions should take a composite object(i.e. user:User, date:Date instead of session: CallSession)

```
<concept_spec>
	concept CallConcept[User]

	purpose
    Schedule and initiate calls for a user

  principle
    This concept supports the scheduling and initiation of calls

  state
    # A User has a set of windows defining their general availability
    a set of Users with
      a set of CallWindows

    # A CallWindow is a generic concept
    a set of CallWindows
      a user User

    # A Recurring window applies every week on a given day
    a RecurringWindows set of CallWindows with
      a dayOfWeek of MONDAY or TUESDAY or WEDNESDAY or THURSDAY or FRIDAY or SATURDAY or SUNDAY
      a startTime DateTime
      a endTime DateTime

    # A specific override or one-off window for a particular date
    a OneOffWindows set of CallWindows with
      a specificDate Date
      a startTime DateTime
      a endTime DateTime

    # The daily CallSession entity, decoupled from the window definitions
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

  createCallSession(user:User, date:Date, source: MANUAL or SCHEDULED): CallSession
    requires:  There is no existing CallSession cs such that cs.user = user and cs.onDate = onDate
    effect: 
      - A new CallSession, cs_new, is added to the CallSessions set.
      - cs_new.user is set to the input user.
      - cs_new.onDate is set to the input onDate.
      - cs_new.status is set to PENDING.
      - cs_new.numRetries is set to 0.
      - cs_new.source is set to the input source.
      - cs_new.lastAttempt and cs_new.journalEntry are unset.
      - The action returns cs_new.

  deleteCallSession(user:User, date: Date)
    requires: There exists a CallSession cs such that cs.user = user and cs.onDate = date.
    effect:
      - The CallSession cs is removed from the CallSessions set.
      - If cs is present in CallQueue.pendingCalls, it is removed from that sequence.

  enqueueCall(user:User, date: Date)
    requires:
      - There exists a CallSession cs such that cs.user = user and cs.onDate = date.
      - cs.status must be PENDING.
      - cs must not already be in the CallQueue.pendingCalls sequence.
    effect:
      - cs.numRetries is incremented by 1.
      - cs.lastAttempt is updated to the current system DateTime.
      - cs is appended to the end of the CallQueue.pendingCalls sequence.


  createRecurringCallWindow(user:User, dayOfWeek: DayOfWeek, startTime: DateTime, endTime:DateTime): CallWindow
    requires: The endTime must be later than the startTime.
    effect:
      - A new CallWindow, cw_new, is added to the CallWindows set and the RecurringWindow subset.
      - cw_new is added to the user.callWindows relation.
      - cw_new.dayOfWeek is set to the input dayOfWeek.
      - cw_new.startTime is set to the input startTime.
      - cw_new.endTime is set to the input endTime.
      - The action returns cw_new.
  
  createOneOffCallWindow(user:User, specificDate :Date, startTime:DateTime, endTime: DateTime): CallWindow
    requires: The endTime must be later than the startTime.
    effect:
      - A new CallWindow, cw_new, is added to the CallWindows set and the OneOffWindow subset.
      - cw_new is added to the user.callWindows relation.
      - cw_new.specificDate is set to the input specificDate.
      - cw_new.startTime is set to the input startTime.
      - cw_new.endTime is set to the input endTime.
      - The action returns cw_new.

  deleteCallWindow(window: CallWindow)
    requires: The CallWindow window exists in the CallWindows set.
    effect:
      - The window is removed from the CallWindows set (and by extension, from whichever subset it belonged to).
      - The window is removed from the user.callWindows relation for the user that owned the window.

<concept_spec/>
```
