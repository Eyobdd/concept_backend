import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { resolveUser } from "@utils/auth.ts";
import { withTimeout } from "@utils/async.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "ReflectionSession" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type CallSession = ID;
type ReflectionSession = ID;
type PromptResponse = ID;

// Enum for session status
type SessionStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

// Enum for reflection method
type ReflectionMethod = "PHONE" | "TEXT";

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
  prompts: Array<{ promptId: ID; promptText: string }>;
  rating?: number; // Integer -2 to 2, set when session completes
  method: ReflectionMethod; // How the reflection was conducted
  transcript?: string; // Full transcript for phone reflections
  recordingUrl?: string; // Encrypted recording URL for phone reflections
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
   * @requires No IN_PROGRESS session exists for user; prompts sequence has 1-5 elements; method is PHONE or TEXT
   * @effects Creates new ReflectionSession with IN_PROGRESS status and specified method
   */
  async startSession(
    { user, token, callSession, method, prompts }: {
      user?: User;
      token?: string;
      callSession: CallSession;
      method: ReflectionMethod;
      prompts: Array<{ promptId: ID; promptText: string }>;
    },
  ): Promise<{ session: ReflectionSession } | { error: string }> {
    // Resolve user from either user parameter or token
    const userResult = await resolveUser({ user, token });
    if ("error" in userResult) {
      return userResult;
    }
    user = userResult.user;
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

    // Validate method
    if (method !== "PHONE" && method !== "TEXT") {
      return { error: 'Method must be either "PHONE" or "TEXT".'};
    }

    const sessionId = freshID() as ReflectionSession;
    await this.reflectionSessions.insertOne({
      _id: sessionId,
      user,
      callSession,
      startedAt: new Date(),
      status: "IN_PROGRESS",
      method,
      prompts,
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
   * @requires session exists; all expected prompts have responses
   * @effects Sets status to COMPLETED; sets endedAt to current time (idempotent - succeeds if already completed)
   */
  async completeSession(
    { session }: { session: ReflectionSession },
  ): Promise<Empty | { error: string }> {
    // Verify session exists
    const sessionDoc = await this.reflectionSessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session ${session} not found.` };
    }

    // Idempotent: If already completed, return success
    if (sessionDoc.status === "COMPLETED") {
      return {};
    }

    // Cannot complete if abandoned
    if (sessionDoc.status === "ABANDONED") {
      return {
        error: `Session ${session} is ABANDONED and cannot be completed.`,
      };
    }

    // Must be IN_PROGRESS at this point
    // Rating is optional - only verify if it was set that it's valid
    // (Rating validation happens in setRating method)

    // Verify all prompts have responses
    const responses = await this.promptResponses
      .find({ reflectionSession: session })
      .toArray();

    if (responses.length !== sessionDoc.prompts.length) {
      return {
        error:
          `Expected ${sessionDoc.prompts.length} responses, but found ${responses.length}.`,
      };
    }

    await this.reflectionSessions.updateOne(
      { _id: session },
      { $set: { status: "COMPLETED", endedAt: new Date() } },
    );

    return {};
  }

  /**
   * Action: Updates the prompts array for a session.
   * Used when prompts are dynamically added (e.g., rating prompt).
   * @requires session exists and is IN_PROGRESS
   * @effects Updates the prompts array
   */
  async updateSessionPrompts(
    { session, prompts }: { 
      session: ReflectionSession; 
      prompts: { promptId: string; promptText: string }[] 
    },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.reflectionSessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session ${session} not found.` };
    }

    if (sessionDoc.status !== "IN_PROGRESS") {
      return { error: `Cannot update prompts for session with status ${sessionDoc.status}.` };
    }

    await this.reflectionSessions.updateOne(
      { _id: session },
      { $set: { prompts } },
    );

    return {};
  }

  /**
   * Action: Abandons a session.
   * @requires session exists
   * @effects Sets status to ABANDONED; sets endedAt to current time (idempotent - succeeds if already abandoned)
   */
  async abandonSession(
    { session }: { session: ReflectionSession },
  ): Promise<Empty | { error: string }> {
    // Verify session exists
    const sessionDoc = await this.reflectionSessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session ${session} not found.` };
    }

    // Idempotent: If already abandoned, return success
    if (sessionDoc.status === "ABANDONED") {
      return {};
    }

    // Cannot abandon if completed
    if (sessionDoc.status === "COMPLETED") {
      return {
        error: `Session ${session} is COMPLETED and cannot be abandoned.`,
      };
    }

    // Must be IN_PROGRESS at this point
    try {
      await withTimeout(this.reflectionSessions.updateOne(
        { _id: session },
        { $set: { status: "ABANDONED", endedAt: new Date() } },
      ), 5000); // 5-second timeout
    } catch (e) {
      return { error: `Failed to abandon session due to a timeout or other error: ${e.message}` };
    }

    return {};
  }

  /**
   * Query: Retrieves responses for a session, ordered by position.
   */
  async _getSessionResponses(
    { session }: { session: ReflectionSession },
  ): Promise<{ responses: PromptResponseDoc[] }[]> {
    const responses = await this.promptResponses
      .find({ reflectionSession: session })
      .sort({ position: 1 })
      .toArray();
    return [{ responses }];
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
   * Can be called with either { user } (authenticated via Requesting) or { token } (passthrough).
   */
  async _getActiveSession(
    params: { user?: User; token?: string },
  ): Promise<{ session: ReflectionSessionDoc | null }[]> {
    try {
      // Use resolveUser utility to handle both user and token
      const result = await resolveUser(params);
      if ('error' in result) {
        return [{ session: null }];
      }
      
      const session = await withTimeout(
        this.reflectionSessions.findOne({
          user: result.user,
          status: "IN_PROGRESS",
        }),
        5000 // 5-second timeout
      );
      return [{ session }];
    } catch (e) {
      console.error(`[_getActiveSession] Timeout or error:`, e);
      return [{ session: null }];
    }
  }

  /**
   * Query: Retrieves a specific session.
   */
  async _getSession(
    { session }: { session: ReflectionSession },
  ): Promise<{ sessionData: ReflectionSessionDoc | null }[]> {
    const sessionData = await this.reflectionSessions.findOne({ _id: session });
    return [{ sessionData }];
  }

  /**
   * Query: Retrieves a session by call session ID.
   */
  async _getSessionByCallSession(
    { callSession }: { callSession: CallSession },
  ): Promise<{ sessionData: ReflectionSessionDoc | null }[]> {
    const sessionData = await this.reflectionSessions.findOne({ callSession });
    return [{ sessionData }];
  }

  /**
   * Query: Gets detailed status information about a session.
   * @returns Status, completion readiness, and response counts
   */
  async getSessionStatus(
    { session }: { session: ReflectionSession },
  ): Promise<{
    status: SessionStatus;
    canComplete: boolean;
    canAbandon: boolean;
    responseCount: number;
    expectedResponseCount: number;
  } | { error: string }> {
    const sessionDoc = await this.reflectionSessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session ${session} not found.` };
    }

    const responses = await this.promptResponses
      .find({ reflectionSession: session })
      .toArray();

    const responseCount = responses.length;
    const expectedResponseCount = sessionDoc.prompts.length;
    const canComplete = sessionDoc.status === "IN_PROGRESS" && 
                       responseCount === expectedResponseCount;
    const canAbandon = sessionDoc.status === "IN_PROGRESS";

    return {
      status: sessionDoc.status,
      canComplete,
      canAbandon,
      responseCount,
      expectedResponseCount,
    };
  }

  /**
   * Action: Sets the transcript for a phone reflection session.
   * @requires session.status is IN_PROGRESS; session.method is PHONE
   * @effects Sets session.transcript
   */
  async setTranscript(
    { session, transcript }: { session: ReflectionSession; transcript: string },
  ): Promise<Empty | { error: string }> {
    // Verify session exists and is IN_PROGRESS
    const sessionDoc = await this.reflectionSessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session ${session} not found.` };
    }

    if (sessionDoc.status !== "IN_PROGRESS") {
      return {
        error: `Session ${session} is ${sessionDoc.status}, cannot set transcript.`,
      };
    }

    if (sessionDoc.method !== "PHONE") {
      return {
        error: `Session ${session} method is ${sessionDoc.method}, transcript only for PHONE sessions.`,
      };
    }

    await this.reflectionSessions.updateOne(
      { _id: session },
      { $set: { transcript } },
    );

    return {};
  }

  /**
   * Action: Sets the encrypted recording URL for a completed phone reflection.
   * @requires session.status is COMPLETED; session.method is PHONE
   * @effects Sets session.recordingUrl
   */
  async setRecordingUrl(
    { session, recordingUrl }: { session: ReflectionSession; recordingUrl: string },
  ): Promise<Empty | { error: string }> {
    // Verify session exists and is COMPLETED
    const sessionDoc = await this.reflectionSessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session ${session} not found.` };
    }

    if (sessionDoc.status !== "COMPLETED") {
      return {
        error: `Session ${session} is ${sessionDoc.status}, can only set recording URL for COMPLETED sessions.`,
      };
    }

    if (sessionDoc.method !== "PHONE") {
      return {
        error: `Session ${session} method is ${sessionDoc.method}, recording URL only for PHONE sessions.`,
      };
    }

    await this.reflectionSessions.updateOne(
      { _id: session },
      { $set: { recordingUrl } },
    );

    return {};
  }
}
