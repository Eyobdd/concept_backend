/**
 * Twilio Service Integration
 * 
 * Handles Voice calls, Speech-to-Text, and Text-to-Speech using Twilio APIs
 * and Google Cloud Speech/TTS services.
 */

import twilio from "npm:twilio";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string; // Twilio phone number to call from
  googleCloudApiKey?: string; // For STT/TTS
  verifyServiceSid?: string; // Twilio Verify Service SID for SMS verification
}

export interface CallOptions {
  to: string; // Phone number to call (E.164 format)
  statusCallback?: string; // Webhook URL for call status updates
  statusCallbackEvent?: string[]; // Events to track
}

export interface TTSOptions {
  text: string;
  voice?: string; // Voice ID (default: Google en-US-Neural2-A)
  languageCode?: string; // Language code (default: en-US)
}

export interface STTOptions {
  audioUrl: string; // URL to audio file
  languageCode?: string; // Language code (default: en-US)
}

/**
 * Real Twilio service implementation
 */
export class TwilioService {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private googleApiKey?: string;
  private verifyServiceSid?: string;

  constructor(config: TwilioConfig) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.phoneNumber = config.phoneNumber;
    this.googleApiKey = config.googleCloudApiKey;
    this.verifyServiceSid = config.verifyServiceSid;
  }

  /**
   * Initiates an outbound call
   * @returns Twilio Call SID
   */
  async initiateCall(options: CallOptions): Promise<string> {
    const baseUrl = Deno.env.get("BASE_URL") || "http://localhost:8000";
    
    const client = twilio(this.accountSid, this.authToken);
    const call = await client.calls.create({
      from: this.phoneNumber,
      to: options.to,
      url: `${baseUrl}/webhooks/twilio/voice`,
      statusCallback: options.statusCallback ? `${baseUrl}${options.statusCallback}` : undefined,
      statusCallbackEvent: options.statusCallbackEvent || ['completed'],
      record: true,
      recordingStatusCallback: `${baseUrl}/webhooks/twilio/recording`,
    });
    
    return call.sid;
  }

  /**
   * Converts text to speech and returns audio URL
   * Note: For Twilio, TTS is handled via TwiML <Say> verb, not a separate API call
   */
  async textToSpeech(options: TTSOptions): Promise<string> {
    // For Twilio integration, TTS is done via TwiML <Say> verb in webhooks
    // This method returns TwiML that can be used in responses
    return `<Say voice="Polly.Joanna">${options.text}</Say>`;
  }

  /**
   * Converts speech audio to text
   * Note: For Twilio, STT is handled automatically via <Gather> verb with input="speech"
   */
  async speechToText(options: STTOptions): Promise<string> {
    // For Twilio integration, STT is done automatically via <Gather> verb
    // The transcription is provided in webhook callbacks as SpeechResult
    // This method is not directly called in production
    throw new Error(
      "STT is handled by Twilio <Gather> verb. Transcriptions come via webhooks.",
    );
  }

  /**
   * Updates an active call with new TwiML
   */
  async updateCall(callSid: string, twiml: string): Promise<void> {
    const client = twilio(this.accountSid, this.authToken);
    await client.calls(callSid).update({ twiml });
  }

  /**
   * Ends an active call
   */
  async endCall(callSid: string): Promise<void> {
    const client = twilio(this.accountSid, this.authToken);
    await client.calls(callSid).update({ status: 'completed' });
  }

  /**
   * Gets call recording URL
   */
  async getRecordingUrl(callSid: string): Promise<string | null> {
    const client = twilio(this.accountSid, this.authToken);
    const recordings = await client.recordings.list({ callSid, limit: 1 });
    if (recordings.length > 0) {
      return `https://api.twilio.com${recordings[0].uri}`;
    }
    return null;
  }

  /**
   * Sends an SMS message (direct)
   */
  async sendSMS(to: string, body: string): Promise<string> {
    const client = twilio(this.accountSid, this.authToken);
    const message = await client.messages.create({
      from: this.phoneNumber,
      to,
      body,
    });
    return message.sid;
  }

  /**
   * Sends a verification code using Twilio Verify
   */
  async sendVerificationCode(to: string): Promise<string> {
    if (!this.verifyServiceSid) {
      throw new Error("Twilio Verify Service SID not configured");
    }
    const client = twilio(this.accountSid, this.authToken);
    const verification = await client.verify.v2
      .services(this.verifyServiceSid)
      .verifications
      .create({ to, channel: 'sms' });
    return verification.sid;
  }

  /**
   * Verifies a code using Twilio Verify
   */
  async verifyCode(to: string, code: string): Promise<boolean> {
    if (!this.verifyServiceSid) {
      throw new Error("Twilio Verify Service SID not configured");
    }
    const client = twilio(this.accountSid, this.authToken);
    const verificationCheck = await client.verify.v2
      .services(this.verifyServiceSid)
      .verificationChecks
      .create({ to, code });
    return verificationCheck.status === 'approved';
  }
}

/**
 * Mock Twilio service for testing
 */
export class MockTwilioService {
  private callCounter = 0;
  private mockCalls: Map<string, MockCallState> = new Map();
  private mockTranscripts: Map<string, string> = new Map();
  private mockRecordings: Map<string, string> = new Map();

  /**
   * Initiates a mock outbound call
   */
  async initiateCall(options: CallOptions): Promise<string> {
    this.callCounter++;
    const callSid = `CA${this.callCounter.toString().padStart(32, "0")}`;

    this.mockCalls.set(callSid, {
      to: options.to,
      status: "initiated",
      startTime: new Date(),
    });

    return callSid;
  }

  /**
   * Mock TTS - returns a fake audio URL
   */
  async textToSpeech(options: TTSOptions): Promise<string> {
    // Return a mock URL that includes the text for debugging
    const encoded = encodeURIComponent(options.text.substring(0, 50));
    return `mock://tts/audio_${Date.now()}_${encoded}.mp3`;
  }

  /**
   * Mock STT - returns pre-configured transcript or default
   */
  async speechToText(options: STTOptions): Promise<string> {
    // Check if we have a mock transcript for this audio URL
    if (this.mockTranscripts.has(options.audioUrl)) {
      return this.mockTranscripts.get(options.audioUrl)!;
    }

    // Default mock transcript
    return "This is a mock transcription of the audio.";
  }

  /**
   * Ends a mock call
   */
  async endCall(callSid: string): Promise<void> {
    const call = this.mockCalls.get(callSid);
    if (call) {
      call.status = "completed";
      call.endTime = new Date();
    }
  }

  /**
   * Gets mock recording URL
   */
  async getRecordingUrl(callSid: string): Promise<string | null> {
    if (this.mockRecordings.has(callSid)) {
      return this.mockRecordings.get(callSid)!;
    }
    // Auto-generate mock recording URL
    return `mock://recordings/${callSid}.mp3`;
  }

  /**
   * Test helper: Set mock transcript for an audio URL
   */
  setMockTranscript(audioUrl: string, transcript: string) {
    this.mockTranscripts.set(audioUrl, transcript);
  }

  /**
   * Test helper: Set mock recording URL for a call
   */
  setMockRecording(callSid: string, recordingUrl: string) {
    this.mockRecordings.set(callSid, recordingUrl);
  }

  /**
   * Test helper: Get call state
   */
  getCallState(callSid: string): MockCallState | undefined {
    return this.mockCalls.get(callSid);
  }

  /**
   * Test helper: Simulate call status change
   */
  setCallStatus(callSid: string, status: string) {
    const call = this.mockCalls.get(callSid);
    if (call) {
      call.status = status;
    }
  }

  /**
   * Mock SMS - logs to console for testing
   */
  async sendSMS(to: string, body: string): Promise<string> {
    const messageSid = `SM${Date.now()}`;
    console.log(`[Mock SMS] To: ${to}, Body: ${body}`);
    return messageSid;
  }

  /**
   * Mock Verify - logs to console for testing
   */
  async sendVerificationCode(to: string): Promise<string> {
    const verificationSid = `VE${Date.now()}`;
    console.log(`[Mock Verify] Sending verification code to: ${to}`);
    return verificationSid;
  }

  /**
   * Mock Verify Check - always returns true for testing
   */
  async verifyCode(to: string, code: string): Promise<boolean> {
    console.log(`[Mock Verify] Checking code ${code} for: ${to}`);
    return true; // Always approve in mock mode
  }
}

interface MockCallState {
  to: string;
  status: string;
  startTime: Date;
  endTime?: Date;
}

/**
 * Hybrid Twilio service: Real calls/SMS but mocked Verify
 * Useful for development when you want to test calls but don't want to use Twilio Verify credits
 */
export class TwilioServiceWithMockVerify extends TwilioService {
  private mockCodes: Map<string, string> = new Map();

  /**
   * Mock Verify - generates a code, logs to console, and returns fake SID
   */
  async sendVerificationCode(to: string): Promise<string> {
    const verificationSid = `VE${Date.now()}`;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code for this phone number
    this.mockCodes.set(to, code);
    
    console.log(`\n========================================`);
    console.log(`[Mock Verify] 📱 Verification Code for ${to}`);
    console.log(`[Mock Verify] 🔢 CODE: ${code}`);
    console.log(`[Mock Verify] ⏰ Valid for 10 minutes`);
    console.log(`[Mock Verify] ℹ️  Using mock mode - any code will be accepted`);
    console.log(`========================================\n`);
    
    return verificationSid;
  }

  /**
   * Mock Verify Check - always returns true for testing
   */
  async verifyCode(to: string, code: string): Promise<boolean> {
    const storedCode = this.mockCodes.get(to);
    console.log(`\n[Mock Verify] Verifying code for ${to}`);
    console.log(`[Mock Verify] Provided code: ${code}`);
    console.log(`[Mock Verify] Generated code was: ${storedCode || 'N/A'}`);
    console.log(`[Mock Verify] ✅ Accepting (mock mode - all codes accepted)\n`);
    
    // Clean up the stored code
    this.mockCodes.delete(to);
    
    return true; // Always approve in mock mode
  }
}
