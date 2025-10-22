import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "JournalEntry" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type ReflectionSession = ID;
type JournalEntry = ID;
type PromptResponse = ID;

/**
 * State: A set of JournalEntries - immutable daily records.
 */
interface JournalEntryDoc {
  _id: JournalEntry;
  user: User;
  creationDate: string; // ISO date string (YYYY-MM-DD)
  reflectionSession: ReflectionSession;
  rating: number; // Integer -2 to 2, immutable snapshot from session
}

/**
 * State: PromptResponses - immutable snapshots from reflection session.
 */
interface PromptResponseDoc {
  _id: PromptResponse;
  journalEntry: JournalEntry;
  promptId: ID; // ID of the PromptTemplate used
  promptText: string; // Snapshot of prompt text at time of response
  position: number; // Order in which prompt was asked (1, 2, 3...)
  responseText: string; // Immutable user response
  responseStarted: Date;
  responseFinished: Date;
}

/**
 * @concept JournalEntryConcept
 * @purpose Preserve completed reflection sessions as immutable daily records for review and trend analysis
 */
export default class JournalEntryConcept {
  journalEntries: Collection<JournalEntryDoc>;
  promptResponses: Collection<PromptResponseDoc>;

  constructor(private readonly db: Db) {
    this.journalEntries = this.db.collection(PREFIX + "journalEntries");
    this.promptResponses = this.db.collection(PREFIX + "promptResponses");
  }

  /**
   * Action: Creates a journal entry from a completed reflection session.
   * @requires session.status is COMPLETED; session.rating is set; no existing entry for (user, date)
   * @effects Creates JournalEntry; copies all PromptResponses from session; returns entry
   */
  async createFromSession(
    { sessionData, sessionResponses }: {
      sessionData: {
        user: User;
        reflectionSession: ReflectionSession;
        endedAt: Date | string;
        rating: number;
      };
      sessionResponses: Array<{
        promptId: ID;
        promptText: string;
        position: number;
        responseText: string;
        responseStarted: Date | string;
        responseFinished: Date | string;
      }>;
    },
  ): Promise<{ entry: JournalEntry } | { error: string }> {
    // Parse endedAt if it's a string (ISO format from frontend)
    const endedAtDate = typeof sessionData.endedAt === 'string' 
      ? new Date(sessionData.endedAt) 
      : sessionData.endedAt;
    
    // Extract date from endedAt
    const creationDate = endedAtDate.toISOString().split("T")[0];

    // Check for existing entry on this date
    const existingEntry = await this.journalEntries.findOne({
      user: sessionData.user,
      creationDate,
    });
    if (existingEntry) {
      return {
        error:
          `Journal entry already exists for user ${sessionData.user} on ${creationDate}.`,
      };
    }

    // Validate rating
    if (
      !Number.isInteger(sessionData.rating) ||
      sessionData.rating < -2 ||
      sessionData.rating > 2
    ) {
      return { error: "Rating must be an integer between -2 and 2." };
    }

    // Create journal entry
    const entryId = freshID() as JournalEntry;
    await this.journalEntries.insertOne({
      _id: entryId,
      user: sessionData.user,
      creationDate,
      reflectionSession: sessionData.reflectionSession,
      rating: sessionData.rating,
    });

    // Copy all prompt responses
    for (const response of sessionResponses) {
      // Parse dates if they're strings (ISO format from frontend)
      const responseStarted = typeof response.responseStarted === 'string'
        ? new Date(response.responseStarted)
        : response.responseStarted;
      const responseFinished = typeof response.responseFinished === 'string'
        ? new Date(response.responseFinished)
        : response.responseFinished;
        
      await this.promptResponses.insertOne({
        _id: freshID() as PromptResponse,
        journalEntry: entryId,
        promptId: response.promptId,
        promptText: response.promptText,
        position: response.position,
        responseText: response.responseText,
        responseStarted,
        responseFinished,
      });
    }

    return { entry: entryId };
  }

  /**
   * Action: Deletes a journal entry and its responses.
   * @requires entry exists
   * @effects Removes JournalEntry and its PromptResponses; does not delete ReflectionSession
   */
  async deleteEntry(
    { entry }: { entry: JournalEntry },
  ): Promise<Empty | { error: string }> {
    const entryDoc = await this.journalEntries.findOne({ _id: entry });
    if (!entryDoc) {
      return { error: `Journal entry ${entry} not found.` };
    }

    // Delete all prompt responses
    await this.promptResponses.deleteMany({ journalEntry: entry });

    // Delete entry
    await this.journalEntries.deleteOne({ _id: entry });

    return {};
  }

  /**
   * Query: Retrieves all entries for a user, ordered by date descending.
   */
  async _getEntriesByUser(
    { user }: { user: User },
  ): Promise<JournalEntryDoc[]> {
    return await this.journalEntries
      .find({ user })
      .sort({ creationDate: -1 })
      .toArray();
  }

  /**
   * Query: Retrieves entries within a date range.
   */
  async _getEntriesByDateRange(
    { user, startDate, endDate }: {
      user: User;
      startDate: string; // ISO date string
      endDate: string; // ISO date string
    },
  ): Promise<JournalEntryDoc[]> {
    return await this.journalEntries
      .find({
        user,
        creationDate: { $gte: startDate, $lte: endDate },
      })
      .sort({ creationDate: 1 })
      .toArray();
  }

  /**
   * Query: Retrieves entry for a specific date.
   */
  async _getEntryByDate(
    { user, date }: { user: User; date: string },
  ): Promise<JournalEntryDoc | null> {
    return await this.journalEntries.findOne({ user, creationDate: date });
  }

  /**
   * Query: Retrieves responses for an entry, ordered by position.
   */
  async _getEntryResponses(
    { entry }: { entry: JournalEntry },
  ): Promise<PromptResponseDoc[]> {
    return await this.promptResponses
      .find({ journalEntry: entry })
      .sort({ position: 1 })
      .toArray();
  }
}
