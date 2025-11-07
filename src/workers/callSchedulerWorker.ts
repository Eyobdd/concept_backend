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
import JournalPromptConcept from "@concepts/JournalPrompt/JournalPromptConcept.ts";
import { CallOrchestrator } from "../services/callOrchestrator.ts";
import { EnhancedCallOrchestrator } from "../services/enhancedCallOrchestrator.ts";
import { TwilioService, MockTwilioService } from "../services/twilio.ts";
import { GoogleCloudService, MockGoogleCloudService } from "../services/googleCloud.ts";
import { DeepgramService, MockDeepgramService } from "../services/deepgram.ts";
import { GeminiSemanticChecker, MockGeminiSemanticChecker } from "../services/gemini.ts";
import { EncryptionService, MockEncryptionService } from "../services/encryption.ts";
import type { ID } from "@utils/types.ts";

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
  private journalPromptConcept: JournalPromptConcept;
  private orchestrator: CallOrchestrator | EnhancedCallOrchestrator;
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
    this.journalPromptConcept = new JournalPromptConcept(db);

    // Initialize services
    // Use mocks for testing, real services for production
    const useMocks = Deno.env.get("USE_MOCKS") === "true";
    const useEnhancedCalls = Deno.env.get("USE_ENHANCED_CALLS") !== "false"; // Default to true
    
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

    // Initialize orchestrator (enhanced or standard)
    if (useEnhancedCalls) {
      const googleCloudService = useMocks
        ? new MockGoogleCloudService()
        : new GoogleCloudService({
            apiKey: Deno.env.get("GOOGLE_CLOUD_API_KEY"),
            projectId: Deno.env.get("GOOGLE_CLOUD_PROJECT_ID"),
          });

      const deepgramService = useMocks
        ? new MockDeepgramService()
        : new DeepgramService({
            apiKey: Deno.env.get("DEEPGRAM_API_KEY")!,
          });

      this.orchestrator = new EnhancedCallOrchestrator({
        twilioService,
        googleCloudService,
        deepgramService,
        geminiChecker,
        encryptionService,
        phoneCallConcept: this.phoneCallConcept,
        reflectionSessionConcept: this.reflectionSessionConcept,
        callSchedulerConcept: this.callSchedulerConcept,
        profileConcept: this.profileConcept,
      });
      console.log("[CallSchedulerWorker] Using Enhanced Call Orchestrator (Google Cloud STT/TTS)");
    } else {
      this.orchestrator = new CallOrchestrator({
        twilioService,
        geminiChecker,
        encryptionService,
        phoneCallConcept: this.phoneCallConcept,
        reflectionSessionConcept: this.reflectionSessionConcept,
        callSchedulerConcept: this.callSchedulerConcept,
      });
      console.log("[CallSchedulerWorker] Using Standard Call Orchestrator");
    }
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

    // Cleanup orchestrator (only if it has cleanup method)
    if (this.orchestrator instanceof CallOrchestrator && 'cleanup' in this.orchestrator) {
      this.orchestrator.cleanup();
    }

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

      // Get active prompts from JournalPromptConcept
      const promptsResult = await this.journalPromptConcept._getActivePrompts({
        user: scheduledCall.user,
      });
      const activePrompts = promptsResult[0].prompts;

      if (activePrompts.length === 0) {
        console.error(`[CallSchedulerWorker] No active prompts found for user ${scheduledCall.user}`);
        await this.callSchedulerConcept.markFailed({
          callSession: scheduledCall.callSession,
          error: "No active prompts configured",
        });
        return;
      }

      // Sort prompts: regular prompts first (by position), then rating prompts at the end
      const regularPrompts = activePrompts.filter(p => !p.isRatingPrompt).sort((a, b) => a.position - b.position);
      const ratingPrompts = activePrompts.filter(p => p.isRatingPrompt).sort((a, b) => a.position - b.position);
      const sortedPrompts = [...regularPrompts, ...ratingPrompts];
      
      console.log(`[CallSchedulerWorker] Prompt order: ${sortedPrompts.map((p, i) => `${i+1}. ${p.promptText.substring(0, 30)}... (rating=${p.isRatingPrompt})`).join(', ')}`);

      // Convert to CallPrompt format (include all active prompts, including rating)
      const prompts = sortedPrompts.map(p => ({
        promptId: p._id,
        promptText: p.promptText,
        isRatingPrompt: p.isRatingPrompt || false,
      }));

      // Update the reflection session with the actual prompts that will be used
      console.log(`[CallSchedulerWorker] Updating session ${session._id} with ${prompts.length} prompts`);
      const updateResult = await this.reflectionSessionConcept.updateSessionPrompts({
        session: session._id,
        prompts: prompts.map(p => ({ promptId: p.promptId, promptText: p.promptText })),
      });
      
      if ('error' in updateResult) {
        console.error(`[CallSchedulerWorker] Failed to update session prompts: ${updateResult.error}`);
      } else {
        console.log(`[CallSchedulerWorker] Successfully updated session prompts: ${prompts.length} prompts`);
      }

      // Pregenerate audio for enhanced calls (happens BEFORE call initiation)
      let pregeneratedAudio: { greeting?: string; prompts?: string[]; closing?: string } | undefined;
      if (this.orchestrator instanceof EnhancedCallOrchestrator) {
        console.log(`[CallSchedulerWorker] Pregenerating audio for all prompts...`);
        try {
          pregeneratedAudio = await this.orchestrator.pregenerateAudio(
            profile.displayName,
            profile.namePronunciation,
            prompts.map(p => p.promptText),
            profile.timezone || "America/New_York",
          );
          console.log(`[CallSchedulerWorker] ✅ Audio pregenerated: greeting + ${pregeneratedAudio.prompts?.length || 0} prompts + closing`);
        } catch (audioError) {
          console.error(`[CallSchedulerWorker] Failed to pregenerate audio (will fallback to real-time):`, audioError);
          pregeneratedAudio = undefined;
        }
      }

      // Mark as in progress NOW (after audio pregeneration, before call initiation)
      console.log(`[CallSchedulerWorker] Marking call as IN_PROGRESS`);
      const markResult = await this.callSchedulerConcept.markInProgress({
        callSession: scheduledCall.callSession,
      });

      if ("error" in markResult) {
        console.error(
          `[CallSchedulerWorker] Failed to mark in progress: ${markResult.error}`,
        );
        return;
      }

      // Initiate call via orchestrator
      // Enhanced orchestrator uses initiateCall, standard uses initiateReflectionCall
      let callResult;
      if (this.orchestrator instanceof EnhancedCallOrchestrator) {
        const callSid = await this.orchestrator.initiateCall(
          scheduledCall.user,
          scheduledCall.phoneNumber,
          session._id,
          prompts,
          pregeneratedAudio, // Pass pregenerated audio
        );
        callResult = { callSid };
      } else {
        callResult = await this.orchestrator.initiateReflectionCall(
          scheduledCall.user,
          scheduledCall.phoneNumber,
          session._id,
          prompts,
        );
      }

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

      // For standard orchestrator, start prompting
      // For enhanced orchestrator, prompting starts automatically via webhooks
      if (this.orchestrator instanceof CallOrchestrator) {
        await this.orchestrator.startPrompting(
          callResult.callSid,
          prompts,
          profile.displayName,
          profile.namePronunciation,
        );
        console.log(`[CallSchedulerWorker] Call prompting started`);
      } else {
        console.log(`[CallSchedulerWorker] Call will start via webhook (enhanced mode)`);
      }
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
