/**
 * Call Scheduler Background Worker
 * 
 * Processes pending calls from the CallScheduler queue.
 * Runs periodically to check for calls that need to be made.
 * Compatible with Render's background worker deployment.
 */

import { Db } from "npm:mongodb";
import { getDb } from "@utils/database.ts";
import CallSchedulerConcept from "@concepts/CallScheduler/CallSchedulerConcept.ts";
import PhoneCallConcept from "@concepts/PhoneCall/PhoneCallConcept.ts";
import ReflectionSessionConcept from "@concepts/ReflectionSession/ReflectionSessionConcept.ts";
import ProfileConcept from "@concepts/Profile/ProfileConcept.ts";
import { CallOrchestrator } from "../services/callOrchestrator.ts";
import { TwilioService, MockTwilioService } from "../services/twilio.ts";
import { GeminiSemanticChecker, MockGeminiSemanticChecker } from "../services/gemini.ts";
import { EncryptionService, MockEncryptionService } from "../services/encryption.ts";
import { ID } from "@utils/types.ts";

export interface WorkerConfig {
  pollIntervalSeconds?: number; // How often to check for pending calls (default: 15)
  batchSize?: number; // Max calls to process per batch (default: 10)
}

/**
 * Background worker for processing scheduled calls
 */
export class CallSchedulerWorker {
  private db: Db;
  private callSchedulerConcept: CallSchedulerConcept;
  private phoneCallConcept: PhoneCallConcept;
  private reflectionSessionConcept: ReflectionSessionConcept;
  private profileConcept: ProfileConcept;
  private orchestrator: CallOrchestrator;
  private pollInterval: number;
  private batchSize: number;
  private isRunning: boolean = false;
  private intervalId?: number;

  constructor(db: Db, config: WorkerConfig = {}) {
    this.db = db;
    this.pollInterval = (config.pollIntervalSeconds || 15) * 1000;
    this.batchSize = config.batchSize || 10;

    // Initialize concepts
    this.callSchedulerConcept = new CallSchedulerConcept(db);
    this.phoneCallConcept = new PhoneCallConcept(db);
    this.reflectionSessionConcept = new ReflectionSessionConcept(db);
    this.profileConcept = new ProfileConcept(db);

    // Initialize services
    // Use mocks for testing, real services for production
    const useMocks = Deno.env.get("USE_MOCKS") === "true";
    
    const twilioService = useMocks 
      ? new MockTwilioService()
      : new TwilioService({
          accountSid: Deno.env.get("TWILIO_ACCOUNT_SID")!,
          authToken: Deno.env.get("TWILIO_AUTH_TOKEN")!,
          phoneNumber: Deno.env.get("TWILIO_PHONE_NUMBER")!,
        });
    
    const geminiChecker = useMocks
      ? new MockGeminiSemanticChecker()
      : new GeminiSemanticChecker({
          apiKey: Deno.env.get("GEMINI_API_KEY")!,
        });
    
    const encryptionService = useMocks
      ? new MockEncryptionService()
      : new EncryptionService({
          masterSecret: Deno.env.get("ENCRYPTION_KEY")!,
        });

    // Initialize orchestrator
    this.orchestrator = new CallOrchestrator({
      twilioService,
      geminiChecker,
      encryptionService,
      phoneCallConcept: this.phoneCallConcept,
      reflectionSessionConcept: this.reflectionSessionConcept,
      callSchedulerConcept: this.callSchedulerConcept,
    });
  }

  /**
   * Starts the worker
   */
  start(): void {
    if (this.isRunning) {
      console.log("[CallSchedulerWorker] Already running");
      return;
    }

    this.isRunning = true;
    console.log(
      `[CallSchedulerWorker] Starting (poll interval: ${this.pollInterval / 1000}s, batch size: ${this.batchSize})`,
    );

    // Run immediately on start
    this.processPendingCalls();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.processPendingCalls();
    }, this.pollInterval);
  }

  /**
   * Stops the worker
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("[CallSchedulerWorker] Not running");
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Cleanup orchestrator
    this.orchestrator.cleanup();

    console.log("[CallSchedulerWorker] Stopped");
  }

  /**
   * Processes pending calls from the queue
   */
  private async processPendingCalls(): Promise<void> {
    try {
      const now = new Date();
      console.log(`[CallSchedulerWorker] Checking for pending calls at ${now.toISOString()}`);

      // Get pending calls
      const pendingCalls = await this.callSchedulerConcept._getPendingCalls({
        beforeTime: now,
      });

      if (pendingCalls.length === 0) {
        console.log("[CallSchedulerWorker] No pending calls");
        return;
      }

      console.log(`[CallSchedulerWorker] Found ${pendingCalls.length} pending calls`);

      // Process up to batchSize calls
      const callsToProcess = pendingCalls.slice(0, this.batchSize);

      for (const scheduledCall of callsToProcess) {
        await this.processCall(scheduledCall);
      }

      console.log(`[CallSchedulerWorker] Processed ${callsToProcess.length} calls`);
    } catch (error) {
      console.error("[CallSchedulerWorker] Error processing calls:", error);
    }
  }

  /**
   * Processes a single scheduled call
   */
  private async processCall(scheduledCall: any): Promise<void> {
    try {
      console.log(
        `[CallSchedulerWorker] Processing call for session ${scheduledCall.callSession}`,
      );

      // Mark as in progress
      const markResult = await this.callSchedulerConcept.markInProgress({
        callSession: scheduledCall.callSession,
      });

      if ("error" in markResult) {
        console.error(
          `[CallSchedulerWorker] Failed to mark in progress: ${markResult.error}`,
        );
        return;
      }

      // Get user profile for phone number and settings
      const profileResult = await this.profileConcept._getProfile({
        user: scheduledCall.user,
      });
      const profile = profileResult[0].profile;

      if (!profile) {
        console.error(`[CallSchedulerWorker] No profile found for user ${scheduledCall.user}`);
        await this.callSchedulerConcept.markFailed({
          callSession: scheduledCall.callSession,
          error: "User profile not found",
        });
        return;
      }

      // Get reflection session to get prompts
      const sessionResult = await this.reflectionSessionConcept._getSessionByCallSession({
        callSession: scheduledCall.callSession,
      });
      const session = sessionResult[0].sessionData;

      if (!session) {
        console.error(
          `[CallSchedulerWorker] No reflection session found for ${scheduledCall.callSession}`,
        );
        await this.callSchedulerConcept.markFailed({
          callSession: scheduledCall.callSession,
          error: "Reflection session not found",
        });
        return;
      }

      // Get prompts from session responses
      // Note: For phone calls, prompts should be pre-populated or fetched from a Prompt concept
      // For now, we'll use hardcoded default prompts as a workaround
      const prompts = [
        {
          promptId: "prompt1" as ID,
          promptText: "What are you grateful for today?",
        },
        {
          promptId: "prompt2" as ID,
          promptText: "What is one thing you learned today?",
        },
      ];

      // Initiate call via orchestrator
      const callResult = await this.orchestrator.initiateReflectionCall(
        scheduledCall.user,
        scheduledCall.phoneNumber,
        session._id,
        prompts,
      );

      if ("error" in callResult) {
        console.error(`[CallSchedulerWorker] Failed to initiate call: ${callResult.error}`);

        // Check if we should retry
        if (scheduledCall.attemptCount < scheduledCall.maxRetries) {
          await this.callSchedulerConcept.markFailedAndRetry({
            callSession: scheduledCall.callSession,
            retryDelayMinutes: 5,
          });
          console.log(`[CallSchedulerWorker] Retry scheduled`);
        } else {
          await this.callSchedulerConcept.markFailed({
            callSession: scheduledCall.callSession,
            error: callResult.error,
          });
          console.log(`[CallSchedulerWorker] Max retries reached`);
        }
        return;
      }

      console.log(`[CallSchedulerWorker] Call initiated: ${callResult.callSid}`);

      // Start prompting (this would normally be triggered by webhook)
      await this.orchestrator.startPrompting(
        callResult.callSid,
        prompts,
        profile.displayName,
        profile.namePronunciation,
      );

      console.log(`[CallSchedulerWorker] Call processing started`);
    } catch (error) {
      console.error(
        `[CallSchedulerWorker] Error processing call ${scheduledCall.callSession}:`,
        error,
      );

      // Try to mark as failed for retry
      try {
        if (scheduledCall.attemptCount < scheduledCall.maxRetries) {
          await this.callSchedulerConcept.markFailedAndRetry({
            callSession: scheduledCall.callSession,
            retryDelayMinutes: 5,
          });
        } else {
          await this.callSchedulerConcept.markFailed({
            callSession: scheduledCall.callSession,
            error: error.message || "Unknown error",
          });
        }
      } catch (markError) {
        console.error("[CallSchedulerWorker] Failed to mark call status:", markError);
      }
    }
  }
}

/**
 * Main entry point for running as a standalone worker
 */
async function main() {
  console.log("[CallSchedulerWorker] Initializing...");

  // Get database connection
  const [db] = await getDb();

  // Create and start worker
  const worker = new CallSchedulerWorker(db, {
    pollIntervalSeconds: 15, // Check every 15 seconds
    batchSize: 10, // Process up to 10 calls per batch
  });

  worker.start();

  // Handle graceful shutdown
  const shutdown = () => {
    console.log("[CallSchedulerWorker] Shutting down...");
    worker.stop();
    Deno.exit(0);
  };

  Deno.addSignalListener("SIGINT", shutdown);
  Deno.addSignalListener("SIGTERM", shutdown);

  console.log("[CallSchedulerWorker] Running. Press Ctrl+C to stop.");
}

// Run if this is the main module
if (import.meta.main) {
  main();
}
