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
  profiles: Collection<any>; // Access to Profile collection for timezone

  constructor(private readonly db: Db) {
    this.journalEntries = this.db.collection(PREFIX + "journalEntries");
    this.promptResponses = this.db.collection(PREFIX + "promptResponses");
    this.profiles = this.db.collection("Profile.profiles");
  }

  /**
   * Helper: Converts a UTC timestamp to a date string in the user's timezone.
   * @param timestamp - The UTC timestamp
   * @param timezone - IANA timezone string (e.g., "America/New_York")
   * @returns Date string in YYYY-MM-DD format in the user's timezone
   */
  private formatDateInTimezone(timestamp: Date, timezone: string): string {
    // Use Intl.DateTimeFormat to convert to user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(timestamp);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    return `${year}-${month}-${day}`;
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
        rating?: number; // Optional - user may disable rating
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
    
    // Get user's timezone from profile
    const profile = await this.profiles.findOne({ user: sessionData.user });
    const userTimezone = profile?.timezone || 'UTC'; // Default to UTC if no timezone set
    
    // Extract date in user's timezone (not UTC)
    const creationDate = this.formatDateInTimezone(endedAtDate, userTimezone);

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

    // Validate rating if provided
    if (sessionData.rating !== undefined) {
      if (
        !Number.isInteger(sessionData.rating) ||
        sessionData.rating < -2 ||
        sessionData.rating > 2
      ) {
        return { error: "Rating must be an integer between -2 and 2." };
      }
    }

    // Create journal entry
    const entryId = freshID() as JournalEntry;
    await this.journalEntries.insertOne({
      _id: entryId,
      user: sessionData.user,
      creationDate,
      reflectionSession: sessionData.reflectionSession,
      rating: sessionData.rating ?? 0, // Default to 0 if not provided
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
  ): Promise<{ entries: JournalEntryDoc[] }[]> {
    const entries = await this.journalEntries
      .find({ user })
      .sort({ creationDate: -1 })
      .toArray();
    return [{ entries }];
  }

  /**
   * Query: Retrieves all entries for a user with their responses, ordered by date descending.
   */
  async _getEntriesWithResponsesByUser(
    { user }: { user: User },
  ): Promise<{ entries: Array<JournalEntryDoc & { responses: PromptResponseDoc[] }> }[]> {
    const entries = await this.journalEntries
      .find({ user })
      .sort({ creationDate: -1 })
      .toArray();
    
    // Fetch responses for all entries
    const entriesWithResponses = await Promise.all(
      entries.map(async (entry) => {
        const responses = await this.promptResponses
          .find({ journalEntry: entry._id })
          .sort({ position: 1 })
          .toArray();
        return { ...entry, responses };
      })
    );
    
    return [{ entries: entriesWithResponses }];
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
  ): Promise<{ entry: JournalEntryDoc | null }[]> {
    const entry = await this.journalEntries.findOne({ user, creationDate: date });
    return [{ entry }];
  }

  /**
   * Query: Retrieves responses for an entry, ordered by position.
   */
  async _getEntryResponses(
    { entry }: { entry: JournalEntry },
  ): Promise<{ responses: PromptResponseDoc[] }[]> {
    const responses = await this.promptResponses
      .find({ journalEntry: entry })
      .sort({ position: 1 })
      .toArray();
    return [{ responses }];
  }
}
