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