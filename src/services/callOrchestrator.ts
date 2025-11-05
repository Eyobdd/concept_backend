/**
 * Call Orchestrator Service
 * 
 * Manages the STT→LLM→TTS pipeline for phone-based reflections.
 * Coordinates PhoneCall concept, Twilio service, Gemini semantic checker,
 * and ReflectionSession concept to handle the full call flow.
 */

import { ID } from "@utils/types.ts";
import PhoneCallConcept from "@concepts/PhoneCall/PhoneCallConcept.ts";
import ReflectionSessionConcept from "@concepts/ReflectionSession/ReflectionSessionConcept.ts";
import { TwilioService, MockTwilioService } from "./twilio.ts";
import { GeminiSemanticChecker, MockGeminiSemanticChecker } from "./gemini.ts";
import { EncryptionService, MockEncryptionService } from "./encryption.ts";

export interface CallOrchestratorConfig {
  twilioService: TwilioService | MockTwilioService;
  geminiChecker: GeminiSemanticChecker | MockGeminiSemanticChecker;
  encryptionService: EncryptionService | MockEncryptionService;
  phoneCallConcept: PhoneCallConcept;
  reflectionSessionConcept: ReflectionSessionConcept;
  pauseThresholdSeconds?: number; // Default: 3 seconds
}

export interface CallPrompt {
  promptId: ID;
  promptText: string;
}

/**
 * Orchestrates the phone call reflection flow
 */
export class CallOrchestrator {
  private twilioService: TwilioService | MockTwilioService;
  private geminiChecker: GeminiSemanticChecker | MockGeminiSemanticChecker;
  private encryptionService: EncryptionService | MockEncryptionService;
  private phoneCallConcept: PhoneCallConcept;
  private reflectionSessionConcept: ReflectionSessionConcept;
  private pauseThreshold: number;

  // Track active call monitoring intervals
  private activeMonitors: Map<string, number> = new Map();

  constructor(config: CallOrchestratorConfig) {
    this.twilioService = config.twilioService;
    this.geminiChecker = config.geminiChecker;
    this.encryptionService = config.encryptionService;
    this.phoneCallConcept = config.phoneCallConcept;
    this.reflectionSessionConcept = config.reflectionSessionConcept;
    this.pauseThreshold = config.pauseThresholdSeconds || 3;
  }

  /**
   * Initiates a phone call for a reflection session
   */
  async initiateReflectionCall(
    user: ID,
    phoneNumber: string,
    reflectionSession: ID,
    prompts: CallPrompt[],
  ): Promise<{ callSid: string } | { error: string }> {
    try {
      // Initiate Twilio call
      const callSid = await this.twilioService.initiateCall({
        to: phoneNumber,
        statusCallback: `/webhooks/twilio/status`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      });

      // Create PhoneCall record
      const phoneCallResult = await this.phoneCallConcept.initiateCall({
        user,
        reflectionSession,
        twilioCallSid: callSid,
      });

      if ("error" in phoneCallResult) {
        // If PhoneCall creation fails, end the Twilio call
        await this.twilioService.endCall(callSid);
        return { error: phoneCallResult.error };
      }

      return { callSid };
    } catch (error) {
      return { error: `Failed to initiate call: ${error.message}` };
    }
  }

  /**
   * Handles call connection (called from webhook)
   */
  async handleCallConnected(twilioCallSid: string): Promise<void> {
    await this.phoneCallConcept.markConnected({ twilioCallSid });
  }

  /**
   * Starts the prompting phase (called after call is answered)
   */
  async startPrompting(
    twilioCallSid: string,
    prompts: CallPrompt[],
    userName: string,
    namePronunciation?: string,
  ): Promise<void> {
    // Mark call as in progress
    await this.phoneCallConcept.startPrompting({ twilioCallSid });

    // Generate greeting TTS
    const greetingText = this.generateGreeting(userName, namePronunciation);
    await this.twilioService.textToSpeech({ text: greetingText });

    // Ask first prompt
    await this.askPrompt(twilioCallSid, prompts[0]);

    // Start monitoring for user speech
    this.startSpeechMonitoring(twilioCallSid, prompts);
  }

  /**
   * Generates personalized greeting
   */
  private generateGreeting(userName: string, namePronunciation?: string): string {
    const name = namePronunciation || userName;
    return `Hello ${name}. This is your daily reflection call. Your responses will be recorded and encrypted for your privacy. Let's begin.`;
  }

  /**
   * Asks a prompt via TTS
   */
  private async askPrompt(twilioCallSid: string, prompt: CallPrompt): Promise<void> {
    await this.twilioService.textToSpeech({ text: prompt.promptText });
  }

  /**
   * Starts monitoring user speech for completion
   */
  private startSpeechMonitoring(twilioCallSid: string, prompts: CallPrompt[]): void {
    // In production, this would be event-driven via Twilio webhooks
    // For now, we'll use a polling approach for the architecture

    const monitorInterval = setInterval(async () => {
      await this.checkSpeechCompletion(twilioCallSid, prompts);
    }, 1000); // Check every second

    this.activeMonitors.set(twilioCallSid, monitorInterval);
  }

  /**
   * Checks if user has completed their response
   */
  private async checkSpeechCompletion(
    twilioCallSid: string,
    prompts: CallPrompt[],
  ): Promise<void> {
    // Get current call state
    const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid });
    const call = callResult[0].call;

    if (!call || call.status !== "IN_PROGRESS") {
      this.stopMonitoring(twilioCallSid);
      return;
    }

    // Calculate pause duration
    const pauseDuration = (Date.now() - call.lastSpeechTime.getTime()) / 1000;

    // If pause is long enough, check semantic completion
    if (pauseDuration >= this.pauseThreshold && call.currentResponseBuffer.trim().length > 0) {
      const currentPrompt = prompts[call.currentPromptIndex];

      const completionResult = await this.geminiChecker.checkCompletion(
        currentPrompt.promptText,
        call.currentResponseBuffer,
        pauseDuration,
      );

      if (completionResult.isComplete && completionResult.confidence > 0.6) {
        await this.handleResponseComplete(twilioCallSid, prompts, call.currentPromptIndex);
      }
    }
  }

  /**
   * Handles completion of a response
   */
  private async handleResponseComplete(
    twilioCallSid: string,
    prompts: CallPrompt[],
    currentIndex: number,
  ): Promise<void> {
    // Get call state
    const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid });
    const call = callResult[0].call!;

    // Record response in ReflectionSession
    await this.reflectionSessionConcept.recordResponse({
      session: call.reflectionSession,
      promptId: prompts[currentIndex].promptId,
      promptText: prompts[currentIndex].promptText,
      position: currentIndex + 1,
      responseText: call.currentResponseBuffer,
    });

    // Check if there are more prompts
    if (currentIndex < prompts.length - 1) {
      // Advance to next prompt
      await this.phoneCallConcept.advanceToNextPrompt({
        twilioCallSid,
        totalPrompts: prompts.length,
      });

      // Ask next prompt
      await this.askPrompt(twilioCallSid, prompts[currentIndex + 1]);
    } else {
      // All prompts complete
      await this.completeCall(twilioCallSid);
    }
  }

  /**
   * Completes the call
   */
  private async completeCall(twilioCallSid: string): Promise<void> {
    // Stop monitoring
    this.stopMonitoring(twilioCallSid);

    // Get call state
    const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid });
    const call = callResult[0].call!;

    // Mark PhoneCall as completed
    await this.phoneCallConcept.markCompleted({ twilioCallSid });

    // Get recording URL
    const recordingUrl = await this.twilioService.getRecordingUrl(twilioCallSid);

    if (recordingUrl) {
      // Encrypt recording URL
      const encryptedUrl = await this.encryptionService.encryptRecordingUrl(
        call.user,
        recordingUrl,
      );

      // Store encrypted URL in ReflectionSession
      await this.reflectionSessionConcept.setRecordingUrl({
        session: call.reflectionSession,
        recordingUrl: encryptedUrl,
      });
    }

    // Store full transcript
    await this.reflectionSessionConcept.setTranscript({
      session: call.reflectionSession,
      transcript: call.accumulatedTranscript,
    });

    // Thank user and end call
    await this.twilioService.textToSpeech({
      text: "Thank you for completing your reflection. Have a great day!",
    });

    await this.twilioService.endCall(twilioCallSid);
  }

  /**
   * Handles call abandonment (user hangs up early)
   */
  async handleCallAbandoned(twilioCallSid: string, reason: string): Promise<void> {
    this.stopMonitoring(twilioCallSid);

    // Get call state
    const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid });
    const call = callResult[0].call;

    if (!call) return;

    // Mark PhoneCall as abandoned
    await this.phoneCallConcept.markAbandoned({ twilioCallSid, reason });

    // Mark ReflectionSession as abandoned
    await this.reflectionSessionConcept.abandonSession({
      session: call.reflectionSession,
    });
  }

  /**
   * Handles call failure
   */
  async handleCallFailed(twilioCallSid: string, error: string): Promise<void> {
    this.stopMonitoring(twilioCallSid);

    // Get call state
    const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid });
    const call = callResult[0].call;

    if (!call) return;

    // Mark PhoneCall as failed
    await this.phoneCallConcept.markFailed({ twilioCallSid, error });

    // Mark ReflectionSession as abandoned
    await this.reflectionSessionConcept.abandonSession({
      session: call.reflectionSession,
    });
  }

  /**
   * Handles incoming speech from user (called from webhook)
   */
  async handleSpeechInput(twilioCallSid: string, transcribedText: string): Promise<void> {
    await this.phoneCallConcept.appendToTranscript({
      twilioCallSid,
      text: transcribedText,
    });
  }

  /**
   * Stops monitoring for a call
   */
  private stopMonitoring(twilioCallSid: string): void {
    const interval = this.activeMonitors.get(twilioCallSid);
    if (interval) {
      clearInterval(interval);
      this.activeMonitors.delete(twilioCallSid);
    }
  }

  /**
   * Cleanup all active monitors (for graceful shutdown)
   */
  cleanup(): void {
    for (const [callSid, interval] of this.activeMonitors.entries()) {
      clearInterval(interval);
    }
    this.activeMonitors.clear();
  }
}
