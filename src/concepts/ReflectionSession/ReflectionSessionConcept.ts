import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "ReflectionSession" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type CallSession = ID;
type ReflectionSession = ID;
type PromptResponse = ID;

// Enum for session status
type SessionStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

/**
 * State: A set of ReflectionSessions tracking live reflection progress.
 */
interface ReflectionSessionDoc {
  _id: ReflectionSession;
  user: User;
  callSession: CallSession;
  startedAt: Date;
  endedAt?: Date;
  status: SessionStatus;
  rating?: number; // Integer -2 to 2, set when session completes
}

/**
 * State: PromptResponses captured during a session.
 */
interface PromptResponseDoc {
  _id: PromptResponse;
  reflectionSession: ReflectionSession;
  promptId: ID; // ID of the PromptTemplate used
  promptText: string; // Snapshot of prompt text at time asked
  position: number; // Order in which prompt was asked (1, 2, 3...)
  responseText: string;
  responseStarted: Date;
  responseFinished: Date;
}

/**
 * @concept ReflectionSessionConcept
 * @purpose Track the real-time progress of a user's reflection session as they answer prompts
 */
export default class ReflectionSessionConcept {
  reflectionSessions: Collection<ReflectionSessionDoc>;
  promptResponses: Collection<PromptResponseDoc>;

  constructor(private readonly db: Db) {
    this.reflectionSessions = this.db.collection(
      PREFIX + "reflectionSessions",
    );
    this.promptResponses = this.db.collection(PREFIX + "promptResponses");
  }

  /**
   * Action: Starts a new reflection session.
   * @requires No IN_PROGRESS session exists for user; prompts sequence has 1-5 elements
   * @effects Creates new ReflectionSession with IN_PROGRESS status
   */
  async startSession(
    { user, callSession, prompts }: {
      user: User;
      callSession: CallSession;
      prompts: Array<{ promptId: ID; promptText: string }>;
    },
  ): Promise<{ session: ReflectionSession } | { error: string }> {
    // Check for existing IN_PROGRESS session
    const existingSession = await this.reflectionSessions.findOne({
      user,
      status: "IN_PROGRESS",
    });
    if (existingSession) {
      return {
        error: `User ${user} already has an IN_PROGRESS session: ${existingSession._id}`,
      };
    }

    // Validate prompts count
    if (prompts.length < 1 || prompts.length > 5) {
      return { error: "Prompts sequence must have 1-5 elements." };
    }

    const sessionId = freshID() as ReflectionSession;
    await this.reflectionSessions.insertOne({
      _id: sessionId,
      user,
      callSession,
      startedAt: new Date(),
      status: "IN_PROGRESS",
    });

    return { session: sessionId };
  }

  /**
   * Action: Records a response to a prompt.
   * @requires session.status is IN_PROGRESS; no existing PromptResponse for (session, position)
   * @effects Creates PromptResponse with current timestamps
   */
  async recordResponse(
    { session, promptId, promptText, position, responseText }: {
      session: ReflectionSession;
      promptId: ID;
      promptText: string;
      position: number;
      responseText: string;
    },
  ): Promise<Empty | { error: string }> {
    // Verify session exists and is IN_PROGRESS
    const sessionDoc = await this.reflectionSessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session ${session} not found.` };
    }

    if (sessionDoc.status !== "IN_PROGRESS") {
      return {
        error: `Session ${session} is ${sessionDoc.status}, cannot record response.`,
      };
    }

    // Check for existing response at this position
    const existingResponse = await this.promptResponses.findOne({
      reflectionSession: session,
      position,
    });
    if (existingResponse) {
      return {
        error: `Response already exists for session ${session} at position ${position}.`,
      };
    }

    const now = new Date();
    await this.promptResponses.insertOne({
      _id: freshID() as PromptResponse,
      reflectionSession: session,
      promptId,
      promptText,
      position,
      responseText,
      responseStarted: now,
      responseFinished: now,
    });

    return {};
  }

  /**
   * Action: Sets the rating for a session.
   * @requires session.status is IN_PROGRESS; rating is integer in [-2, 2]
   * @effects Sets session.rating
   */
  async setRating(
    { session, rating }: { session: ReflectionSession; rating: number },
  ): Promise<Empty | { error: string }> {
    // Verify session exists and is IN_PROGRESS
    const sessionDoc = await this.reflectionSessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session ${session} not found.` };
    }

    if (sessionDoc.status !== "IN_PROGRESS") {
      return {
        error: `Session ${session} is ${sessionDoc.status}, cannot set rating.`,
      };
    }

    // Validate rating
    if (!Number.isInteger(rating) || rating < -2 || rating > 2) {
      return { error: "Rating must be an integer between -2 and 2." };
    }

    await this.reflectionSessions.updateOne(
      { _id: session },
      { $set: { rating } },
    );

    return {};
  }

  /**
   * Action: Completes a session.
   * @requires session.status is IN_PROGRESS; session.rating is set; all expected prompts have responses
   * @effects Sets status to COMPLETED; sets endedAt to current time
   */
  async completeSession(
    { session, expectedPromptCount }: {
      session: ReflectionSession;
      expectedPromptCount: number;
    },
  ): Promise<Empty | { error: string }> {
    // Verify session exists and is IN_PROGRESS
    const sessionDoc = await this.reflectionSessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session ${session} not found.` };
    }

    if (sessionDoc.status !== "IN_PROGRESS") {
      return {
        error: `Session ${session} is already ${sessionDoc.status}.`,
      };
    }

    // Verify rating is set
    if (sessionDoc.rating === undefined) {
      return { error: "Rating must be set before completing session." };
    }

    // Verify all prompts have responses
    const responses = await this.promptResponses
      .find({ reflectionSession: session })
      .toArray();

    if (responses.length !== expectedPromptCount) {
      return {
        error:
          `Expected ${expectedPromptCount} responses, but found ${responses.length}.`,
      };
    }

    await this.reflectionSessions.updateOne(
      { _id: session },
      { $set: { status: "COMPLETED", endedAt: new Date() } },
    );

    return {};
  }

  /**
   * Action: Abandons a session.
   * @requires session.status is IN_PROGRESS
   * @effects Sets status to ABANDONED; sets endedAt to current time
   */
  async abandonSession(
    { session }: { session: ReflectionSession },
  ): Promise<Empty | { error: string }> {
    // Verify session exists and is IN_PROGRESS
    const sessionDoc = await this.reflectionSessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session ${session} not found.` };
    }

    if (sessionDoc.status !== "IN_PROGRESS") {
      return {
        error: `Session ${session} is already ${sessionDoc.status}.`,
      };
    }

    await this.reflectionSessions.updateOne(
      { _id: session },
      { $set: { status: "ABANDONED", endedAt: new Date() } },
    );

    return {};
  }

  /**
   * Query: Retrieves responses for a session, ordered by position.
   */
  async _getSessionResponses(
    { session }: { session: ReflectionSession },
  ): Promise<PromptResponseDoc[]> {
    return await this.promptResponses
      .find({ reflectionSession: session })
      .sort({ position: 1 })
      .toArray();
  }

  /**
   * Query: Retrieves all sessions for a user, ordered by startedAt descending.
   */
  async _getUserSessions(
    { user }: { user: User },
  ): Promise<ReflectionSessionDoc[]> {
    return await this.reflectionSessions
      .find({ user })
      .sort({ startedAt: -1 })
      .toArray();
  }

  /**
   * Query: Retrieves the active (IN_PROGRESS) session for a user.
   */
  async _getActiveSession(
    { user }: { user: User },
  ): Promise<ReflectionSessionDoc | null> {
    return await this.reflectionSessions.findOne({
      user,
      status: "IN_PROGRESS",
    });
  }

  /**
   * Query: Retrieves a specific session.
   */
  async _getSession(
    { session }: { session: ReflectionSession },
  ): Promise<ReflectionSessionDoc | null> {
    return await this.reflectionSessions.findOne({ _id: session });
  }
}
