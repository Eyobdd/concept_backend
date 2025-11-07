import { ID } from "@utils/types.ts";
import ReflectionSessionConcept from "@concepts/ReflectionSession/ReflectionSessionConcept.ts";
import CallSchedulerConcept from "@concepts/CallScheduler/CallSchedulerConcept.ts";

/**
 * ReflectionSessionManager
 * 
 * Centralized manager for handling reflection session status transitions
 * with all necessary side effects (e.g., updating call scheduler).
 * 
 * This ensures consistent behavior across all abandonment/completion triggers
 * (frontend cleanup, webhooks, orchestrator) and prevents race conditions
 * through idempotent operations.
 */
export class ReflectionSessionManager {
  constructor(
    private reflectionConcept: ReflectionSessionConcept,
    private callSchedulerConcept: CallSchedulerConcept,
  ) {}

  /**
   * Safely abandon a session with all side effects.
   * Idempotent - safe to call multiple times.
   * 
   * @param sessionId - The reflection session ID to abandon
   * @param reason - Human-readable reason for abandonment (for logging/debugging)
   * @returns Success (true) or error details
   */
  async abandonSessionSafely(
    sessionId: ID,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[SessionManager] Abandoning session ${sessionId}: ${reason}`);

    // Attempt to abandon the session (idempotent)
    const result = await this.reflectionConcept.abandonSession({
      session: sessionId,
    });

    // If abandonment succeeded or was already abandoned, mark scheduler as failed
    if (!("error" in result)) {
      // Successfully abandoned (or was already abandoned)
      try {
        await this.callSchedulerConcept.markFailed({
          callSession: sessionId,
          error: reason,
        });
        console.log(`[SessionManager] Session ${sessionId} abandoned successfully`);
        return { success: true };
      } catch (e) {
        console.error(`[SessionManager] Failed to mark scheduler as failed:`, e);
        // Session is abandoned but scheduler update failed - still return success
        // since the primary operation (abandonment) succeeded
        return { success: true };
      }
    }

    // Check if error is because session is already completed
    if (result.error.includes("COMPLETED")) {
      console.log(`[SessionManager] Session ${sessionId} already completed, cannot abandon`);
      return { success: false, error: result.error };
    }

    // Other error (e.g., session not found)
    console.error(`[SessionManager] Failed to abandon session ${sessionId}:`, result.error);
    return { success: false, error: result.error };
  }

  /**
   * Safely complete a session with validation and side effects.
   * Idempotent - safe to call multiple times.
   * 
   * @param sessionId - The reflection session ID to complete
   * @returns Success (true) or error details
   */
  async completeSessionSafely(
    sessionId: ID,
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[SessionManager] Completing session ${sessionId}`);

    // Get session status first to check if we can complete
    const sessionResult = await this.reflectionConcept._getSession({
      session: sessionId,
    });
    const session = sessionResult[0]?.sessionData;

    if (!session) {
      console.error(`[SessionManager] Session ${sessionId} not found`);
      return { success: false, error: "Session not found" };
    }

    // If already completed, return success (idempotent)
    if (session.status === "COMPLETED") {
      console.log(`[SessionManager] Session ${sessionId} already completed`);
      return { success: true };
    }

    // Cannot complete if abandoned
    if (session.status === "ABANDONED") {
      console.error(`[SessionManager] Cannot complete abandoned session ${sessionId}`);
      return { success: false, error: "Cannot complete abandoned session" };
    }

    // Attempt to complete the session
    const result = await this.reflectionConcept.completeSession({
      session: sessionId,
    });

    if ("error" in result) {
      console.error(`[SessionManager] Failed to complete session ${sessionId}:`, result.error);
      return { success: false, error: result.error };
    }

    // Mark scheduler as complete
    try {
      await this.callSchedulerConcept.markCompleted({
        callSession: sessionId,
      });
      console.log(`[SessionManager] Session ${sessionId} completed successfully`);
      return { success: true };
    } catch (e) {
      console.error(`[SessionManager] Failed to mark scheduler as complete:`, e);
      // Session is completed but scheduler update failed - still return success
      // since the primary operation (completion) succeeded
      return { success: true };
    }
  }

  /**
   * Get detailed status information about a session.
   * Useful for frontend to determine what actions are available.
   */
  async getSessionStatus(sessionId: ID) {
    return await this.reflectionConcept.getSessionStatus({
      session: sessionId,
    });
  }

  /**
   * Get the active (IN_PROGRESS) session for a user.
   * Returns null if no active session exists.
   */
  async getActiveSession(user: ID) {
    return await this.reflectionConcept._getActiveSession({ user });
  }
}
