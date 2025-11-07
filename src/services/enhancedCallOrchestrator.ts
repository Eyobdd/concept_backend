/**
 * Enhanced Call Orchestrator with Deepgram STT and Google Cloud TTS
 * 
 * Uses Twilio for call control, Deepgram for transcription, and Google Cloud for TTS.
 * Maintains the same conceptual interface as the original CallOrchestrator.
 */

import { GoogleCloudService } from "./googleCloud.ts";
import { DeepgramService } from "./deepgram.ts";
import { TwilioService } from "./twilio.ts";
import { GeminiSemanticChecker } from "./gemini.ts";
import { EncryptionService } from "./encryption.ts";
import PhoneCallConcept from "@concepts/PhoneCall/PhoneCallConcept.ts";
import ReflectionSessionConcept from "@concepts/ReflectionSession/ReflectionSessionConcept.ts";
import CallSchedulerConcept from "@concepts/CallScheduler/CallSchedulerConcept.ts";
import ProfileConcept from "@concepts/Profile/ProfileConcept.ts";
import JournalEntryConcept from "@concepts/JournalEntry/JournalEntryConcept.ts";
import type { ID } from "@utils/types.ts";
import { Buffer } from "node:buffer";

export interface CallPrompt {
  promptId: ID;
  promptText: string;
  _id?: ID;
  isRatingPrompt?: boolean; // Flag to identify the rating prompt
}

export interface EnhancedOrchestratorConfig {
  twilioService: TwilioService;
  googleCloudService: GoogleCloudService;
  deepgramService: DeepgramService;
  geminiChecker: GeminiSemanticChecker;
  encryptionService: EncryptionService;
  phoneCallConcept: PhoneCallConcept;
  reflectionSessionConcept: ReflectionSessionConcept;
  callSchedulerConcept: CallSchedulerConcept;
  profileConcept: ProfileConcept;
  journalEntryConcept: JournalEntryConcept;
  pauseThreshold?: number; // Seconds of silence before checking completion (default: 5)
}

/**
 * Manages the lifecycle of reflection calls with Deepgram STT and Google Cloud TTS
 */
export class EnhancedCallOrchestrator {
  private twilioService: TwilioService;
  private googleCloudService: GoogleCloudService;
  private deepgramService: DeepgramService;
  private geminiChecker: GeminiSemanticChecker;
  private encryptionService: EncryptionService;
  private phoneCallConcept: PhoneCallConcept;
  private reflectionSessionConcept: ReflectionSessionConcept;
  private callSchedulerConcept: CallSchedulerConcept;
  private profileConcept: ProfileConcept;
  private journalEntryConcept: JournalEntryConcept;
  private pauseThreshold: number;

  // Active media stream sessions
  private activeStreams: Map<string, MediaStreamSession> = new Map();
  
  // Audio cache for Google TTS generated audio (callSid-type -> base64 audio)
  public audioCache: Map<string, string> = new Map();

  constructor(config: EnhancedOrchestratorConfig) {
    this.twilioService = config.twilioService;
    this.googleCloudService = config.googleCloudService;
    this.deepgramService = config.deepgramService;
    this.geminiChecker = config.geminiChecker;
    this.encryptionService = config.encryptionService;
    this.phoneCallConcept = config.phoneCallConcept;
    this.reflectionSessionConcept = config.reflectionSessionConcept;
    this.callSchedulerConcept = config.callSchedulerConcept;
    this.profileConcept = config.profileConcept;
    this.journalEntryConcept = config.journalEntryConcept;
    this.pauseThreshold = config.pauseThreshold || 3; // 3s pause before checking completion
  }

  /**
   * Initiates an outbound call
   */
  async initiateCall(
    user: ID,
    phoneNumber: string,
    reflectionSession: ID,
    prompts: CallPrompt[],
  ): Promise<string> {
    try {
      console.log(`[EnhancedOrchestrator] Initiating call to ${phoneNumber} for user ${user}`);
      console.log(`[EnhancedOrchestrator] Received prompts in order: ${prompts.map((p, i) => `${i+1}. ${p.promptText.substring(0, 30)}... (rating=${p.isRatingPrompt})`).join(', ')}`);
      console.log(`[EnhancedOrchestrator] Initiating Twilio call to ${phoneNumber}`);
      const twilioCallSid = await this.twilioService.initiateCall({
        to: phoneNumber,
        statusCallback: "/webhooks/twilio/status",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      });

      console.log(`[EnhancedOrchestrator] Twilio call initiated with SID: ${twilioCallSid}`);
      
      // Small delay to ensure Twilio call is fully registered before webhook arrives
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now create PhoneCall record with the real Twilio SID
      const phoneCallResult = await this.phoneCallConcept.initiateCall({
        user,
        reflectionSession,
        twilioCallSid,
      });

      if ('error' in phoneCallResult) {
        console.error(`[EnhancedOrchestrator] Failed to create PhoneCall record: ${phoneCallResult.error}`);
        // Try to cancel the Twilio call since we can't track it
        try {
          await this.twilioService.endCall(twilioCallSid);
        } catch (endError) {
          console.error(`[EnhancedOrchestrator] Failed to end Twilio call: ${endError}`);
        }
        throw new Error(phoneCallResult.error);
      }

      console.log(`[EnhancedOrchestrator] PhoneCall record created: ${phoneCallResult.phoneCall}`);

      // Store prompts on the PhoneCall (preserve isRatingPrompt flag)
      const setPromptsResult = await this.phoneCallConcept.setPrompts({
        twilioCallSid,
        prompts: prompts.map(p => ({ 
          promptId: p.promptId, 
          promptText: p.promptText, 
          isRatingPrompt: p.isRatingPrompt,
          _id: p.promptId 
        })),
      });

      if ('error' in setPromptsResult) {
        console.error(`[EnhancedOrchestrator] Failed to set prompts: ${setPromptsResult.error}`);
        throw new Error(setPromptsResult.error);
      }

      console.log(`[EnhancedOrchestrator] PhoneCall fully configured with SID: ${twilioCallSid}`);

      return twilioCallSid;
    } catch (error) {
      console.error(`[EnhancedOrchestrator] Failed to initiate call:`, error);
      throw error;
    }
  }

  /**
   * Handles call connection (when user answers)
   */
  async handleCallConnected(twilioCallSid: string): Promise<void> {
    await this.phoneCallConcept.markConnected({ twilioCallSid });
  }

  /**
   * Generates TwiML for initial call setup with Google TTS
   * Returns TwiML that starts media streaming and plays greeting
   */
  async generateInitialTwiML(
    twilioCallSid: string,
    userName: string,
    namePronunciation?: string,
    firstPrompt?: string,
  ): Promise<string> {
    const baseUrl = Deno.env.get("BASE_URL") || "http://localhost:8000";
    
    // Convert HTTP/HTTPS to WS/WSS for WebSocket URL
    const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws";
    const wsHost = baseUrl.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${wsHost}`;

    // Generate greeting text
    const greetingText = this.generateGreeting(userName, namePronunciation);
    
    try {
      // Try to generate audio with Gemini TTS (cost-effective, good quality)
      console.log("[TTS] Generating greeting audio with Gemini 2.5 Flash TTS...");
      const greetingAudio = await this.geminiChecker.textToSpeech(greetingText);
      
      let promptAudio = "";
      if (firstPrompt) {
        console.log("[TTS] Generating first prompt audio with Gemini 2.5 Flash TTS...");
        promptAudio = await this.geminiChecker.textToSpeech(firstPrompt);
      }
      
      // Store audio in memory for serving via HTTP endpoint
      this.audioCache.set(`${twilioCallSid}-greeting`, greetingAudio);
      if (promptAudio) {
        this.audioCache.set(`${twilioCallSid}-prompt`, promptAudio);
      }
      
      console.log("[TTS] Audio generated successfully, using Gemini TTS");
      
      // TwiML with Google TTS audio
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${baseUrl}/webhooks/twilio/audio/${twilioCallSid}/greeting</Play>
  ${promptAudio ? `<Play>${baseUrl}/webhooks/twilio/audio/${twilioCallSid}/prompt</Play>` : ''}
  <Start>
    <Stream url="${wsUrl}/webhooks/twilio/media-stream">
      <Parameter name="callSid" value="${twilioCallSid}"/>
    </Stream>
  </Start>
  <Pause length="300"/>
</Response>`;

      return twiml;
    } catch (error) {
      console.error("[TTS] Gemini TTS failed, falling back to Twilio Say:", error);
      
      // Fallback to Twilio's <Say> if Google TTS fails
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">${greetingText}</Say>
  ${firstPrompt ? `<Say voice="Polly.Joanna" language="en-US">${firstPrompt}</Say>` : ''}
  <Start>
    <Stream url="${wsUrl}/webhooks/twilio/media-stream">
      <Parameter name="callSid" value="${twilioCallSid}"/>
    </Stream>
  </Start>
  <Pause length="60"/>
</Response>`;

      return twiml;
    }
  }

  /**
   * Generates personalized greeting
   */
  private generateGreeting(userName: string, namePronunciation?: string): string {
    const name = namePronunciation || userName;
    return `Hi ${name}, it's time for your daily journal entry!`;
  }

  /**
   * Handles incoming media stream connection
   */
  async handleMediaStreamStart(
    callSid: string,
    streamSid: string,
    websocket: WebSocket,
  ): Promise<void> {
    console.log(`[MediaStream] Starting stream ${streamSid} for call ${callSid}`);

    try {
      // Get call info
      const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid: callSid });
      const call = callResult[0]?.call;

      if (!call) {
        console.error(`[MediaStream] Call not found: ${callSid}`);
        websocket.close();
        return;
      }

      // Mark call as in progress
      await this.phoneCallConcept.startPrompting({ twilioCallSid: callSid });

    // Create streaming STT session with Deepgram
    let currentTranscript = "";
    let lastSpeechTime = Date.now();
    let completionCheckTimer: number | null = null;
    let sttStream: WebSocket | null = null;
    let sttFailed = false;

    try {
      console.log("[Deepgram] Creating streaming STT connection...");
      sttStream = this.deepgramService.createStreamingSTT(
        {
          model: "nova-2",
          language: "en-US",
          punctuate: true,
          interimResults: true,
          encoding: "mulaw",
          sampleRate: 8000,
          channels: 1,
        },
        async (transcript: string, isFinal: boolean) => {
          console.log(`[Deepgram] Transcript (final=${isFinal}): ${transcript}`);

          if (isFinal) {
            // Append to call transcript
            currentTranscript += transcript + " ";
            await this.phoneCallConcept.appendToTranscript({
              twilioCallSid: callSid,
              text: transcript + " ",
            });

            lastSpeechTime = Date.now();

            // Clear existing timer
            if (completionCheckTimer) {
              clearTimeout(completionCheckTimer);
            }

            // Set new timer to check completion after pause threshold
            completionCheckTimer = setTimeout(async () => {
              await this.checkAndHandleCompletion(callSid, call.prompts);
            }, this.pauseThreshold * 1000);
          }
        },
        (error: Error) => {
          console.error(`[Deepgram] STT error:`, error);
          sttFailed = true;
        },
      );
    } catch (error) {
      console.error(`[Deepgram] Failed to create STT stream:`, error);
      console.log(`[Deepgram] Call will continue without transcription`);
      sttFailed = true;
    }

    // Store session
    this.activeStreams.set(callSid, {
      streamSid,
      websocket,
      sttStream,
      currentTranscript,
      lastSpeechTime,
      completionCheckTimer,
    });

    // Handle incoming audio from Twilio
    websocket.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.event === "media") {
          // Twilio sends base64-encoded μ-law audio
          const audioChunk = Buffer.from(msg.media.payload, "base64");
          
          // Check if stream still exists and is open
          const session = this.activeStreams.get(callSid);
          if (session && session.sttStream && session.sttStream.readyState === WebSocket.OPEN && !sttFailed) {
            try {
              this.deepgramService.sendAudio(session.sttStream, audioChunk);
            } catch (writeError) {
              console.error(`[Deepgram] Error sending audio:`, writeError);
              sttFailed = true;
            }
          }
        } else if (msg.event === "stop") {
          console.log(`[MediaStream] Stream stopped: ${streamSid}`);
          this.cleanupMediaStream(callSid);
        }
      } catch (error) {
        console.error(`[MediaStream] Error processing message:`, error);
      }
    });

    websocket.addEventListener("close", () => {
      console.log(`[MediaStream] WebSocket closed for ${callSid}`);
      this.cleanupMediaStream(callSid);
    });
    } catch (error) {
      console.error(`[MediaStream] Fatal error in media stream for ${callSid}:`, error);
      const err = error as Error;
      console.error(`[MediaStream] Error stack:`, err.stack);
      
      // Safely abandon the session
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.handleCallAbandoned(callSid, `Media stream error: ${errorMessage}`);
      } catch (abandonError) {
        console.error(`[MediaStream] Failed to abandon session:`, abandonError);
      }
      
      // Clean up resources
      this.cleanupMediaStream(callSid);
      
      // Close websocket
      try {
        websocket.close();
      } catch (closeError) {
        console.error(`[MediaStream] Failed to close websocket:`, closeError);
      }
    }
  }

  /**
   * Checks if user has completed their response and handles next steps
   */
  private async checkAndHandleCompletion(
    twilioCallSid: string,
    prompts: CallPrompt[],
  ): Promise<void> {
    try {
      const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid });
      const call = callResult[0]?.call;

      if (!call || call.status !== "IN_PROGRESS") {
        return;
      }

      // Check if we've gone beyond all prompts (shouldn't happen with new design)
      if (call.currentPromptIndex >= prompts.length) {
        console.warn(`[Completion Check] Index ${call.currentPromptIndex} >= prompts.length ${prompts.length}, completing call`);
        await this.completeCall(twilioCallSid);
        return;
      }

      const currentPrompt = prompts[call.currentPromptIndex];
      const pauseDuration = (Date.now() - call.lastSpeechTime.getTime()) / 1000;

      // Use Gemini to check semantic completion
      const completionResult = await this.geminiChecker.checkCompletion(
        currentPrompt.promptText,
        call.currentResponseBuffer,
        pauseDuration,
      );
      
      console.log(`[Completion Check] Prompt ${call.currentPromptIndex + 1}/${prompts.length}, isComplete=${completionResult.isComplete}, confidence=${completionResult.confidence}, pauseDuration=${pauseDuration}s`);

      // Check if there's meaningful content
      const hasContent = call.currentResponseBuffer.trim().length > 20;
      
      // Use 0.75 confidence threshold with reasonable pause duration
      if (completionResult.isComplete && completionResult.confidence >= 0.75) {
        console.log(`[Completion Check] Response complete (confidence=${completionResult.confidence})`);
        await this.handleResponseComplete(twilioCallSid, prompts, call.currentPromptIndex);
      } else if (pauseDuration > 12 && hasContent) {
        // Fallback: If pause > 12s with content, assume complete even if Gemini disagrees
        console.log(`[Completion Check] Fallback completion after ${pauseDuration}s pause`);
        await this.handleResponseComplete(twilioCallSid, prompts, call.currentPromptIndex);
      } else {
        console.log(`[Completion Check] Not complete yet - waiting for more speech or longer pause`);
      }
    } catch (error) {
      console.error(`[Completion Check] Error checking completion for ${twilioCallSid}:`, error);
      // Don't abandon session here - this is a transient check that can fail
      // The call can continue and retry on next pause
    }
  }

  /**
   * Handles completion of a response and moves to next prompt
   */
  private async handleResponseComplete(
    twilioCallSid: string,
    prompts: CallPrompt[],
    currentIndex: number,
  ): Promise<void> {
    try {
      const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid });
      const call = callResult[0]?.call;
      
      if (!call) {
        console.error(`[Response Complete] Call not found: ${twilioCallSid}`);
        return;
      }

      const currentPrompt = prompts[currentIndex];

      // Record response in ReflectionSession (for all prompts including rating)
      // Rating extraction will happen after call completion
      await this.reflectionSessionConcept.recordResponse({
        session: call.reflectionSession,
        promptId: currentPrompt.promptId,
        promptText: currentPrompt.promptText,
        position: currentIndex + 1,
        responseText: call.currentResponseBuffer,
      });

      // Check if there are more prompts
      if (currentIndex < prompts.length - 1) {
        // Advance to next prompt
        await this.phoneCallConcept.advanceToNextPrompt({
          twilioCallSid,
        });

        // Play next prompt via TTS
        const nextPrompt = prompts[currentIndex + 1];
        await this.playPrompt(twilioCallSid, nextPrompt.promptText);
      } else {
        // All prompts complete
        await this.completeCall(twilioCallSid);
      }
    } catch (error) {
      console.error(`[Response Complete] Error handling response completion for ${twilioCallSid}:`, error);
      const err = error as Error;
      console.error(`[Response Complete] Error stack:`, err.stack);
      
      // This is a critical error - abandon the session
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.handleCallAbandoned(twilioCallSid, `Error advancing to next prompt: ${errorMessage}`);
      } catch (abandonError) {
        console.error(`[Response Complete] Failed to abandon session:`, abandonError);
      }
    }
  }

  /**
   * Plays a prompt using Gemini TTS (with Twilio fallback)
   */
  private async playPrompt(twilioCallSid: string, promptText: string): Promise<void> {
    // Check if call is still active before trying to play prompt
    const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid });
    const call = callResult[0]?.call;
    
    if (!call || call.status !== "IN_PROGRESS") {
      console.log(`[TTS] Call ${twilioCallSid} is not in progress, skipping prompt playback`);
      return;
    }

    try {
      console.log(`[TTS] Generating audio for next prompt with Gemini 2.5 Flash TTS...`);
      
      // Generate audio with Gemini TTS
      const audioBase64 = await this.geminiChecker.textToSpeech(promptText);

      console.log(`[TTS] Gemini TTS audio generated successfully`);

      // Store audio in cache
      this.audioCache.set(`${twilioCallSid}-next-prompt`, audioBase64);

      // Update call with TwiML to play the audio
      // IMPORTANT: Keep the Stream active so media stream doesn't close
      const baseUrl = Deno.env.get("BASE_URL")!;
      const audioUrl = `${baseUrl}/webhooks/twilio/audio/${twilioCallSid}/next-prompt`;
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Pause length="120"/>
</Response>`;

      await this.twilioService.updateCall(twilioCallSid, twiml);
      console.log(`[TTS] Next prompt audio sent to call`);
    } catch (error) {
      console.error(`[TTS] Gemini TTS failed for next prompt, using Twilio Say fallback:`, error);
      
      // Fallback to Twilio Say
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna" language="en-US">${promptText}</Say><Pause length="60"/></Response>`;
      
      try {
        await this.twilioService.updateCall(twilioCallSid, twiml);
        console.log(`[TTS] Next prompt sent using Twilio Say fallback`);
      } catch (twilioError) {
        // Check if error is because call ended
        const err = twilioError as any;
        if (err.message?.includes("not in-progress") || err.code === 21220) {
          console.log(`[TTS] Call ended before prompt could be played`);
        } else {
          console.error(`[TTS] Failed to send next prompt via Twilio:`, twilioError);
        }
      }
    }
  }

  /**
   * Completes the call
   */
  private async completeCall(twilioCallSid: string): Promise<void> {
    try {
      const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid });
      const call = callResult[0]?.call;
      
      if (!call) {
        console.error(`[Call Complete] Call not found: ${twilioCallSid}`);
        return;
      }

      console.log(`[Call Complete] Generating and playing closing message`);

      // Get user profile for timezone
      const profileResult = await this.profileConcept._getProfile({ user: call.user });
      const profile = profileResult[0]?.profile;

      // Generate time-aware closing message
      const closingText = this.generateClosingMessage(profile?.timezone || "America/New_York");
      
      // Generate closing audio BEFORE marking as complete
      try {
        console.log(`[TTS] Generating closing message audio with Gemini 2.5 Flash TTS...`);
        const closingAudio = await this.geminiChecker.textToSpeech(closingText);
        
        // Store audio in cache
        this.audioCache.set(`${twilioCallSid}-closing`, closingAudio);
        
        // Play closing message via TwiML redirect
        const baseUrl = Deno.env.get("BASE_URL")!;
        const audioUrl = `${baseUrl}/webhooks/twilio/audio/${twilioCallSid}/closing`;
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Pause length="2"/>
  <Hangup/>
</Response>`;

        await this.twilioService.updateCall(twilioCallSid, twiml);
        console.log(`[TTS] Closing message sent, call will end after playback`);
      } catch (ttsError) {
        console.error(`[TTS] Failed to generate/play closing message:`, ttsError);
        // Fall back to just hanging up
        try {
          await this.twilioService.endCall(twilioCallSid);
        } catch (endError) {
          console.error(`[Call Complete] Error ending call:`, endError);
        }
      }

      // Mark PhoneCall as completed (do this AFTER sending closing message)
      await this.phoneCallConcept.markCompleted({ twilioCallSid });
      console.log(`[Call Complete] PhoneCall marked as completed`);

      // Extract ratings from rating prompt responses before completing session
      try {
        // Get prompts from the PhoneCall record
        const prompts = call.prompts || [];
        
        const responsesResult = await this.reflectionSessionConcept._getSessionResponses({
          session: call.reflectionSession,
        });
        const responses = responsesResult[0]?.responses || [];
        
        // Find rating prompt responses
        const ratingResponses = responses.filter(r => {
          // Check if the prompt was a rating prompt by looking at the prompts array
          const promptIndex = r.position - 1;
          return prompts[promptIndex]?.isRatingPrompt === true;
        });
        
        console.log(`[Call Complete] Found ${ratingResponses.length} rating prompt responses`);
        
        // Extract rating from each rating response
        for (const ratingResponse of ratingResponses) {
          try {
            console.log(`[Call Complete] Extracting rating from: "${ratingResponse.responseText}"`);
            const ratingResult = await this.geminiChecker.extractRating(ratingResponse.responseText);
            console.log(`[Call Complete] Rating extraction result: rating=${ratingResult.rating}, confidence=${ratingResult.confidence}`);
            
            if (ratingResult.rating !== null && ratingResult.confidence >= 0.5) {
              await this.reflectionSessionConcept.setRating({
                session: call.reflectionSession,
                rating: ratingResult.rating,
              });
              console.log(`[Call Complete] Rating ${ratingResult.rating} saved successfully`);
              break; // Only save the first valid rating
            }
          } catch (error) {
            console.error(`[Call Complete] Error extracting rating from response:`, error);
          }
        }
      } catch (error) {
        console.error(`[Call Complete] Error processing rating responses:`, error);
        // Continue anyway - ratings are optional
      }

      // Complete the reflection session
      const completeResult = await this.reflectionSessionConcept.completeSession({
        session: call.reflectionSession,
      });

      if ('error' in completeResult) {
        console.error(`[Call Complete] Failed to complete session: ${completeResult.error}`);
        // Don't throw - try to create journal entry anyway
      } else {
        console.log(`[Call Complete] ReflectionSession marked as COMPLETED`);
      }

      console.log(`[Call Complete] Creating journal entry...`);

      // Create journal entry from completed session
      try {
        const sessionResult = await this.reflectionSessionConcept._getSession({
          session: call.reflectionSession,
        });
        const sessionData = sessionResult[0]?.sessionData;

        if (sessionData) {
          const responsesResult = await this.reflectionSessionConcept._getSessionResponses({
            session: call.reflectionSession,
          });
          const responses = responsesResult[0]?.responses || [];

          // Filter out rating prompt responses (promptId starts with "rating-")
          const nonRatingResponses = responses.filter(r => !r.promptId.startsWith('rating-'));

          const journalResult = await this.journalEntryConcept.createFromSession({
            sessionData: {
              user: sessionData.user,
              reflectionSession: sessionData._id,
              endedAt: sessionData.endedAt || new Date(),
              rating: sessionData.rating,
            },
            sessionResponses: nonRatingResponses.map(r => ({
              promptId: r.promptId,
              promptText: r.promptText,
              position: r.position,
              responseText: r.responseText,
              responseStarted: r.responseStarted,
              responseFinished: r.responseFinished,
            })),
          });

          if ('error' in journalResult) {
            console.error(`[Call Complete] Failed to create journal entry: ${journalResult.error}`);
          } else {
            console.log(`[Call Complete] Journal entry created: ${journalResult.entry}`);
          }
        }
      } catch (journalError) {
        console.error(`[Call Complete] Error creating journal entry:`, journalError);
      }

      console.log(`[Call Complete] Call marked as completed, closing message playing`);

      // Cleanup media stream
      this.cleanupMediaStream(twilioCallSid);
    } catch (error) {
      console.error(`[Call Complete] Error completing call ${twilioCallSid}:`, error);
      const err = error as Error;
      console.error(`[Call Complete] Error stack:`, err.stack);
      
      // Try to abandon the session gracefully
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.handleCallAbandoned(twilioCallSid, `Error completing call: ${errorMessage}`);
      } catch (abandonError) {
        console.error(`[Call Complete] Failed to abandon session:`, abandonError);
      }
    }
  }

  /**
   * Generates a time-aware closing message
   */
  private generateClosingMessage(timezone: string): string {
    try {
      // Get current time in user's timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      });
      
      const hour = parseInt(formatter.format(now));
      
      let timeOfDay: string;
      if (hour >= 5 && hour < 12) {
        timeOfDay = "morning";
      } else if (hour >= 12 && hour < 17) {
        timeOfDay = "afternoon";
      } else if (hour >= 17 && hour < 21) {
        timeOfDay = "evening";
      } else {
        timeOfDay = "night";
      }
      
      return `Thank you for taking the time to reflect. Have a wonderful ${timeOfDay}!`;
    } catch (error) {
      console.error(`[Closing] Error determining time of day:`, error);
      return "Thank you for taking the time to reflect. Have a wonderful day!";
    }
  }

  /**
   * Handles call abandonment
   */
  async handleCallAbandoned(twilioCallSid: string, reason: string): Promise<void> {
    console.log(`[Call Abandoned] ${twilioCallSid}: ${reason}`);
    const callResult = await this.phoneCallConcept._getPhoneCall({ twilioCallSid });
    const call = callResult[0]?.call;

    if (call) {
      await this.phoneCallConcept.markFailed({ twilioCallSid, error: reason });
      await this.reflectionSessionConcept.abandonSession({
        session: call.reflectionSession,
      });
    }

    this.cleanupMediaStream(twilioCallSid);
  }

  /**
   * Cleans up media stream resources
   */
  private cleanupMediaStream(callSid: string): void {
    const session = this.activeStreams.get(callSid);
    if (session) {
      if (session.completionCheckTimer) {
        clearTimeout(session.completionCheckTimer);
      }
      if (session.sttStream && session.sttStream.readyState !== WebSocket.CLOSED) {
        try {
          this.deepgramService.closeStream(session.sttStream);
        } catch (error) {
          console.error(`[Deepgram] Error closing STT stream:`, error);
        }
      }
      this.activeStreams.delete(callSid);
    }
  }
}

interface MediaStreamSession {
  streamSid: string;
  websocket: WebSocket;
  sttStream: WebSocket | null; // Deepgram WebSocket
  currentTranscript: string;
  lastSpeechTime: number;
  completionCheckTimer: number | null;
}
