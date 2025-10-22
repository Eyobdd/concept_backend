<concept_spec>
	concept JournalPromptConcept[User]

	purpose
    Allow users to customize the reflection questions asked during their journaling sessions

  principle
    A user maintains an ordered list of up to 5 prompts. When a reflection session starts, 
    it captures the current prompt order and text. Users can modify their prompt list over 
    time without affecting past journal entries.

  state
    a set of PromptTemplates with
      a user User
      a promptText String
      a position Number      # Display order (1-5)
      a isActive Flag        # Can be disabled without deletion

  invariants
    Each user can have at most 5 PromptTemplates.
    For each user, position values form a contiguous sequence starting at 1.
    Active prompts for a user have unique position values.

  actions
    createDefaultPrompts(user: User)
      requires: User has no existing PromptTemplates.
      effect: 
        - Creates 5 default PromptTemplates with standard questions:
          1. "What are you grateful for today?"
          2. "What did you do today?"
          3. "What are you proud of today?"
          4. "What do you want to do tomorrow?"
          5. "Any other thoughts or reflections?"
        - All prompts are set to isActive=true.
        - Positions are set to 1, 2, 3, 4, 5 respectively.

    updatePromptText(user: User, position: Number, newText: String)
      requires: 
        - User has a PromptTemplate at the given position.
        - newText is non-empty.
      effect: Updates the promptText for the PromptTemplate at position.

    reorderPrompts(user: User, newOrder: seq of PromptTemplate)
      requires: 
        - newOrder contains all of user's PromptTemplates exactly once.
        - newOrder has at most 5 elements.
      effect: Updates position values to match the sequence order (1, 2, 3...).

    togglePromptActive(user: User, position: Number)
      requires: User has a PromptTemplate at the given position.
      effect: Toggles the isActive flag of the PromptTemplate.

    deletePrompt(user: User, position: Number)
      requires: User has a PromptTemplate at the given position.
      effect: 
        - Removes the PromptTemplate.
        - Renumbers remaining prompts to maintain contiguous positions.

    addPrompt(user: User, promptText: String): PromptTemplate
      requires: 
        - User has fewer than 5 PromptTemplates.
        - promptText is non-empty.
      effect: 
        - Creates new PromptTemplate with isActive=true.
        - Sets position to max(existing positions) + 1.
        - Returns the new PromptTemplate.

    _getUserPrompts(user: User): seq of PromptTemplate
      effect: Returns user's PromptTemplates ordered by position.

    _getActivePrompts(user: User): seq of PromptTemplate
      effect: Returns user's active PromptTemplates ordered by position.

<concept_spec/>
