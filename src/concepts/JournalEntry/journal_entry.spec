<concept_spec>
	concept JournalEntryConcept[User, ReflectionSession]

	purpose
    Preserve completed reflection sessions as immutable daily records for review and trend analysis

  principle
    When a reflection session completes, it becomes a permanent journal entry. 
    The responses and rating are immutable snapshots of that moment in time.

  state
    a set of JournalEntries with
      a user User
      a creationDate Date
      a reflectionSession ReflectionSession
      a rating Number  # Integer -2 to 2, immutable snapshot from session

    a set of PromptResponses with
      a journalEntry JournalEntry
      a promptId ID            # ID of the PromptTemplate used
      a promptText String      # Snapshot of prompt text at time of response
      a position Number        # Order in which prompt was asked (1, 2, 3...)
      a responseText String    # Immutable user response
      a responseStarted DateTime
      a responseFinished DateTime

  invariants
    At most one JournalEntry per (user, creationDate).
    rating must be an integer in {-2, -1, 0, 1, 2}.
    PromptResponses for an entry have unique position values.

  actions
    createFromSession(session: ReflectionSession): JournalEntry
      requires: 
        - session.status is COMPLETED.
        - session.rating is set.
        - No existing JournalEntry for (session.user, localDate(session.endedAt)).
      effect: 
        - Creates JournalEntry with creationDate = localDate(session.endedAt).
        - Copies rating from session (immutable).
        - Copies all PromptResponses from session (including prompt text snapshots).
        - Links to reflectionSession.
        - Returns the entry.

    deleteEntry(entry: JournalEntry)
      requires: entry exists.
      effect: 
        - Removes JournalEntry and its PromptResponses.
        - Does not delete the linked ReflectionSession.

    _getEntriesByUser(user: User): seq of JournalEntry
      effect: Returns entries ordered by creationDate descending.

    _getEntriesWithResponsesByUser(user: User): seq of {JournalEntry, responses: seq of PromptResponse}
      effect: Returns entries with their responses ordered by creationDate descending.

    _getEntriesByDateRange(user: User, startDate: Date, endDate: Date): seq of JournalEntry
      effect: Returns entries within date range ordered by creationDate.

    _getEntryByDate(user: User, date: Date): JournalEntry
      effect: Returns entry for specific date, or null if none exists.

    _getEntryResponses(entry: JournalEntry): seq of PromptResponse
      effect: Returns responses ordered by position.

<concept_spec/>