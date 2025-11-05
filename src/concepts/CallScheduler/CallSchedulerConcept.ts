import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { resolveUser } from "@utils/auth.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "CallScheduler" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type CallSession = ID;
type ScheduledCall = ID;

// Enum for call status
type CallStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";

/**
 * State: A set of ScheduledCalls tracking outbound call queue and retries.
 */
interface ScheduledCallDoc {
  _id: ScheduledCall;
  user: User;
  callSession: CallSession;
  phoneNumber: string;
  scheduledFor: Date;
  status: CallStatus;
  attemptCount: number;
  maxRetries: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * @concept CallSchedulerConcept
 * @purpose Manage the queue and retry logic for outbound reflection calls
 */
export default class CallSchedulerConcept {
  scheduledCalls: Collection<ScheduledCallDoc>;

  constructor(private readonly db: Db) {
    this.scheduledCalls = this.db.collection(PREFIX + "scheduledCalls");
  }

  /**
   * Action: Schedules a new call.
   * @requires maxRetries >= 1; No PENDING/IN_PROGRESS call for this callSession
   * @effects Creates new ScheduledCall with PENDING status
   */
  async scheduleCall(
    { user, token, callSession, phoneNumber, scheduledFor, maxRetries }: {
      user?: User;
      token?: string;
      callSession: CallSession;
      phoneNumber: string;
      scheduledFor: Date;
      maxRetries: number;
    },
  ): Promise<{ scheduledCall: ScheduledCall } | { error: string }> {
    // Resolve user from either user parameter or token
    const userResult = await resolveUser({ user, token });
    if ("error" in userResult) {
      return userResult;
    }
    user = userResult.user;
    
    // Validate maxRetries
    if (!Number.isInteger(maxRetries) || maxRetries < 1) {
      return { error: "maxRetries must be an integer of at least 1." };
    }

    // Convert scheduledFor to Date if it's a string (from HTTP API)
    const scheduledDate = scheduledFor instanceof Date ? scheduledFor : new Date(scheduledFor);

    // Check for existing active call for this session
    const existing = await this.scheduledCalls.findOne({
      callSession,
      status: { $in: ["PENDING", "IN_PROGRESS"] },
    });

    if (existing) {
      return {
        error: `Call session ${callSession} already has an active scheduled call.`,
      };
    }

    const scheduledCallId = freshID() as ScheduledCall;
    await this.scheduledCalls.insertOne({
      _id: scheduledCallId,
      user,
      callSession,
      phoneNumber,
      scheduledFor: scheduledDate,
      status: "PENDING",
      attemptCount: 0,
      maxRetries,
      createdAt: new Date(),
    });

    return { scheduledCall: scheduledCallId };
  }

  /**
   * Action: Marks a call as in progress.
   * @requires ScheduledCall exists with PENDING status
   * @effects Sets status to IN_PROGRESS, increments attemptCount
   */
  async markInProgress(
    { callSession }: { callSession: CallSession },
  ): Promise<Empty | { error: string }> {
    const call = await this.scheduledCalls.findOne({ callSession });
    if (!call) {
      return { error: `Scheduled call for session ${callSession} not found.` };
    }

    if (call.status !== "PENDING") {
      return {
        error: `Call must be PENDING to mark in progress. Current status: ${call.status}.`,
      };
    }

    await this.scheduledCalls.updateOne(
      { callSession },
      {
        $set: {
          status: "IN_PROGRESS",
          lastAttemptAt: new Date(),
        },
        $inc: { attemptCount: 1 },
      },
    );

    return {};
  }

  /**
   * Action: Marks a call as completed.
   * @requires ScheduledCall exists with IN_PROGRESS status
   * @effects Sets status to COMPLETED, sets completedAt
   */
  async markCompleted(
    { callSession }: { callSession: CallSession },
  ): Promise<Empty | { error: string }> {
    const call = await this.scheduledCalls.findOne({ callSession });
    if (!call) {
      return { error: `Scheduled call for session ${callSession} not found.` };
    }

    if (call.status !== "IN_PROGRESS") {
      return {
        error: `Call must be IN_PROGRESS to mark completed. Current status: ${call.status}.`,
      };
    }

    await this.scheduledCalls.updateOne(
      { callSession },
      {
        $set: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      },
    );

    return {};
  }

  /**
   * Action: Marks a call as failed and schedules retry.
   * @requires ScheduledCall exists with IN_PROGRESS status; attemptCount < maxRetries
   * @effects Sets status to PENDING, sets nextRetryAt
   */
  async markFailedAndRetry(
    { callSession, retryDelayMinutes }: {
      callSession: CallSession;
      retryDelayMinutes: number;
    },
  ): Promise<Empty | { error: string }> {
    const call = await this.scheduledCalls.findOne({ callSession });
    if (!call) {
      return { error: `Scheduled call for session ${callSession} not found.` };
    }

    if (call.status !== "IN_PROGRESS") {
      return {
        error: `Call must be IN_PROGRESS to retry. Current status: ${call.status}.`,
      };
    }

    if (call.attemptCount >= call.maxRetries) {
      return {
        error: `Cannot retry: attempt count (${call.attemptCount}) >= maxRetries (${call.maxRetries}).`,
      };
    }

    const nextRetryAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000);

    await this.scheduledCalls.updateOne(
      { callSession },
      {
        $set: {
          status: "PENDING",
          nextRetryAt,
        },
      },
    );

    return {};
  }

  /**
   * Action: Marks a call as permanently failed.
   * @requires ScheduledCall exists with IN_PROGRESS status; attemptCount >= maxRetries
   * @effects Sets status to FAILED, sets errorMessage and completedAt
   */
  async markFailed(
    { callSession, error }: { callSession: CallSession; error: string },
  ): Promise<Empty | { error: string }> {
    const call = await this.scheduledCalls.findOne({ callSession });
    if (!call) {
      return { error: `Scheduled call for session ${callSession} not found.` };
    }

    if (call.status !== "IN_PROGRESS") {
      return {
        error: `Call must be IN_PROGRESS to mark failed. Current status: ${call.status}.`,
      };
    }

    if (call.attemptCount < call.maxRetries) {
      return {
        error: `Cannot mark as failed: attempt count (${call.attemptCount}) < maxRetries (${call.maxRetries}). Use markFailedAndRetry instead.`,
      };
    }

    await this.scheduledCalls.updateOne(
      { callSession },
      {
        $set: {
          status: "FAILED",
          errorMessage: error,
          completedAt: new Date(),
        },
      },
    );

    return {};
  }

  /**
   * Action: Cancels a scheduled call.
   * @requires ScheduledCall exists with PENDING or IN_PROGRESS status
   * @effects Sets status to CANCELLED, sets completedAt
   */
  async cancelCall(
    { callSession }: { callSession: CallSession },
  ): Promise<Empty | { error: string }> {
    const call = await this.scheduledCalls.findOne({ callSession });
    if (!call) {
      return { error: `Scheduled call for session ${callSession} not found.` };
    }

    if (!["PENDING", "IN_PROGRESS"].includes(call.status)) {
      return {
        error: `Call must be PENDING or IN_PROGRESS to cancel. Current status: ${call.status}.`,
      };
    }

    await this.scheduledCalls.updateOne(
      { callSession },
      {
        $set: {
          status: "CANCELLED",
          completedAt: new Date(),
        },
      },
    );

    return {};
  }

  /**
   * Query: Retrieves pending calls that are ready to be processed.
   */
  async _getPendingCalls(
    { beforeTime }: { beforeTime: Date },
  ): Promise<ScheduledCallDoc[]> {
    // Convert beforeTime to Date if it's a string (from HTTP API)
    const beforeDate = beforeTime instanceof Date ? beforeTime : new Date(beforeTime);
    const beforeString = beforeDate.toISOString();
    
    console.log(`[CallScheduler] _getPendingCalls called with beforeTime: ${beforeString}`);
    
    // Query for both Date and string comparisons since we have mixed data types
    const result = await this.scheduledCalls
      .find({
        status: "PENDING",
        $or: [
          // String comparison
          { scheduledFor: { $lte: beforeString }, nextRetryAt: { $exists: false } },
          // Date comparison
          { scheduledFor: { $lte: beforeDate }, nextRetryAt: { $exists: false } },
          // Retry cases
          { nextRetryAt: { $lte: beforeString } },
          { nextRetryAt: { $lte: beforeDate } },
        ],
      })
      .sort({ scheduledFor: 1 })
      .toArray();
    
    console.log(`[CallScheduler] Found ${result.length} pending calls`);
    if (result.length > 0) {
      result.forEach((call, i) => {
        console.log(`[CallScheduler]   Call ${i+1}: ${call.callSession}, scheduled: ${call.scheduledFor}, type: ${typeof call.scheduledFor}`);
      });
    }
    
    return result;
  }

  /**
   * Query: Retrieves a scheduled call by call session.
   */
  async _getScheduledCall(
    { callSession }: { callSession: CallSession },
  ): Promise<{ call: ScheduledCallDoc | null }[]> {
    const call = await this.scheduledCalls.findOne({ callSession });
    return [{ call }];
  }

  /**
   * Query: Retrieves all active calls for a user.
   */
  async _getActiveCallsForUser(
    { user, token }: { user?: User; token?: string },
  ): Promise<ScheduledCallDoc[]> {
    const userResult = await resolveUser({ user, token });
    if ("error" in userResult) {
      return [];
    }
    user = userResult.user;
    
    return await this.scheduledCalls
      .find({
        user,
        status: { $in: ["PENDING", "IN_PROGRESS"] },
      })
      .toArray();
  }
}
