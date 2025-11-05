<concept_spec>
	concept ReflectionSessionConcept[User, CallSession]

	purpose
    Track the real-time progress of a user's reflection session as they answer prompts

  principle
    When a reflection begins, a session captures the current prompt order and text. 
    As the user answers each prompt, responses are recorded with timestamps. 
    The user may optionally provide a rating from -2 to 2. The session completes when 
    all prompts are answered, or is abandoned if interrupted.

  state
    a set of ReflectionSessions with
      a user User
      a callSession CallSession
      a startedAt DateTime
      an optional endedAt DateTime
      a status of IN_PROGRESS or COMPLETED or ABANDONED
      an optional rating Number  # Integer -2 to 2, set when session completes
      a method of PHONE or TEXT  # How the reflection was conducted
      an optional transcript String  # Full transcript for phone reflections
      an optional recordingUrl String  # Encrypted recording URL for phone reflections

    a set of PromptResponses with
      a reflectionSession ReflectionSession
      a promptId ID              # ID of the PromptTemplate used
      a promptText String        # Snapshot of prompt text at time asked
      a position Number          # Order in which prompt was asked (1, 2, 3...)
      a responseText String
      a responseStarted DateTime
      a responseFinished DateTime

  invariants
    At most one IN_PROGRESS ReflectionSession per user at any time.
    If rating is set, it must be an integer in {-2, -1, 0, 1, 2}.
    PromptResponses for a session have unique position values forming sequence 1, 2, 3...

  actions
    startSession(user: User, callSession: CallSession, method: String, prompts: seq of {promptId: ID, promptText: String}): ReflectionSession
      requires: 
        - No IN_PROGRESS session exists for user.
        - prompts sequence has 1-5 elements.
        - method is either "PHONE" or "TEXT".
      effect: 
        - Creates new ReflectionSession with IN_PROGRESS status and specified method.
        - Sets startedAt to current time.
        - Returns the session.

    recordResponse(session: ReflectionSession, promptId: ID, promptText: String, position: Number, responseText: String)
      requires: 
        - session.status is IN_PROGRESS.
        - No existing PromptResponse for (session, position).
        - position is between 1 and the number of prompts in session.
      effect: 
        - Creates PromptResponse.
        - Sets responseStarted and responseFinished to current time.

    setRating(session: ReflectionSession, rating: Number)
      requires: 
        - session.status is IN_PROGRESS.
        - rating is integer in [-2, 2].
      effect: Sets session.rating to rating.

    completeSession(session: ReflectionSession, expectedPromptCount: Number)
      requires: 
        - session.status is IN_PROGRESS.
        - All expected prompts have responses (based on expectedPromptCount).
      effect: 
        - Sets status to COMPLETED.
        - Sets endedAt to current time.

    abandonSession(session: ReflectionSession)
      requires: session.status is IN_PROGRESS.
      effect: 
        - Sets status to ABANDONED.
        - Sets endedAt to current time.

    _getSessionResponses(session: ReflectionSession): seq of PromptResponse
      effect: Returns responses ordered by position.

    _getUserSessions(user: User): seq of ReflectionSession
      effect: Returns all sessions for user ordered by startedAt descending.

    _getActiveSession(user: User): ReflectionSession
      effect: Returns IN_PROGRESS session for user, or null if none exists.

    _getSession(session: ReflectionSession): ReflectionSession
      effect: Returns session, or null if not found.

    setTranscript(session: ReflectionSession, transcript: String)
      requires: 
        - session.status is IN_PROGRESS.
        - session.method is PHONE.
      effect: Sets session.transcript to transcript.

    setRecordingUrl(session: ReflectionSession, recordingUrl: String)
      requires: 
        - session.status is COMPLETED.
        - session.method is PHONE.
      effect: Sets session.recordingUrl to recordingUrl (encrypted).

<concept_spec/>
