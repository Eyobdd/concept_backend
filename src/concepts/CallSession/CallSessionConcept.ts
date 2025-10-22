import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "CallSession" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type JournalEntry = ID;

// Internal entity types, represented as IDs
type CallSession = ID;

// Enum types for source and status
type CallSource = "MANUAL" | "SCHEDULED";
type CallStatus = "PENDING" | "MISSED" | "COMPLETED";

/**
 * State: A set of CallSessions with user, date, retry info, source, status, and optional journal entry.
 */
interface CallSessionDoc {
  _id: CallSession;
  user: User;
  onDate: string; // Date stored as ISO string (YYYY-MM-DD)
  numRetries: number;
  lastAttempt?: Date; // DateTime stored as Date object
  source: CallSource;
  status: CallStatus;
  journalEntry?: JournalEntry;
}

/**
 * State: The central queue for initiated calls.
 */
interface CallQueueDoc {
  _id: string; // Single document with fixed ID
  pendingCalls: CallSession[]; // Sequence of CallSession IDs
}

/**
 * @concept CallSessionConcept
 * @purpose Manage the lifecycle of a specific call attempt for a user on a given day
 */
export default class CallSessionConcept {
  callSessions: Collection<CallSessionDoc>;
  callQueue: Collection<CallQueueDoc>;

  constructor(private readonly db: Db) {
    this.callSessions = this.db.collection(PREFIX + "callSessions");
    this.callQueue = this.db.collection(PREFIX + "callQueue");
  }

  /**
   * Action: Creates a new call session for a user on a specific date.
   * @requires There is no existing CallSession for the given user and date.
   * @effects A new CallSession is created with PENDING status and returned.
   */
  async createCallSession(
    { user, onDate, source }: {
      user: User;
      onDate: string; // ISO date string (YYYY-MM-DD)
      source: CallSource;
    },
  ): Promise<{ callSession: CallSession } | { error: string }> {
    // Check if a session already exists for this user and date
    const existingSession = await this.callSessions.findOne({ user, onDate });
    if (existingSession) {
      return {
        error:
          `A CallSession already exists for user ${user} on date ${onDate}.`,
      };
    }

    const sessionId = freshID() as CallSession;
    await this.callSessions.insertOne({
      _id: sessionId,
      user,
      onDate,
      numRetries: 0,
      source,
      status: "PENDING",
    });

    return { callSession: sessionId };
  }

  /**
   * Action: Deletes a call session for a user on a specific date.
   * @requires There exists a CallSession for the given user and date.
   * @effects The CallSession is removed from the set and from the queue if present.
   */
  async deleteCallSession(
    { user, onDate }: { user: User; onDate: string },
  ): Promise<Empty | { error: string }> {
    const session = await this.callSessions.findOne({ user, onDate });
    if (!session) {
      return {
        error: `No CallSession found for user ${user} on date ${onDate}.`,
      };
    }

    // Remove from call sessions
    await this.callSessions.deleteOne({ _id: session._id });

    // Remove from queue if present
    await this.callQueue.updateOne(
      { _id: "queue" },
      { $pull: { pendingCalls: session._id } },
    );

    return {};
  }

  /**
   * Action: Enqueues a call session for execution.
   * @requires The CallSession exists, has PENDING status, and is not already in the queue.
   * @effects The session's numRetries is incremented, lastAttempt is updated, and it's added to the queue.
   */
  async enqueueCall(
    { user, onDate }: { user: User; onDate: string },
  ): Promise<Empty | { error: string }> {
    const session = await this.callSessions.findOne({ user, onDate });
    if (!session) {
      return {
        error: `No CallSession found for user ${user} on date ${onDate}.`,
      };
    }

    if (session.status !== "PENDING") {
      return {
        error:
          `CallSession status must be PENDING to enqueue. Current status: ${session.status}.`,
      };
    }

    // Check if already in queue
    const queue = await this.callQueue.findOne({ _id: "queue" });
    if (queue && queue.pendingCalls.includes(session._id)) {
      return {
        error: `CallSession is already in the queue.`,
      };
    }

    // Update session: increment retries and set lastAttempt
    await this.callSessions.updateOne(
      { _id: session._id },
      {
        $inc: { numRetries: 1 },
        $set: { lastAttempt: new Date() },
      },
    );

    // Add to queue (create queue if it doesn't exist)
    await this.callQueue.updateOne(
      { _id: "queue" },
      { $push: { pendingCalls: session._id } },
      { upsert: true },
    );

    return {};
  }

  /**
   * Action: Marks a call session as completed with a journal entry.
   * @requires The CallSession exists.
   * @effects The session's status is set to COMPLETED, journalEntry is set, and it's removed from the queue.
   */
  async markCallCompleted(
    { user, onDate, entry }: {
      user: User;
      onDate: string;
      entry: JournalEntry;
    },
  ): Promise<Empty | { error: string }> {
    const session = await this.callSessions.findOne({ user, onDate });
    if (!session) {
      return {
        error: `No CallSession found for user ${user} on date ${onDate}.`,
      };
    }

    // Update session status and journal entry
    await this.callSessions.updateOne(
      { _id: session._id },
      {
        $set: {
          status: "COMPLETED",
          journalEntry: entry,
        },
      },
    );

    // Remove from queue if present
    await this.callQueue.updateOne(
      { _id: "queue" },
      { $pull: { pendingCalls: session._id } },
    );

    return {};
  }

  /**
   * Action: Marks a call session as missed.
   * @requires The CallSession exists.
   * @effects The session's status is set to MISSED and it's removed from the queue.
   */
  async markCallMissed(
    { user, onDate }: { user: User; onDate: string },
  ): Promise<Empty | { error: string }> {
    const session = await this.callSessions.findOne({ user, onDate });
    if (!session) {
      return {
        error: `No CallSession found for user ${user} on date ${onDate}.`,
      };
    }

    // Update session status
    await this.callSessions.updateOne(
      { _id: session._id },
      { $set: { status: "MISSED" } },
    );

    // Remove from queue if present
    await this.callQueue.updateOne(
      { _id: "queue" },
      { $pull: { pendingCalls: session._id } },
    );

    return {};
  }

  /**
   * Query: Retrieves a call session for a specific user and date.
   */
  async _getCallSession(
    { user, onDate }: { user: User; onDate: string },
  ): Promise<CallSessionDoc | null> {
    return await this.callSessions.findOne({ user, onDate });
  }

  /**
   * Query: Retrieves all call sessions for a specific user.
   */
  async _getUserCallSessions(
    { user }: { user: User },
  ): Promise<CallSessionDoc[]> {
    return await this.callSessions.find({ user }).toArray();
  }

  /**
   * Query: Retrieves the current call queue.
   */
  async _getCallQueue(): Promise<CallSession[]> {
    const queue = await this.callQueue.findOne({ _id: "queue" });
    return queue?.pendingCalls || [];
  }

  /**
   * Query: Retrieves all call sessions with a specific status.
   */
  async _getCallSessionsByStatus(
    { status }: { status: CallStatus },
  ): Promise<CallSessionDoc[]> {
    return await this.callSessions.find({ status }).toArray();
  }
}
