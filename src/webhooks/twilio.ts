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
import JournalPromptConcept from "@concepts/JournalPrompt/JournalPromptConcept.ts";
import { CallOrchestrator } from "../services/callOrchestrator.ts";
import { ReflectionSessionManager } from "../services/reflectionSessionManager.ts";
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
  const journalPromptConcept = new JournalPromptConcept(db);

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

  // Initialize session manager
  const sessionManager = new ReflectionSessionManager(
    reflectionSessionConcept,
    callSchedulerConcept,
  );

  // Initialize orchestrator
  const orchestrator = new CallOrchestrator({
    twilioService,
    geminiChecker,
    encryptionService,
    phoneCallConcept,
    reflectionSessionConcept,
    callSchedulerConcept,
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

      // Mark call as connected in our system
      await orchestrator.handleCallConnected(callSid);

      // Get the phone call document that was created when the call was initiated
      const phoneCallResult = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid });
      const phoneCall = phoneCallResult[0]?.call;

      if (!phoneCall) {
        console.error(`[Twilio Voice] No phone call found for ${callSid}`);
        return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: Call not found.</Say><Hangup/></Response>`, 200, { "Content-Type": "text/xml" });
      }

      // Get the associated reflection session
      const sessionResult = await reflectionSessionConcept._getSession({ session: phoneCall.reflectionSession });
      const sessionData = sessionResult[0]?.sessionData;

      if (!sessionData) {
        console.error(`[Twilio Voice] No session found for ${phoneCall.reflectionSession}`);
        return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: Session not found.</Say><Hangup/></Response>`, 200, { "Content-Type": "text/xml" });
      }

      // Get the user's active prompts for this session
      const promptsResult = await journalPromptConcept._getActivePrompts({ user: sessionData.user });
      const prompts = promptsResult[0]?.prompts || [];

      if (prompts.length === 0) {
        console.error(`[Twilio Voice] No active prompts found for user ${sessionData.user}`);
        return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: No active prompts configured.</Say><Hangup/></Response>`, 200, { "Content-Type": "text/xml" });
      }

      // Store the specific prompts for this call session on the PhoneCall document
      await phoneCallConcept.setPrompts({
        twilioCallSid: callSid,
        prompts: prompts.map(p => ({ promptId: p._id, promptText: p.promptText })),
      });

      const firstPrompt = prompts[0];
      const baseUrl = Deno.env.get("BASE_URL") || "http://localhost:8000";

      // Return TwiML to greet the user and ask the first prompt
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello. This is your daily reflection call. Your responses will be recorded and encrypted for your privacy. Let's begin.</Say>
  <Say>${firstPrompt.promptText}</Say>
  <Gather input="speech" timeout="10" speechTimeout="auto" action="${baseUrl}/webhooks/twilio/gather" method="POST">
    <Say>Please speak your response.</Say>
  </Gather>
  <Say>I didn't hear a response. Goodbye.</Say>
  <Hangup/>
</Response>`;

      return c.text(twiml, 200, { "Content-Type": "text/xml" });
    } catch (error) {
      console.error("[Twilio Voice] Error:", error);
      console.error("[Twilio Voice] Error stack:", error.stack);
      
      // Try to abandon the session if we can identify it
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
            console.log(`[Twilio Voice] Session abandoned due to error`);
          }
        }
      } catch (abandonError) {
        console.error("[Twilio Voice] Failed to abandon session after error:", abandonError);
      }
      
      return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an application error has occurred.</Say><Hangup/></Response>`, 200, { "Content-Type": "text/xml" });
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
              // Check if session is still IN_PROGRESS (user hung up early)
              if (call.reflectionSession) {
                const sessionResult = await reflectionSessionConcept._getSession({
                  session: call.reflectionSession,
                });
                const sessionData = sessionResult[0]?.sessionData;

                if (sessionData && sessionData.status === "IN_PROGRESS") {
                  // User hung up before completing all prompts - abandon session using manager
                  await sessionManager.abandonSessionSafely(
                    call.reflectionSession,
                    "User hung up before completing reflection",
                  );
                  console.log(`[Twilio Status] Session abandoned (user hung up early)`);
                } else if (sessionData && sessionData.status === "COMPLETED") {
                  // Session completed successfully - mark scheduler as complete using manager
                  await sessionManager.completeSessionSafely(
                    call.reflectionSession,
                  );
                  console.log(`[Twilio Status] Scheduler marked as complete`);
                }
              }
              console.log(`[Twilio Status] Call completed`);
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
   * Dynamically handles all prompts
   */
  app.post("/gather", async (c) => {
    try {
      const body = await c.req.parseBody();
      const callSid = body.CallSid as string;
      const speechResult = body.SpeechResult as string;
      const baseUrl = Deno.env.get("BASE_URL") || "http://localhost:8000";

      console.log(`[Twilio Gather] CallSid: ${callSid}, Speech: ${speechResult || '(no speech)'}`);

      // Get phone call to find session
      const phoneCallResult = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid });
      const phoneCall = phoneCallResult[0]?.call;

      if (!phoneCall) {
        console.error(`[Twilio Gather] No phone call found for ${callSid}`);
        return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: Call not found.</Say><Hangup/></Response>`, 200, { "Content-Type": "text/xml" });
      }

      // Get session
      const sessionResult = await reflectionSessionConcept._getSession({ session: phoneCall.reflectionSession });
      const sessionData = sessionResult[0]?.sessionData;

      if (!sessionData) {
        console.error(`[Twilio Gather] No session found`);
        return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: Session not found.</Say><Hangup/></Response>`, 200, { "Content-Type": "text/xml" });
      }

      const prompts = phoneCall.prompts || [];

      // Current prompt index (what we just answered)
      const currentIndex = phoneCall.currentPromptIndex;
      const currentPrompt = prompts[currentIndex];

      if (!currentPrompt) {
        console.error(`[Twilio Gather] No prompt at index ${currentIndex}`);
        return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: Prompt not found.</Say><Hangup/></Response>`, 200, { "Content-Type": "text/xml" });
      }

      // If we have speech, record the response
      if (speechResult) {
        await orchestrator.handleSpeechInput(callSid, speechResult);
        
        // Record response in PromptResponse
        await reflectionSessionConcept.recordResponse({
          session: phoneCall.reflectionSession,
          promptId: currentPrompt._id,
          promptText: currentPrompt.promptText,
          position: currentIndex + 1, // 1-indexed
          responseText: speechResult,
        });
        console.log(`[Twilio Gather] Recorded response for prompt ${currentIndex + 1}`);

        // Move to next prompt
        await phoneCallConcept.advanceToNextPrompt({ twilioCallSid: callSid });
        const nextIndex = currentIndex + 1;

        // Check if there are more prompts
        if (nextIndex < prompts.length) {
          const nextPrompt = prompts[nextIndex];
          
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you.</Say>
  <Say>${nextPrompt.promptText}</Say>
  <Gather input="speech" timeout="10" speechTimeout="auto" action="${baseUrl}/webhooks/twilio/gather" method="POST">
    <Say>Please speak your response.</Say>
  </Gather>
  <Say>I didn't hear a response. Goodbye.</Say>
  <Hangup/>
</Response>`;
          return c.text(twiml, 200, { "Content-Type": "text/xml" });
        } else {
          // All prompts completed
          const completeResult = await reflectionSessionConcept.completeSession({
            session: phoneCall.reflectionSession,
            expectedPromptCount: prompts.length,
          });

          if ("error" in completeResult) {
            console.error(`[Twilio Gather] Failed to complete session: ${completeResult.error}`);
          } else {
            console.log(`[Twilio Gather] Session completed: ${phoneCall.reflectionSession}`);
          }

          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for completing your reflection. Your responses have been recorded. Goodbye.</Say>
  <Hangup/>
</Response>`;
          return c.text(twiml, 200, { "Content-Type": "text/xml" });
        }
      } else {
        // No speech detected - abandon session
        await sessionManager.abandonSessionSafely(
          phoneCall.reflectionSession,
          "No speech detected - timeout",
        );
        console.log(`[Twilio Gather] Session abandoned (no speech detected)`);
        
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>I didn't hear a response. Goodbye.</Say>
  <Hangup/>
</Response>`;
        return c.text(twiml, 200, { "Content-Type": "text/xml" });
      }
    } catch (error) {
      console.error("[Twilio Gather] Error:", error);
      
      // Try to abandon the session if we can identify it
      try {
        const body = await c.req.parseBody();
        const callSid = body.CallSid as string;
        
        if (callSid) {
          const phoneCallResult = await phoneCallConcept._getPhoneCall({ twilioCallSid: callSid });
          const phoneCall = phoneCallResult[0]?.call;
          
          if (phoneCall?.reflectionSession) {
            await sessionManager.abandonSessionSafely(
              phoneCall.reflectionSession,
              `Error during call: ${error.message}`,
            );
            console.log(`[Twilio Gather] Session abandoned due to error`);
          }
        }
      } catch (abandonError) {
        console.error("[Twilio Gather] Failed to abandon session after error:", abandonError);
      }
      
      return c.json({ error: "Internal server error" }, 500);
    }
  });


  return app;
}
