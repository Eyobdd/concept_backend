# JournalEntry Spec

Use the following context to understand how to write a concept document:
[@concept-design-brief](../../background/concept-design-brief.md)
[@concept-design-overview](../../background/concept-design-overview.md)

Here is the current spec that I have written: [@spec](spec.md)

Please respond with a commented spec file, addressing and raising any concerns you might have. Additionally, I would love to modify this concept to support a dynamic list of questions that a user provides, rather than a set list of  gratitude, didToday, proudOf, tomorrowPlan, that correspond to the questions, "What are you grateful for Today", "What are you proud of today?", "What are do you want to do tomorrow?". That said it might be best to create a new concept that exclusively responsible for managing the questions that a user wants to ask in their call. If this is the case, indicate that, and produce an updated JournalEntry spec that facilitates this, and a JournalPrompts concept spec that could be synced with this to facilitate this new feature.

Note: The proposed concepts should be minimal and closely follow the format describe here: [@concept-specifications](../../background/concept-specifications.md)

This means that it should resemble the format written in the [@spec](spec.md) without adding a bunch of extra comments. Each of the proposed concepts should include the purpose, principle, state, and actions exactly as formatted currently.


# response:

Of course. I agree with your intuition that splitting the concept into two is the best path forward. Managing the "template" of a journal (the questions) is a separate concern from managing the actual entry data. This separation makes the system more flexible and easier to maintain.

Here is the commented version of your original spec, followed by the proposed updated `JournalEntry` spec and the new `JournalPrompts` spec.

***

### Commented Original `JournalEntry` Spec

```md
<!--
- @specId: 98a5e1b2-1b1e-4c7c-8e8e-8a2d3b4c5d6e
- @name: JournalEntry
- @description: A concept for a single day journal entry.
-->

# JournalEntry

### purpose

To capture a user's daily reflections in a structured format.

### principle

An entry represents a single day's thoughts. There should only be one entry per user per day.

<!-- CONCERN: The principle states "one entry per user per day", but the actions primarily use `id` for retrieval and modification. This means there's no built-in way to query for a specific day's entry, which is the primary use case. An action like `findByDate` would better enforce this principle. -->

### state

- `id: string` (uuid)
- `date: string` (ISO 8601 Date: `YYYY-MM-DD`)
- `gratitude: string[]`
- `didToday: string[]`
- `proudOf: string[]`
- `tomorrowPlan: string[]`
- `createdAt: string` (ISO 8601 DateTime)
- `updatedAt: string` (ISO 8601 DateTime)

<!-- CONCERN: The state fields (`gratitude`, `didToday`, etc.) are hardcoded. This is the main issue you've identified. It's inflexible and prevents users from customizing their journaling experience. If a user wants to add a new prompt like "What did I learn today?", a state migration would be required. This structure is not scalable. -->

### actions

- `create(date, gratitude, didToday, proudOf, tomorrowPlan)`: Creates a new journal entry for a given date.
- `update(id, { gratitude, didToday, proudOf, tomorrowPlan })`: Updates an existing journal entry.
- `delete(id)`: Deletes a journal entry.

<!-- CONCERN: The `create` and `update` actions are tightly coupled to the hardcoded state fields. Any change to the journaling prompts requires changing these action signatures, which is brittle. -->

<!-- SUMMARY: The core design is sound for a fixed-prompt journal, but its lack of flexibility is a major limitation. The following proposed specs address these concerns by separating the prompt management from the entry data. -->
```

***

### The Proposed Solution

I agree that creating a new concept is the best approach. Below are two specs:

1.  **`JournalPrompts`**: A new concept responsible for managing the user-defined list of questions.
2.  **`JournalEntry` (Updated)**: An updated version of your spec that is no longer responsible for the questions themselves, but instead stores responses that link back to the prompts.

This approach creates a clear separation of concerns and provides the dynamic functionality you're looking for.

***

### Proposed `JournalPrompts` Spec

```md
<!--
- @specId: c5d8f0a3-3e1b-4f9a-9e2c-1a2b3c4d5e6f
- @name: JournalPrompts
- @description: Defines the set of prompts a user wants to answer for their journal entries.
-->

# JournalPrompts

### purpose

To manage a user-defined, ordered list of questions (prompts) for their journal.

### principle

This concept acts as a template for creating new journal entries. There is typically one set of prompts per user. The order of the prompts is significant and should be preserved.

### state

- `id: string` (uuid)
- `prompts: Prompt[]`
  - where `Prompt` is an object: `{ id: string (uuid), text: string }`
- `createdAt: string` (ISO 8601 DateTime)
- `updatedAt: string` (ISO 8601 DateTime)

### actions

- `get()`: Retrieves the user's current list of journal prompts.
- `update(prompts)`: Replaces the entire list of prompts with a new one. This action can be used to add, remove, and reorder prompts.
```

***

### Proposed Updated `JournalEntry` Spec

```md
<!--
- @specId: 98a5e1b2-1b1e-4c7c-8e8e-8a2d3b4c5d6e (re-using for versioning)
- @name: JournalEntry
- @description: A concept for a single day journal entry based on dynamic prompts.
-->

# JournalEntry

### purpose

To capture a user's daily reflections in a structured format corresponding to their defined prompts.

### principle

An entry represents a single day's thoughts. There should only be one entry per user per day. Each response within an entry is linked to a specific prompt.

### state

- `id: string` (uuid)
- `date: string` (ISO 8601 Date: `YYYY-MM-DD`)
- `responses: Response[]`
  - where `Response` is an object: `{ promptId: string, value: string[] }`
- `createdAt: string` (ISO 8601 DateTime)
- `updatedAt: string` (ISO 8601 DateTime)

### actions

- `create(date, responses)`: Creates a new journal entry for a given date with a list of responses.
- `update(id, { responses })`: Updates the responses for an existing journal entry.
- `delete(id)`: Deletes a journal entry.
- `findByDate(date)`: Retrieves the journal entry for a specific date.
```