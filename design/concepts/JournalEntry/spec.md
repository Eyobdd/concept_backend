<concept_spec>
  concept JournalEntries

  purpose
    Preserve a conversation transcript as daily structured entries to aid reflection and next-week focus.

  principle
    The concept supports manual viewing/editing of per-day entries.

  state
    a set of JournalEntry with
      a user User
      a date Date
	  a set of JournalPrompts
      a rating Number # integer −2..2
      a session Session

  invariants
    At most one JournalEntry per (user, date).

  actions
    create_from_session(session: Session): JournalEntry
      requires: session.complete and no existing entry for (session.user, localDate(session))
      effect: parses session Segments into fields; links to session; returns the new entry

    edit_entry(entry: JournalEntry, gratitude?: String, didToday?: String, proudOf?: String, tomorrowPlan?: String, rating?: Number)
      requires: entry exists and if rating provided then rating ∈ {−2, −1, 0, 1, 2}
      effect: updates provided fields (audit trail outside this concept)

    delete_entry(entry: JournalEntry)
      requires: entry exists
      effect: removes entry (does not delete session)
</concept_spec>