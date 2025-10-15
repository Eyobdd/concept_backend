
# Concise Project Objective

# prompt:
Can you summarize this markdown document into the objective, and concepts that are core to the application I wish to build? Namely I want a short purpose paragraph. A list of the concepts that are required and their purposes, and then a list of how they are synced together.

# Assignment 2: Problem Framing

  

## Problem Statement

  

### Domain

  

Broadly, the domain I am focusing on is personal focus in daily life; particularly, personal assistants that enhance our ability to do more work rather than solely do work for us.

  

Today, for many AI personal assistant tools, productivity isn’t throttled by a lack of features; it’s throttled by a lack of focus and alignment on user intent. We keep trying to build assistants that “do everything,” but starting there dilutes value add to users in the short run, making it harder to reach true general assistance later. I think the better sequence is actually the opposite: begin by sharpening user intent, help people articulate tomorrow’s to-do list, and make time to reflect on today. Later, adding capabilities gradually, each tightly scoped and immediately useful, with a daily five-minute reflection as the primary source of truth and intent collection mechanism.

  

Traditional journaling(Paper & Pen) gets part of the way there; it’s meditative and conducive to reflection, but it requires a physical notebook, which is easy to skip when life gets busy, and is difficult to review and spot trends over many journal entries. Alternatively, digitizing helps with trend-finding, yet introduces its own frictions: typing can feel as effortful as handwriting(and often less satisfying), and phones and computers are distracting environments unless the reflection flow is designed to be distraction-proof.

  

### Problem

  

Today, general assistants products attempt to ingest data across email, calendars, chats, and apps, to understand user intent and goals. That breadth creates guesswork and edge cases, which push work back onto the user(Fixing the assistants's mistakes, or even just doing the task themselves if the assistant cannot). Hyper-narrow tools that fix one channel (i.e. optimizing your calendar), often assume you already maintain those channels resulting in a selection problem(The people who need help with their managing their calendars won't use it because you already need to use your calendar). Ultimately assistants should be able to "do everything", but to get there requires a low-friction mechanism to turn daily reflection into next-day intent, regardless of how tidy your digital life is.

  

### Stakeholders

  

The primary stakeholder is the user; someone who wants more intentionality and focus in their life, and the ability to track qualitative data, personal improvement, and life insights over time. Additionally, a secondary circle (family, classmates, teammates) experiences the downstream effects of that user’s improved reliability and clarity. Designing for the user’s focus pays compound interest to everyone around them.

  

### Evidence & Comparables

  

1. **Reflection improves performance.**

  

Across a program of experiments, researchers showed that deliberately reflecting on one’s experience (synthesizing what happened and why) measurably improved subsequent task performance—evidence that reflection is not a "luxury", but a productive act. ([Harvard Business School][1])

  

2. **Planning closes the intention–action gap.**

  

A meta-analysis of “implementation intentions” (if-then plans that specify when/where/how) found strong, reliable effects on goal attainment. ([ScienceDirect][2])

  

3. **Structured journaling benefits well-being.**

  

Randomized trials of gratitude journaling showed consistent gains in mood and life satisfaction, supporting short, guided prompts over open-ended writing when time is scarce. ([Greater Good][3])

  

4. **Interruptions tax attention.**

  

Empirical work on interruptions shows people compensate by working faster, but at the cost of higher stress and frustration—evidence that adding more digital surfaces can erode the very focus we’re trying to create. ([UCI Bren School of ICS][4])

  

5. **Comparable: Apple Journal (platform signal).**

  

Apple launched a built-in journaling app and is expanding it beyond iPhone to iPad and Mac—mainstream validation that low-friction reflection is a core use case worth integrating at the OS level. ([Apple][5])

  

6. **Comparable: Motion (calendar optimizer).**

  

Motion advertises AI scheduling that continuously reorganizes your day; independent reviews note its power but also the reliance on calendar hygiene, illustrating the selection effect that leaves many users behind. ([Motion][6])

  

[1]: https://www.hbs.edu/faculty/Pages/item.aspx?num=63487&utm_source=chatgpt.com "Learning by Thinking: The Role of Reflection in Individual Learning"

[2]: https://www.sciencedirect.com/science/article/pii/S0065260106380021?utm_source=chatgpt.com "Implementation Intentions and Goal Achievement: A Meta‐analysis of ..."

[3]: https://greatergood.berkeley.edu/pdfs/GratitudePDFs/6Emmons-BlessingsBurdens.pdf?utm_source=chatgpt.com "Counting Blessings Versus Burdens: An Experimental Investigation of ..."

[4]: https://ics.uci.edu/~gmark/chi08-mark.pdf?utm_source=chatgpt.com "The Cost of Interrupted Work: More Speed and Stress"

[5]: https://www.apple.com/newsroom/2023/12/apple-launches-journal-app-a-new-app-for-reflecting-on-everyday-moments/?utm_source=chatgpt.com "Apple launches Journal app, a new app for reflecting on everyday ..."

[6]: https://www.usemotion.com/features/ai-calendar.html?utm_source=chatgpt.com "AI Calendar That Works Like a $100K Personal Assistant | Motion"

  

## Application Pitch

  

### Name: Zien - "Focus, so you can see what matters."

  

### Motivation.

  

Most “assistants” fetch more inputs than they reduce valuably. Zien restores focus by turning a five-minute reflection over the phone into tomorrow’s short, intentional to-do list. Ultimately, Zien focuses on focus: schedule a short call, capture what matters, and wake up with your day's priorities defined.

  

### Features

  

####

  

<details>

<summary><b>Scheduled Calls</b></summary>

  

The user chooses a few windows during the week when they are free; in those windows Zien calls them and walks them through the same five prompts every time:

  

1. What are you grateful for today?

2. What did you do today?

3. What are you proud of today?

4. What do you want to do tomorrow?

5. What would you rate today rating from −2 to 2? (Using Integers Only)

  

Importantly, it’s not a chat; it’s a calm, paced script that keeps the user talking for only as long as they need to sufficiently answer the question before moving onto the next prompt or ending the call. This makes intent collection simple and frictionless: no typing, distractions, or complicated app UI to navigate. It’s long enough to think, short enough to do every day, and it initiates the call even if you forget.

  

The result is a repeatable ritual that lowers friction to reflection for the user, improving their ability to complete the tasks required of them to succeed in life.

  

#### </details>

  

<details>

<summary><b>Structured Journal</b></summary>

  

Each call becomes a clean entry automatically. Zien transcribes the audio, files answers under the five prompts(see the Scheduled Call feature for prompts), and produces a clear to-do list from the answer to "What do you want to do tomorrow?".

  

A structured journal keeps the reflection focused and simple in the moment. Additionally, when digitized,it also enables the ability to surface emerging patterns like streaks of wins, recurring blockers, and energy slumps quickly, without the user needing to reread pages.

  

#### </details>

  

<details>

<summary><b>Tomorrow's To-Do List</b></summary>

  

Whatever the user answers the “What will you do tomorrow?” question with becomes a small, tidy checklist the moment you hang up. Items carry forward if unfinished and stay intentionally bite-sized so tomorrow doesn’t start with project planning. This closes the gap between a good intention at night and the first action in the morning. The user wakes up with clear actionable next steps and the people around them experience fewer dropped balls and clearer commitments.

  

#### </details>

  

## Concept Design

  

### Concepts

  

<details>

<summary><b>Concept 1 — CallWindows</b></summary>

  

**concept:** CallWidows

  

**purpose:** Let a user declare short weekly windows during which Zien may place a reflection call—small, predictable commitments that lower effort without requiring calendar hygiene.

  

**principle:**

A user creates one or more weekly windows (e.g., Mon–Thu, 9:00–9:10 pm). Windows can be enabled/disabled or edited. A separate process (see synchronizations) observes these windows and initiates reflection sessions at the appropriate times.

  

**state**

  

```text

a set of CallWindows with

a user User

a dow of MON or TUE or WED or THU or FRI or SAT or SUN

a startMinute Number

an endMinute Number

a timezone String

an enabled Flag

```

  

_**Note:** `startMinute` and `endMinute` are the number minutes since midnight in user's timezone_

  

**actions:**

  

- `define_window(user, dow, startMinute, endMinute, timezone)`

Pre: `startMinute < endMinute`. Effects: create enabled window.

- `update_window(window, dow?, startMinute?, endMinute?, timezone?)`

Effects: mutate provided fields.

- `enable_window(window)` / `disable_window(window)`

Effects: set `enabled`.

  

</details>

  

---

  

<details>

<summary><b>Concept 2 — ReflectionSessions</b></summary>

  

**concept:** ReflectionSessions

  

**purpose:** Run a scripted, time-boxed call that captures the five prompts as raw audio and text.

  

**principle:**

At (or near) a window time, a session is started; the system prompts, the user answers, and the call ends. Audio is stored; a transcript and per-prompt segments are attached. A session is “complete” only if all five prompts were answered and the rating is an integer in [−2, 2].

  

**state:**

  

```text

a set of Sessions with

a user User

a startedAt DateTime

an optional endedAt DateTime

an audioUrl String

an optional transcript String

a complete Flag

  

a set of Segments with

a session Session

a prompt of GRATITUDE or DID_TODAY or PROUD_OF or TOMORROW or RATING

a content String

```

  

**actions:**

  

- `start_session(user, startedAt)`

Pre: no other active session for user. Effects: create `Session(startedAt)`.

- `record_segment(session, prompt, content)`

Pre: session exists and not complete; one segment per prompt. Effects: add `Segment`.

- `attach_transcript(session, transcript)`

Effects: set `transcript`.

- `end_session(session, endedAt)`

Effects: set `endedAt`.

- `mark_complete(session)`

Pre: all five prompts present; `RATING ∈ {−2, −1, 0, 1, 2}`; `endedAt` set. Effects: `complete = true`.

  

</details>

  

---

  

<details>

<summary><b>Concept 3 — JournalEntries</b></summary>

  

**concept:** JournalEntries

  

**purpose:** Maintain a structured, searchable daily record derived from a completed session—one entry per user per day.

  

**principle:**

When a session is complete, an entry is created for the user’s local date with fields split by prompt. Entries may be tagged for search. Editing is allowed but tracked.

  

**state:**

  

```text

a set of JournalEntries with

a user User

a date Date

a gratitude String

a didToday String

a proudOf String

a tomorrowPlan String

a rating Number # integer −2..2

a session Session

a tags set of String

```

  

**actions:**

  

- `create_from_session(session)`

Pre: `session.complete`; no existing entry for `(user, date)`.

Effects: parse `Segments` → populate fields; link to `session`.

- `edit_entry(entry, gratitude?, didToday?, proudOf?, tomorrowPlan?, rating?)`

Pre: rating (if provided) in [−2, 2]. Effects: update fields (audit trail outside this concept).

- `tag_entry(entry, tag)` / `untag_entry(entry, tag)`

Effects: mutate `tags`.

- `delete_entry(entry)`

Effects: remove entry (does not delete `session`).

  

**invariant:** At most one `JournalEntry` per `(user, date)`.

  

</details>

  

---

  

<details>

<summary><b>Concept 4 — ActionableTasks</b></summary>

  

**concept:** ActionableTasks

  

**purpose:** Turn “tomorrow” intentions into an executable, carry-forward checklist—small, ordered items that survive until done.

  

**principle:**

When an entry is created (or its “tomorrow” changes), tasks are (re)generated. Each morning, any unfinished tasks due yesterday are automatically carried forward, preserving history.

  

**state:**

  

```text

a set of Tasks with

a user User

an origin JournalEntry

a description String

a dueDate Date

a status of OPEN or DONE

a position Number # display order within dueDate

a carryCount Number

```

  

**actions:**

  

- `generate_from_entry(entry)`

Effects: parse `tomorrowPlan` into ordered OPEN tasks (replacing prior tasks from same `origin`).

- `mark_done(task)`

Effects: set `status = DONE`.

- `reorder(task, newPosition)`

Effects: set `position`.

- `carry_forward(user, fromDate, toDate)`

Pre: `toDate = fromDate + 1 day`.

Effects: for each OPEN task due `fromDate`, set `dueDate = toDate`, increment `carryCount`.

  

</details>

  

---

  

### Essential Synchronizations

  

<details>

<summary><b>Window/Session Sync(initiate calls)</b></summary>

  

**when:** Local time enters an **enabled** `CallWindow`.

**then:** Create a pending `Session`, initiate the scripted call, collect `Segments`; on completion call `end_session` then `mark_complete`.

**Note:** Telephony/voice runtime will be an external API and will invoke session actions as the call proceeds.

  

</details>

  

---

  

<details>

<summary><b> Session/Journal Sync (derive entry)</b></summary>

  

**when:** `mark_complete(session)` fires.

**then:** Automatically `create_from_session(session)` to produce that day’s structured `JournalEntry`.

**Note:** Enforces the “one entry per (user, date)” invariant.

  

</details>

  

---

  

<details>

<summary><b>Journal/Tasks Sync (materialize tomorrow list)</b></summary>

  

**when:** `create_from_session(session)` OR `edit_entry(entry)` where `tomorrowPlan` changed.

**then:** `generate_from_entry(entry)` to keep the authoritative “Tomorrow List” in sync.

**Note:** Replaces prior tasks whose `origin` is the same entry.

  

</details>

  

---

  

<details>

<summary><b> Daily Rollover Sync (keep intent alive)</b></summary>

  

**when:** Local midnight for each user.

**then:** `carry_forward(user, yesterday, today)` so unfinished tasks persist instead of disappearing.

**Note:** This is a representative “time-based sync”; other time anchors (e.g., start-of-workday) can reuse the same action.

  

</details>

  

---

  

### Role of the Concepts in the App

  

**Call Windows** expresses _availability commitment_: small promises of attention that don’t presuppose a pristine calendar.

**Reflection Sessions** is the _collection layer_: it runs the five-prompt script and records raw answers, audio, timestamps.

**Journal Entries** is the _interpretation layer_: it converts raw segments to a single structured record per user-day, enabling search and trend-spotting without rereading transcripts.

**Actionable Tasks** is the _execution bridge_: it turns intent into small steps and keeps them alive via carry-forward.

  

**Note:** All concepts treat **User** as a generic type bound by the host app’s auth/ACL. Besides this, coordination happens via the synchronizations above, keeping each concept independent, reusable, and testable.

  

### UI Sketches

  

#### Login Page

  

<img src="../assets/images/LoginPage.png" alt="Login Page" width="300">

  

#### Home Page

  

<img src="../assets/images/HomePage.png" alt="Home Page" width="300">

  

#### Settings and Call Window Setup Page

  

<img src="../assets/images/CallWindowAndSettingsPage.png" alt="Settings and Call Window Setup Page" width="300">

  

#### To-Do Page

  

<img src="../assets/images/ToDoPage.png" alt="To-Do Page" width="300">

  

### User Journey

  

1. **Trigger → Login via Phone #**

  

Jordan, a grad student juggling classes and a part-time job, keeps waking up unsure where to start. After missing a small deadline, he installs Zien. On the **Login Page**, Jordan enters his number, receives a 6-digit code, and verifies — no profiles, no clutter. *(*See **Login Page** wireframe.)\*

  

2. **Routine Setup → Call Window Setup**

  

When he first opens **Zien**, the app routes Jordan to **Call Window Setup Page**. The when2meet-style grid makes it obvious: he drags to select Mon–Thu, 8:45–9:15 PM, pick their timezone, and save. The key promise — “we’ll call you" — means Jordan won’t have to remember to reflect. *(*See **Call Window Setup Page** wireframe.)\*

  

3. **Pre-Call Clarity → Home Page (pre-call)**

  

Back on the **Home Page**, the week pager highlights today. A Call Status card shows “Tonight 8:45 PM,” and there’s a **Trigger Call** button. At 8:30 on the bus, Jordan taps **Trigger Call** to start early. *(*See **Home** wireframe, pre-call state.)\*

  

4. **Five-Minute Reflection (guided call)**

  

The phone rings. Zien’s calm script walks Jordan through five prompts—gratitude, what happened, what he's proud of, tomorrow’s actions, and a −2 to 2 day rating. As promised: no typing, and with minimal distractions; the call ends in under five minutes, initiated from the **Home Page**.

  

5. **Immediate Payoff → Home (post-call)**

  

**Home Page** swaps into post-call mode: a tidy “Today’s Journal” shows bullet point snippets under each prompt plus the day rating. Crucially, Zien has already extracted “Tomorrow” items into a short checklist. Jordan glances at the list once and puts the phone away. *(*See the **Home Page** wireframe, post-call state.)\*

  

6. **Morning Execution → To-Do (Today)**

  

Next morning, **To-Do (Today)** opens to the checklist created last night — 3 bite-size tasks on top. Jordan completes one, reorders another, and adds a tiny follow-up. Unfinished items will carry forward automatically, keeping the surface focused on action over planning. *(*See **To-Do (Today)** wireframe.)\*

  

7. **Lightweight Review & Personalization → Home + Settings**

  

Mid-week, Jordan taps across the **Home Page's** week pager to skim prior days’ mini-summaries—just enough context to spot patterns without rabbit holes. In the **Settings Page**, he adds a phonetic note for his name (“Jor-dan”) so the voice pronounces it correctly on future calls. *(*See **Home Page** and **Settings Page** wireframes.)\*

  

8. **Outcome**

  

The problem — aimless mornings and missed commitments — shrinks. With a scheduled, low-friction reflection that auto-becomes a next-day checklist, Jordan starts each day with his priorities top of mind, finally feeling like he's focused and in control of his busy life for the first time in what feels like forever.