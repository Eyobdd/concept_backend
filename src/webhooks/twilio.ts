/**
 * Twilio Webhook Handlers
 * 
 * Handles incoming webhooks from Twilio for call events.
 * These routes should be registered in the main server.
 */

import { Hono } from "jsr:@hono/hono";
import { Db } from "npm:mongodb";
import PhoneCallConcept from "@concepts/PhoneCall/PhoneCallConcept.ts";
import ReflectionSessionConcept from "@concepts/ReflectionSession/ReflectionSessionConcept.ts";
import CallSchedulerConcept from "@concepts/CallScheduler/CallSchedulerConcept.ts";
import { CallOrchestrator } from "../services/callOrchestrator.ts";
import { TwilioService, MockTwilioService } from "../services/twilio.ts";
import { GeminiSemanticChecker, MockGeminiSemanticChecker } from "../services/gemini.ts";
import { EncryptionService, MockEncryptionService } from "../services/encryption.ts";

/**
 * Creates Twilio webhook routes
 */
export function createTwilioWebhooks(db: Db): Hono {
  const app = new Hono();

  // Initialize concepts
  const phoneCallConcept = new PhoneCallConcept(db);
  const reflectionSessionConcept = new ReflectionSessionConcept(db);
  const callSchedulerConcept = new CallSchedulerConcept(db);

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
  const orchestrator = new CallOrchestrator({
    twilioService,
    geminiChecker,
    encryptionService,
    phoneCallConcept,
    reflectionSessionConcept,
  });

  /**
   * POST /webhooks/twilio/voice
   * Initial webhook when call is answered
   * Returns TwiML to start recording and gather speech
   */
  app.post("/voice", async (c) => {
    try {
      const body = await c.req.parseBody();
      const callSid = body.CallSid as string;
      const callStatus = body.CallStatus as string;

      console.log(`[Twilio Voice] CallSid: ${callSid}, Status: ${callStatus}`);

      // Mark call as connected
      await orchestrator.handleCallConnected(callSid);

      // Get the base URL from environment
      const baseUrl = Deno.env.get("BASE_URL") || "http://localhost:8000";

      // Return TwiML to greet and start first prompt
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello. This is your daily reflection call. Your responses will be recorded and encrypted for your privacy. Let's begin.</Say>
  <Say>What are you grateful for today?</Say>
  <Gather input="speech" timeout="3" speechTimeout="auto" action="${baseUrl}/webhooks/twilio/gather" method="POST">
    <Say>Please speak your response.</Say>
  </Gather>
  <Say>I didn't hear a response. Goodbye.</Say>
  <Hangup/>
</Response>`;

      return c.text(twiml, 200, { "Content-Type": "text/xml" });
    } catch (error) {
      console.error("[Twilio Voice] Error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  /**
   * POST /webhooks/twilio/status
   * Receives call status updates (initiated, ringing, in-progress, completed, etc.)
   */
  app.post("/status", async (c) => {
    try {
      const body = await c.req.parseBody();
      const callSid = body.CallSid as string;
      const callStatus = body.CallStatus as string;

      console.log(`[Twilio Status] CallSid: ${callSid}, Status: ${callStatus}`);

      // Handle different call statuses
      switch (callStatus) {
        case "completed":
        case "no-answer":
        case "busy":
        case "failed":
          // Get call info to find associated session
          const callResult = await phoneCallConcept._getPhoneCall({
            twilioCallSid: callSid,
          });
          const call = callResult[0].call;

          if (call) {
            if (callStatus === "completed") {
              // Normal completion - orchestrator should have handled this
              console.log(`[Twilio Status] Call completed normally`);
            } else {
              // Call failed or was not answered
              const reason = `Call ${callStatus}`;
              await orchestrator.handleCallAbandoned(callSid, reason);

              // Update scheduler to retry
              const schedulerResult = await callSchedulerConcept._getScheduledCall({
                callSession: call.reflectionSession,
              });
              const scheduledCall = schedulerResult[0].call;

              if (scheduledCall && scheduledCall.attemptCount < scheduledCall.maxRetries) {
                // Schedule retry in 5 minutes
                await callSchedulerConcept.markFailedAndRetry({
                  callSession: call.reflectionSession,
                  retryDelayMinutes: 5,
                });
                console.log(`[Twilio Status] Retry scheduled`);
              } else if (scheduledCall) {
                // Max retries reached
                await callSchedulerConcept.markFailed({
                  callSession: call.reflectionSession,
                  error: reason,
                });
                console.log(`[Twilio Status] Max retries reached, marked as failed`);
              }
            }
          }
          break;

        default:
          console.log(`[Twilio Status] Unhandled status: ${callStatus}`);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("[Twilio Status] Error:", error);
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
      const recordingUrl = body.RecordingUrl as string;

      console.log(`[Twilio Recording] CallSid: ${callSid}, URL: ${recordingUrl}`);

      // Get call info
      const callResult = await phoneCallConcept._getPhoneCall({
        twilioCallSid: callSid,
      });
      const call = callResult[0].call;

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

  /**
   * POST /webhooks/twilio/transcription
   * Receives real-time speech transcription
   * This would be called continuously as user speaks
   */
  app.post("/transcription", async (c) => {
    try {
      const body = await c.req.parseBody();
      const callSid = body.CallSid as string;
      const transcriptionText = body.TranscriptionText as string;

      console.log(`[Twilio Transcription] CallSid: ${callSid}, Text: ${transcriptionText}`);

      // Append to call transcript
      await orchestrator.handleSpeechInput(callSid, transcriptionText);

      return c.json({ success: true });
    } catch (error) {
      console.error("[Twilio Transcription] Error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  /**
   * POST /webhooks/twilio/gather
   * Receives user input after a <Gather> verb
   */
  app.post("/gather", async (c) => {
    try {
      const body = await c.req.parseBody();
      const callSid = body.CallSid as string;
      const speechResult = body.SpeechResult as string;
      const baseUrl = Deno.env.get("BASE_URL") || "http://localhost:8000";

      console.log(`[Twilio Gather] CallSid: ${callSid}, Speech: ${speechResult || '(no speech)'}`);

      // If no speech, end the call
      if (!speechResult) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>I didn't hear a response. Goodbye.</Say>
  <Hangup/>
</Response>`;
        return c.text(twiml, 200, { "Content-Type": "text/xml" });
      }

      // Handle gathered speech
      await orchestrator.handleSpeechInput(callSid, speechResult);

      // For now, ask the second prompt (hardcoded)
      // TODO: Track which prompt we're on and iterate through them
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you.</Say>
  <Say>What is one thing you learned today?</Say>
  <Gather input="speech" timeout="3" speechTimeout="auto" action="${baseUrl}/webhooks/twilio/gather2" method="POST">
    <Say>Please speak your response.</Say>
  </Gather>
  <Say>I didn't hear a response. Goodbye.</Say>
  <Hangup/>
</Response>`;

      return c.text(twiml, 200, { "Content-Type": "text/xml" });
    } catch (error) {
      console.error("[Twilio Gather] Error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  /**
   * POST /webhooks/twilio/gather2
   * Second prompt response
   */
  app.post("/gather2", async (c) => {
    try {
      const body = await c.req.parseBody();
      const callSid = body.CallSid as string;
      const speechResult = body.SpeechResult as string;

      console.log(`[Twilio Gather2] CallSid: ${callSid}, Speech: ${speechResult || '(no speech)'}`);

      if (speechResult) {
        await orchestrator.handleSpeechInput(callSid, speechResult);
      }

      // End the call
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for completing your reflection. Your responses have been recorded. Goodbye.</Say>
  <Hangup/>
</Response>`;

      return c.text(twiml, 200, { "Content-Type": "text/xml" });
    } catch (error) {
      console.error("[Twilio Gather2] Error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  return app;
}
