---
timestamp: 'Tue Oct 14 2025 08:42:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_084232.713c906c.md]]'
content_id: b66a7f26729f151a6de7d2777d1991a1f2690fa76dcdaf11d5fc3521971c4ef7
---

# response:

Of course. Here is a summary of the project's objective and core concepts based on the document provided.

### Project Objective

The objective is to build Zien, a personal assistant application designed to enhance user focus and intentionality. It addresses the shortcomings of overly broad AI assistants and high-friction journaling methods by using a short, daily, automated phone call to guide users through a structured reflection. This process captures their thoughts and translates them directly into a clear, actionable to-do list for the following day, closing the gap between intention and execution.

### Core Concepts & Their Purpose

1. **CallWindows:** To allow users to define specific, recurring time slots when they are available to receive a reflection call, creating a low-effort, predictable routine without needing a maintained calendar.
2. **ReflectionSessions:** To manage the automated, scripted phone call itself, capturing the user's spoken answers to the five reflection prompts as both raw audio and transcribed text.
3. **JournalEntries:** To transform a completed ReflectionSession into a structured, permanent, and searchable daily journal record, organizing the user's reflections by prompt.
4. **ActionableTasks:** To automatically parse the user's "tomorrow" plan from a JournalEntry and convert it into a concrete, manageable checklist of tasks for the next day.

### How The Concepts Are Synced Together

1. A user's local time entering an active **CallWindow** triggers the creation of a **ReflectionSession**, initiating the automated call.
2. The successful completion of a **ReflectionSession** automatically triggers the creation of a structured **JournalEntry** for that day.
3. The creation or editing of a **JournalEntry** (specifically its "tomorrow" plan) triggers the generation or update of the user's **ActionableTasks** list.
4. At midnight, any incomplete **ActionableTasks** are automatically carried forward, ensuring intentions are not lost from one day to the next.
