<concept_spec>
	concept CallSchedulerConcept[User, CallSession]

	purpose
    Manage the queue and retry logic for outbound reflection calls

  principle
    When a call window becomes active, calls are queued for users in first-come-first-served order.
    If a call fails or is missed, it is retried up to the user's configured maxRetries.
    The scheduler tracks retry attempts and delays between retries.

  state
    a set of ScheduledCalls with
      a user User
      a callSession CallSession
      a phoneNumber String
      a scheduledFor DateTime        # When the call should be made
      a status of PENDING or IN_PROGRESS or COMPLETED or FAILED or CANCELLED
      a attemptCount Number          # How many attempts have been made (0-indexed)
      a maxRetries Number            # Maximum retry attempts allowed
      a lastAttemptAt DateTime       # When the last attempt was made
      an optional nextRetryAt DateTime  # When the next retry should occur
      a createdAt DateTime
      an optional completedAt DateTime
      an optional errorMessage String

  invariants
    attemptCount must be between 0 and maxRetries.
    If status is COMPLETED, FAILED, or CANCELLED, completedAt must be set.
    If attemptCount < maxRetries and status is PENDING, nextRetryAt should be set.

  actions
    scheduleCall(user: User, callSession: CallSession, phoneNumber: String, scheduledFor: DateTime, maxRetries: Number): ScheduledCall
      requires: 
        - maxRetries is at least 1.
        - No PENDING or IN_PROGRESS ScheduledCall exists for this callSession.
      effect: 
        - Creates new ScheduledCall with PENDING status.
        - Sets attemptCount to 0.
        - Sets createdAt to current time.
        - Returns the scheduled call.

    markInProgress(callSession: CallSession)
      requires: ScheduledCall exists with PENDING status.
      effect: 
        - Sets status to IN_PROGRESS.
        - Increments attemptCount.
        - Sets lastAttemptAt to current time.

    markCompleted(callSession: CallSession)
      requires: ScheduledCall exists with IN_PROGRESS status.
      effect: 
        - Sets status to COMPLETED.
        - Sets completedAt to current time.

    markFailedAndRetry(callSession: CallSession, retryDelayMinutes: Number)
      requires: 
        - ScheduledCall exists with IN_PROGRESS status.
        - attemptCount < maxRetries.
      effect: 
        - Sets status back to PENDING.
        - Sets nextRetryAt to current time + retryDelayMinutes.

    markFailed(callSession: CallSession, error: String)
      requires: 
        - ScheduledCall exists with IN_PROGRESS status.
        - attemptCount >= maxRetries.
      effect: 
        - Sets status to FAILED.
        - Sets errorMessage to error.
        - Sets completedAt to current time.

    cancelCall(callSession: CallSession)
      requires: ScheduledCall exists with PENDING or IN_PROGRESS status.
      effect: 
        - Sets status to CANCELLED.
        - Sets completedAt to current time.

    _getPendingCalls(beforeTime: DateTime): seq of ScheduledCall
      effect: Returns all PENDING calls where scheduledFor or nextRetryAt <= beforeTime, ordered by scheduledFor ascending.

    _getScheduledCall(callSession: CallSession): ScheduledCall
      effect: Returns scheduled call for session, or null if not found.

    _getActiveCallsForUser(user: User): seq of ScheduledCall
      effect: Returns all PENDING or IN_PROGRESS calls for user.

<concept_spec/>
