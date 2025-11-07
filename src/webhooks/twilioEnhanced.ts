/**
 * Enhanced Twilio Webhook Handlers with Deepgram STT and Google Cloud TTS
 * 
 * Handles incoming webhooks from Twilio for call events and media streams.
 * Uses Deepgram for transcription and Google Cloud for TTS.
 */

import { Hono } from "jsr:@hono/hono";
import { Db } from "npm:mongodb";
import PhoneCallConcept from "@concepts/PhoneCall/PhoneCallConcept.ts";
import ReflectionSessionConcept from "@concepts/ReflectionSession/ReflectionSessionConcept.ts";
import CallSchedulerConcept from "@concepts/CallScheduler/CallSchedulerConcept.ts";
import JournalPromptConcept from "@concepts/JournalPrompt/JournalPromptConcept.ts";
import ProfileConcept from "@concepts/Profile/ProfileConcept.ts";
import JournalEntryConcept from "@concepts/JournalEntry/JournalEntryConcept.ts";
import { EnhancedCallOrchestrator } from "../services/enhancedCallOrchestrator.ts";
import { ReflectionSessionManager } from "../services/reflectionSessionManager.ts";
import { TwilioService, MockTwilioService } from "../services/twilio.ts";
import { GoogleCloudService, MockGoogleCloudService } from "../services/googleCloud.ts";
import { DeepgramService } from "../services/deepgram.ts";
import { GeminiSemanticChecker, MockGeminiSemanticChecker } from "../services/gemini.ts";
import { EncryptionService, MockEncryptionService } from "../services/encryption.ts";

/**
 * Creates enhanced Twilio webhook routes with Google Cloud integration
 */
export function createEnhancedTwilioWebhooks(db: Db): Hono {
  const app = new Hono();

  // Initialize concepts
  const phoneCallConcept = new PhoneCallConcept(db);
  const reflectionSessionConcept = new ReflectionSessionConcept(db);
  const callSchedulerConcept = new CallSchedulerConcept(db);
  const journalPromptConcept = new JournalPromptConcept(db);
  const profileConcept = new ProfileConcept(db);
  const journalEntryConcept = new JournalEntryConcept(db);

  // Initialize services
  const useMocks = Deno.env.get("USE_MOCKS") === "true";
  
  const twilioService = useMocks 
    ? new MockTwilioService()
    : new TwilioService({
        accountSid: Deno.env.get("TWILIO_ACCOUNT_SID")!,
        authToken: Deno.env.get("TWILIO_AUTH_TOKEN")!,
        phoneNumber: Deno.env.get("TWILIO_PHONE_NUMBER")!,
      });
  
  const googleCloudService = useMocks
    ? new MockGoogleCloudService()
    : new GoogleCloudService({
        apiKey: Deno.env.get("GOOGLE_CLOUD_API_KEY"),
        projectId: Deno.env.get("GOOGLE_CLOUD_PROJECT_ID"),
      });
  
  const deepgramService = new DeepgramService({
    apiKey: Deno.env.get("DEEPGRAM_API_KEY") || "",
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

  // Initialize session manager
  const sessionManager = new ReflectionSessionManager(
    reflectionSessionConcept,
    callSchedulerConcept,
  );

  // Initialize enhanced orchestrator
  const orchestrator = new EnhancedCallOrchestrator({
    twilioService,
    googleCloudService,
    deepgramService,
    geminiChecker,
    encryptionService,
    phoneCallConcept,
    reflectionSessionConcept,
    callSchedulerConcept,
    profileConcept,
    journalEntryConcept,
  });

  /**
   * POST /webhooks/twilio/voice
   * Initial webhook when call is answered
   * Returns TwiML to start media streaming and play greeting
   */
  app.post("/voice", async (c) => {
    console.log("[ENHANCED WEBHOOK] /voice endpoint called!");
    try {
      const body = await c.req.parseBody();
      const callSid = body.CallSid as string;
      const callStatus = body.CallStatus as string;

      console.log(`[Twilio Voice] CallSid: ${callSid}, Status: ${callStatus}`);
      console.log(`[Twilio Voice] Full request body:`, JSON.stringify(body, null, 2));

      // Mark call as connected
      await orchestrator.handleCallConnected(callSid);

      // Get phone call info
      console.log(`[Twilio Voice] Looking up PhoneCall for CallSid: ${callSid}`);
      const phoneCallResult = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid });
      const phoneCall = phoneCallResult[0]?.call;

      console.log(`[Twilio Voice] PhoneCall lookup result:`, phoneCall ? `Found (ID: ${phoneCall._id})` : 'Not found');

      if (!phoneCall) {
        console.error(`[Twilio Voice] No phone call found for ${callSid}`);
        return c.text(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: Call not found.</Say><Hangup/></Response>`,
          200,
          { "Content-Type": "text/xml" }
        );
      }

      // Get session
      const sessionResult = await reflectionSessionConcept._getSession({ 
        session: phoneCall.reflectionSession 
      });
      const sessionData = sessionResult[0]?.sessionData;

      if (!sessionData) {
        console.error(`[Twilio Voice] No session found`);
        return c.text(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: Session not found.</Say><Hangup/></Response>`,
          200,
          { "Content-Type": "text/xml" }
        );
      }

      // Get user profile for name pronunciation
      const profileResult = await profileConcept._getProfile({ user: sessionData.user });
      const profile = profileResult[0]?.profile;

      // Get prompts
      const promptsResult = await journalPromptConcept._getActivePrompts({ user: sessionData.user });
      const activePrompts = promptsResult[0]?.prompts || [];

      if (activePrompts.length === 0) {
        console.error(`[Twilio Voice] No active prompts`);
        return c.text(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: No active prompts configured.</Say><Hangup/></Response>`,
          200,
          { "Content-Type": "text/xml" }
        );
      }

      // Sort prompts: regular prompts first (by position), then rating prompts at the end
      const regularPrompts = activePrompts.filter(p => !p.isRatingPrompt).sort((a, b) => a.position - b.position);
      const ratingPrompts = activePrompts.filter(p => p.isRatingPrompt).sort((a, b) => a.position - b.position);
      const prompts = [...regularPrompts, ...ratingPrompts];
      
      console.log(`[Twilio Voice] Prompt order: ${prompts.map((p, i) => `${i+1}. ${p.promptText.substring(0, 30)}... (rating=${p.isRatingPrompt})`).join(', ')}`);

      // Store prompts on PhoneCall (preserve isRatingPrompt flag)
      await phoneCallConcept.setPrompts({
        twilioCallSid: callSid,
        prompts: prompts.map(p => ({ promptId: p._id, promptText: p.promptText, isRatingPrompt: p.isRatingPrompt })),
      });

      // Generate TwiML with media streaming
      const userName = profile?.displayName || "there";
      const namePronunciation = profile?.namePronunciation;
      const firstPrompt = prompts[0].promptText;

      const twiml = await orchestrator.generateInitialTwiML(
        callSid,
        userName,
        namePronunciation,
        firstPrompt,
      );

      console.log("[Twilio Voice] Generated TwiML:", twiml);
      return c.text(twiml, 200, { "Content-Type": "text/xml" });
    } catch (error) {
      console.error("[Twilio Voice] ========== ERROR OCCURRED ==========");
      console.error("[Twilio Voice] Error message:", error?.message);
      console.error("[Twilio Voice] Error stack:", error?.stack);
      console.error("[Twilio Voice] Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error("[Twilio Voice] ====================================");
      
      // Try to abandon session
      try {
        const body = await c.req.parseBody();
        const callSid = body.CallSid as string;
        
        if (callSid) {
          const phoneCallResult = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid });
          const phoneCall = phoneCallResult[0]?.call;
          
          if (phoneCall?.reflectionSession) {
            await sessionManager.abandonSessionSafely(
              phoneCall.reflectionSession,
              `Error during call setup: ${error.message}`,
            );
          }
        }
      } catch (abandonError) {
        console.error("[Twilio Voice] Failed to abandon session:", abandonError);
      }
      
      return c.text(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say><Hangup/></Response>`,
        200,
        { "Content-Type": "text/xml" }
      );
    }
  });

  /**
   * WebSocket /webhooks/twilio/media-stream
   * Handles real-time audio streaming from Twilio
   */
  app.get("/media-stream", async (c) => {
    console.log("[MediaStream] WebSocket connection attempt");
    const upgradeHeader = c.req.header("Upgrade");
    
    if (upgradeHeader !== "websocket") {
      console.log("[MediaStream] Not a WebSocket request, upgrade header:", upgradeHeader);
      return c.text("Expected WebSocket", 400);
    }

    console.log("[MediaStream] Upgrading to WebSocket");
    // Upgrade to WebSocket
    const { socket, response } = Deno.upgradeWebSocket(c.req.raw);
    console.log("[MediaStream] WebSocket upgraded successfully");

    let callSid: string | null = null;
    let streamSid: string | null = null;

    socket.addEventListener("message", async (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.event) {
          case "start":
            // Stream started
            streamSid = msg.streamSid;
            callSid = msg.start.callSid;
            console.log(`[MediaStream] Stream started: ${streamSid} for call ${callSid}`);
            
            if (callSid && streamSid) {
              await orchestrator.handleMediaStreamStart(callSid, streamSid, socket);
            }
            break;

          case "media":
            // Audio chunk received - handled by orchestrator
            break;

          case "stop":
            console.log(`[MediaStream] Stream stopped: ${streamSid}`);
            break;

          default:
            console.log(`[MediaStream] Unknown event: ${msg.event}`);
        }
      } catch (error) {
        console.error("[MediaStream] Error processing message:", error);
      }
    });

    socket.addEventListener("close", () => {
      console.log(`[MediaStream] WebSocket closed for ${callSid}`);
    });

    socket.addEventListener("error", (error) => {
      console.error("[MediaStream] WebSocket error:", error);
    });

    return response;
  });

  /**
   * GET /webhooks/twilio/audio/:callSid/:type
   * Serves Gemini TTS generated audio files (PCM format wrapped in WAV)
   */
  app.get("/audio/:callSid/:type", (c) => {
    const callSid = c.req.param("callSid");
    const type = c.req.param("type"); // 'greeting', 'prompt', or 'next-prompt'
    
    const cacheKey = `${callSid}-${type}`;
    const audioBase64 = orchestrator.audioCache.get(cacheKey);
    
    if (!audioBase64) {
      console.error(`[Audio] No cached audio found for ${cacheKey}`);
      return c.text("Audio not found", 404);
    }
    
    // Convert base64 to binary PCM data
    const pcmData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    
    // Create WAV header for PCM audio (24kHz, 16-bit, mono)
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataSize = pcmData.length;
    
    const wavHeader = new Uint8Array(44);
    const view = new DataView(wavHeader.buffer);
    
    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true); // File size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"
    
    // fmt sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk size
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // Byte rate
    view.setUint16(32, numChannels * bitsPerSample / 8, true); // Block align
    view.setUint16(34, bitsPerSample, true); // Bits per sample
    
    // data sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true); // Data size
    
    // Combine header and PCM data
    const wavFile = new Uint8Array(44 + dataSize);
    wavFile.set(wavHeader, 0);
    wavFile.set(pcmData, 44);
    
    // Clean up cache after serving
    orchestrator.audioCache.delete(cacheKey);
    
    return c.body(wavFile, 200, {
      "Content-Type": "audio/wav",
      "Content-Length": wavFile.length.toString(),
    });
  });

  /**
   * POST /webhooks/twilio/status
   * Receives call status updates
   */
  app.post("/status", async (c) => {
    try {
      const body = await c.req.parseBody();
      const callSid = body.CallSid as string;
      const callStatus = body.CallStatus as string;

      console.log(`[Twilio Status] CallSid: ${callSid}, Status: ${callStatus}`);
      console.log(`[Twilio Status] Full request body:`, JSON.stringify(body, null, 2));

      switch (callStatus) {
        case "completed":
        case "no-answer":
        case "busy":
        case "failed":
          const callResult = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid });
          const call = callResult[0]?.call;

          if (call) {
            if (callStatus === "completed") {
              // Check both PhoneCall and session status
              const sessionResult = await reflectionSessionConcept._getSession({
                session: call.reflectionSession,
              });
              const sessionData = sessionResult[0]?.sessionData;

              // If PhoneCall is marked as COMPLETED by orchestrator, trust that decision
              // This means orchestrator successfully completed all prompts
              if (call.status === "COMPLETED") {
                console.log(`[Twilio Status] PhoneCall marked as COMPLETED by orchestrator`);
                // Ensure session is also marked complete (idempotent)
                if (sessionData?.status !== "COMPLETED") {
                  await sessionManager.completeSessionSafely(call.reflectionSession);
                }
              } else if (sessionData?.status === "IN_PROGRESS") {
                // PhoneCall not marked complete but call ended - user hung up early
                console.log(`[Twilio Status] Call ended but not marked complete - user hung up early`);
                await sessionManager.abandonSessionSafely(
                  call.reflectionSession,
                  "User hung up before completing reflection",
                );
              } else if (sessionData?.status === "COMPLETED") {
                // Session already completed
                console.log(`[Twilio Status] Session already completed`);
                await sessionManager.completeSessionSafely(call.reflectionSession);
              }
            } else {
              // Call failed
              const reason = `Call ${callStatus}`;
              await orchestrator.handleCallAbandoned(callSid, reason);

              // Schedule retry if needed
              const schedulerResult = await callSchedulerConcept._getScheduledCall({
                callSession: call.reflectionSession,
              });
              const scheduledCall = schedulerResult[0]?.call;

              if (scheduledCall && scheduledCall.attemptCount < scheduledCall.maxRetries) {
                await callSchedulerConcept.markFailedAndRetry({
                  callSession: call.reflectionSession,
                  retryDelayMinutes: 5,
                });
              } else if (scheduledCall) {
                await callSchedulerConcept.markFailed({
                  callSession: call.reflectionSession,
                  error: reason,
                });
              }
            }
          }
          break;

        default:
          console.log(`[Twilio Status] Unhandled status: ${callStatus}`);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("[Twilio Status] ========== ERROR OCCURRED ==========");
      console.error("[Twilio Status] Error message:", error?.message);
      console.error("[Twilio Status] Error stack:", error?.stack);
      console.error("[Twilio Status] Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error("[Twilio Status] ====================================");
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  /**
   * POST /webhooks/twilio/recording
   * Receives recording completion notification
   */
  app.post("/recording", async (c) => {
    try {
      const body = await c.req.parseBody();
      const callSid = body.CallSid as string;
      console.log(`[Twilio Recording] Full request body:`, JSON.stringify(body, null, 2));
      const recordingUrl = body.RecordingUrl as string;

      console.log(`[Twilio Recording] CallSid: ${callSid}, URL: ${recordingUrl}`);

      const callResult = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid });
      const call = callResult[0]?.call;

      if (call) {
        // Encrypt and store recording URL
        const encryptedUrl = await encryptionService.encryptRecordingUrl(
          call.user,
          recordingUrl,
        );

        await reflectionSessionConcept.setRecordingUrl({
          session: call.reflectionSession,
          recordingUrl: encryptedUrl,
        });

        console.log(`[Twilio Recording] Recording URL encrypted and stored`);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("[Twilio Recording] Error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  return app;
}
