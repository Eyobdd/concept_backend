/**
 * Google Cloud Speech-to-Text and Text-to-Speech Service
 * 
 * Provides high-quality STT and TTS using Google Cloud APIs.
 * Integrates with Twilio for phone calls while using Google's superior models.
 */

import { TextToSpeechClient } from "npm:@google-cloud/text-to-speech";
import { SpeechClient } from "npm:@google-cloud/speech";
import { protos } from "npm:@google-cloud/speech";

export interface GoogleCloudConfig {
  apiKey?: string;
  projectId?: string;
  // For service account auth, set GOOGLE_APPLICATION_CREDENTIALS env var
}

export interface GoogleTTSOptions {
  text: string;
  languageCode?: string; // Default: en-US
  voiceName?: string; // Default: en-US-Neural2-F (female) or en-US-Neural2-D (male)
  speakingRate?: number; // 0.25 to 4.0, default 1.0
  pitch?: number; // -20.0 to 20.0, default 0.0
}

export interface GoogleSTTOptions {
  audioContent?: Buffer; // For non-streaming
  languageCode?: string; // Default: en-US
  sampleRateHertz?: number; // Default: 8000 (Twilio's rate)
  encoding?: "MULAW" | "LINEAR16"; // Default: MULAW for Twilio
  enableAutomaticPunctuation?: boolean; // Default: true
  model?: string; // Default: "phone_call" (optimized for phone audio)
}

export interface StreamingSTTConfig {
  languageCode?: string;
  sampleRateHertz?: number;
  encoding?: "MULAW" | "LINEAR16";
  enableAutomaticPunctuation?: boolean;
  model?: string;
  interimResults?: boolean; // Get partial results
  singleUtterance?: boolean; // Stop after first utterance
}

/**
 * Google Cloud STT/TTS Service
 */
export class GoogleCloudService {
  private ttsClient: TextToSpeechClient;
  private sttClient: SpeechClient;
  private config: GoogleCloudConfig;

  constructor(config: GoogleCloudConfig = {}) {
    this.config = config;
    
    // Initialize clients
    // If GOOGLE_APPLICATION_CREDENTIALS is set, it will use service account
    // Otherwise, will use API key if provided
    const clientConfig = config.apiKey ? { apiKey: config.apiKey } : {};
    
    this.ttsClient = new TextToSpeechClient(clientConfig);
    this.sttClient = new SpeechClient(clientConfig);
  }

  /**
   * Converts text to speech and returns audio content
   * @returns Base64-encoded audio content (MP3 format)
   */
  async textToSpeech(options: GoogleTTSOptions): Promise<string> {
    // Use REST API instead of gRPC client for better Deno compatibility
    if (this.config.apiKey) {
      return this.textToSpeechREST(options);
    }
    
    // Fallback to gRPC client if using service account
    const request = {
      input: { text: options.text },
      voice: {
        languageCode: options.languageCode || "en-US",
        name: options.voiceName || "en-US-Neural2-F", // Natural female voice
      },
      audioConfig: {
        audioEncoding: "MP3" as const,
        speakingRate: options.speakingRate || 1.0,
        pitch: options.pitch || 0.0,
      },
    };

    const [response] = await this.ttsClient.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error("No audio content returned from TTS");
    }

    // Return base64-encoded audio
    return Buffer.from(response.audioContent as Uint8Array).toString("base64");
  }

  /**
   * Text-to-Speech using REST API (more reliable in Deno)
   */
  private async textToSpeechREST(options: GoogleTTSOptions): Promise<string> {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.config.apiKey}`;
    
    const requestBody = {
      input: { text: options.text },
      voice: {
        languageCode: options.languageCode || "en-US",
        name: options.voiceName || "en-US-Neural2-F",
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: options.speakingRate || 1.0,
        pitch: options.pitch || 0.0,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google TTS API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      throw new Error("No audio content returned from TTS");
    }

    return data.audioContent; // Already base64-encoded
  }

  /**
   * Converts speech audio to text (non-streaming)
   * @returns Transcribed text
   */
  async speechToText(options: GoogleSTTOptions): Promise<string> {
    if (!options.audioContent) {
      throw new Error("Audio content is required for STT");
    }

    const audio = {
      content: options.audioContent.toString("base64"),
    };

    const config = {
      encoding: options.encoding === "LINEAR16" 
        ? protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16
        : protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MULAW,
      sampleRateHertz: options.sampleRateHertz || 8000,
      languageCode: options.languageCode || "en-US",
      enableAutomaticPunctuation: options.enableAutomaticPunctuation ?? true,
      model: options.model || "phone_call",
      useEnhanced: true, // Use enhanced model for better accuracy
    };

    const request = {
      audio,
      config,
    };

    const [response] = await this.sttClient.recognize(request);
    
    if (!response.results || response.results.length === 0) {
      return ""; // No speech detected
    }

    // Combine all transcripts
    const transcripts = response.results
      .map(result => result.alternatives?.[0]?.transcript || "")
      .filter(t => t.length > 0);

    return transcripts.join(" ");
  }

  /**
   * Creates a streaming STT recognizer
   * Returns a writable stream that accepts audio chunks
   */
  createStreamingSTT(
    config: StreamingSTTConfig,
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError?: (error: Error) => void,
  ) {
    const recognizeStream = this.sttClient
      .streamingRecognize({
        config: {
          encoding: config.encoding === "LINEAR16"
            ? protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16
            : protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MULAW,
          sampleRateHertz: config.sampleRateHertz || 8000,
          languageCode: config.languageCode || "en-US",
          enableAutomaticPunctuation: config.enableAutomaticPunctuation ?? true,
          model: config.model || "phone_call",
          useEnhanced: true,
        },
        interimResults: config.interimResults ?? true,
        singleUtterance: config.singleUtterance ?? false,
      })
      .on("data", (data: any) => {
        const result = data.results?.[0];
        if (result) {
          const transcript = result.alternatives?.[0]?.transcript || "";
          const isFinal = result.isFinal || false;
          
          if (transcript) {
            onTranscript(transcript, isFinal);
          }
        }
      })
      .on("error", (error: Error) => {
        console.error("[GoogleCloud STT] Stream error:", error);
        if (onError) {
          onError(error);
        }
      });

    return recognizeStream;
  }

  /**
   * Generates a TwiML-compatible audio URL for Google TTS
   * Uses <Play> verb with a data URI or hosted URL
   */
  async generateTwiMLAudio(text: string, options?: Partial<GoogleTTSOptions>): Promise<string> {
    const audioBase64 = await this.textToSpeech({
      text,
      ...options,
    });

    // For TwiML, we need a publicly accessible URL
    // Option 1: Return data URI (may not work with all Twilio features)
    // Option 2: Upload to cloud storage and return URL (recommended for production)
    
    // For now, return the base64 data - caller should handle hosting
    return audioBase64;
  }
}

/**
 * Mock Google Cloud service for testing
 */
export class MockGoogleCloudService {
  private mockTranscripts: Map<string, string> = new Map();
  private mockAudio: Map<string, string> = new Map();

  /**
   * Mock TTS - returns fake base64 audio
   */
  async textToSpeech(options: GoogleTTSOptions): Promise<string> {
    // Return a mock base64 string
    const mockAudio = `MOCK_AUDIO_${options.text.substring(0, 20)}`;
    return Buffer.from(mockAudio).toString("base64");
  }

  /**
   * Mock STT - returns pre-configured transcript or default
   */
  async speechToText(options: GoogleSTTOptions): Promise<string> {
    if (!options.audioContent) {
      return "";
    }

    const audioKey = options.audioContent.toString("base64");
    if (this.mockTranscripts.has(audioKey)) {
      return this.mockTranscripts.get(audioKey)!;
    }

    return "Mock transcription of audio";
  }

  /**
   * Mock streaming STT
   */
  createStreamingSTT(
    config: StreamingSTTConfig,
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError?: (error: Error) => void,
  ) {
    // Return a mock writable stream
    return {
      write: (chunk: Buffer) => {
        // Simulate transcription after a short delay
        setTimeout(() => {
          onTranscript("Mock streaming transcript", false);
          setTimeout(() => {
            onTranscript("Mock streaming transcript complete", true);
          }, 500);
        }, 100);
      },
      end: () => {},
      on: () => {},
    };
  }

  /**
   * Mock TwiML audio generation
   */
  async generateTwiMLAudio(text: string, options?: Partial<GoogleTTSOptions>): Promise<string> {
    return this.textToSpeech({ text, ...options });
  }

  /**
   * Test helper: Set mock transcript for audio content
   */
  setMockTranscript(audioContent: Buffer, transcript: string) {
    const audioKey = audioContent.toString("base64");
    this.mockTranscripts.set(audioKey, transcript);
  }

  /**
   * Test helper: Set mock audio for text
   */
  setMockAudio(text: string, audioBase64: string) {
    this.mockAudio.set(text, audioBase64);
  }
}
