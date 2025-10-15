<concept_spec>
	concept JournalEntryConcept[User]

	purpose
    Preserve structured daily journal entries with prompts and responses to support reflection and emotional tracking

  principle
    After a call session, a user creates a journal entry by responding to prompts. The entry captures their reflections and an overall rating for the day.

  state
    # A JournalEntry represents a completed daily reflection
    a set of JournalEntries with
      a user User
      a date Date
      a set of prompts Prompt
      a rating Number # An integer between -2 and 2

    # A Prompt represents a question-response pair within an entry
    a set of Prompts with
      a journalEntry JournalEntry
      a prompt String
      a response String
      a responseStarted DateTime
      a responseFinished DateTime
      # Future TODO: audio recording support (would require GridFS)
      # an audio Audio

  invariants
    - At most one JournalEntry per (user, date).
    - Each Prompt belongs to exactly one JournalEntry.
    - rating must be in the range [-2, 2] (inclusive).

  actions
    createJournalEntry(user: User, date: Date, rating: Number): JournalEntry
      requires:
        - There is no existing JournalEntry je such that je.user = user and je.date = date.
        - rating is an integer in the range [-2, 2].
      effect:
        - A new JournalEntry, je_new, is added to the JournalEntries set.
        - je_new.user is set to the input user.
        - je_new.date is set to the input date.
        - je_new.rating is set to the input rating.
        - je_new.prompts is initialized as an empty set.
        - The action returns je_new.

    addPrompt(user: User, date: Date, prompt: String, response: String, responseStarted: DateTime, responseFinished: DateTime): Prompt
      requires:
        - There exists a JournalEntry je such that je.user = user and je.date = date.
        - responseFinished must be later than or equal to responseStarted.
      effect:
        - A new Prompt, p_new, is added to the Prompts set.
        - p_new.journalEntry is set to the JournalEntry je.
        - p_new.prompt is set to the input prompt.
        - p_new.response is set to the input response.
        - p_new.responseStarted is set to the input responseStarted.
        - p_new.responseFinished is set to the input responseFinished.
        - p_new is added to je.prompts.
        - The action returns p_new.

    updateRating(user: User, date: Date, rating: Number)
      requires:
        - There exists a JournalEntry je such that je.user = user and je.date = date.
        - rating is an integer in the range [-2, 2].
      effect:
        - je.rating is updated to the input rating.

    updatePromptResponse(user: User, date: Date, prompt: String, response: String)
      requires:
        - There exists a JournalEntry je such that je.user = user and je.date = date.
        - There exists a Prompt p in je.prompts such that p.prompt = prompt.
      effect:
        - p.response is updated to the input response.

    deleteJournalEntry(user: User, date: Date)
      requires:
        - There exists a JournalEntry je such that je.user = user and je.date = date.
      effect:
        - All Prompts p where p.journalEntry = je are removed from the Prompts set.
        - The JournalEntry je is removed from the JournalEntries set.

<concept_spec/>