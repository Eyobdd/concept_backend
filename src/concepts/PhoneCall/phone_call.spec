<concept_spec>
	concept PhoneCallConcept[User, ReflectionSession]

	purpose
    Manage the lifecycle and state of phone calls for reflection sessions

  principle
    When a phone call is initiated, it tracks the call state through various stages:
    initiated → connected → in_progress → completed/abandoned/failed.
    The call manages the conversation flow, tracking which prompt is currently active,
    accumulated transcript, and handles pauses for semantic completion checking.

  state
    a set of PhoneCalls with
      a user User
      a reflectionSession ReflectionSession
      a twilioCallSid String          # Twilio's unique call identifier
      a status of INITIATED or CONNECTED or IN_PROGRESS or COMPLETED or ABANDONED or FAILED
      a currentPromptIndex Number     # Which prompt (0-indexed) is currently being asked
      an accumulatedTranscript String # Full transcript of the call so far
      a currentResponseBuffer String  # Current user response being accumulated
      a lastSpeechTime DateTime       # Last time user speech was detected
      a createdAt DateTime
      an optional completedAt DateTime
      an optional errorMessage String # Error details if status is FAILED

  invariants
    At most one IN_PROGRESS PhoneCall per user at any time.
    currentPromptIndex must be between 0 and number of prompts - 1.
    If status is COMPLETED or ABANDONED or FAILED, completedAt must be set.

  actions
    initiateCall(user: User, reflectionSession: ReflectionSession, twilioCallSid: String): PhoneCall
      requires: 
        - No IN_PROGRESS PhoneCall exists for user.
        - ReflectionSession exists and is IN_PROGRESS.
      effect: 
        - Creates new PhoneCall with INITIATED status.
        - Sets currentPromptIndex to 0.
        - Sets createdAt to current time.
        - Returns the phone call.

    markConnected(twilioCallSid: String)
      requires: PhoneCall exists with INITIATED status.
      effect: Sets status to CONNECTED.

    startPrompting(twilioCallSid: String)
      requires: PhoneCall exists with CONNECTED status.
      effect: Sets status to IN_PROGRESS.

    appendToTranscript(twilioCallSid: String, text: String)
      requires: PhoneCall exists with IN_PROGRESS status.
      effect: 
        - Appends text to accumulatedTranscript.
        - Appends text to currentResponseBuffer.
        - Updates lastSpeechTime to current time.

    advanceToNextPrompt(twilioCallSid: String)
      requires: 
        - PhoneCall exists with IN_PROGRESS status.
        - currentPromptIndex < total number of prompts - 1.
      effect: 
        - Increments currentPromptIndex.
        - Clears currentResponseBuffer.

    markCompleted(twilioCallSid: String)
      requires: PhoneCall exists with IN_PROGRESS status.
      effect: 
        - Sets status to COMPLETED.
        - Sets completedAt to current time.

    markAbandoned(twilioCallSid: String, reason: String)
      requires: PhoneCall exists (any status except COMPLETED, ABANDONED, FAILED).
      effect: 
        - Sets status to ABANDONED.
        - Sets errorMessage to reason.
        - Sets completedAt to current time.

    markFailed(twilioCallSid: String, error: String)
      requires: PhoneCall exists (any status except COMPLETED, ABANDONED, FAILED).
      effect: 
        - Sets status to FAILED.
        - Sets errorMessage to error.
        - Sets completedAt to current time.

    _getPhoneCall(twilioCallSid: String): PhoneCall
      effect: Returns phone call, or null if not found.

    _getActivePhoneCall(user: User): PhoneCall
      effect: Returns IN_PROGRESS phone call for user, or null if none exists.

    _getPhoneCallBySession(reflectionSession: ReflectionSession): PhoneCall
      effect: Returns phone call for session, or null if not found.

<concept_spec/>
