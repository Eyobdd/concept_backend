/**
 * Deepgram Speech-to-Text Service
 * 
 * Provides real-time transcription using Deepgram's WebSocket API.
 * Works reliably in Deno (unlike Google Cloud's gRPC).
 */

export interface DeepgramConfig {
  apiKey: string;
}

export interface DeepgramSTTOptions {
  model?: string; // Default: "nova-2" (latest, best accuracy)
  language?: string; // Default: "en-US"
  punctuate?: boolean; // Default: true
  interimResults?: boolean; // Default: true
  encoding?: string; // Default: "mulaw" for Twilio
  sampleRate?: number; // Default: 8000 for Twilio
  channels?: number; // Default: 1 (mono)
}

/**
 * Deepgram STT Service using WebSocket API
 */
export class DeepgramService {
  private apiKey: string;

  constructor(config: DeepgramConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Creates a streaming STT connection via WebSocket
   * Returns a WebSocket that accepts audio chunks
   */
  createStreamingSTT(
    options: DeepgramSTTOptions,
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError?: (error: Error) => void,
  ): WebSocket {
    // Build query parameters
    const params = new URLSearchParams({
      model: options.model || "nova-2",
      language: options.language || "en-US",
      punctuate: String(options.punctuate ?? true),
      interim_results: String(options.interimResults ?? true),
      encoding: options.encoding || "mulaw",
      sample_rate: String(options.sampleRate || 8000),
      channels: String(options.channels || 1),
    });

    // Create WebSocket connection
    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
    const ws = new WebSocket(url, {
      headers: {
        "Authorization": `Token ${this.apiKey}`,
      },
    });

    ws.addEventListener("open", () => {
      console.log("[Deepgram] WebSocket connection opened");
    });

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Deepgram sends different message types
        if (data.type === "Results") {
          const result = data.channel?.alternatives?.[0];
          if (result && result.transcript) {
            const transcript = result.transcript;
            const isFinal = data.is_final || false;
            
            if (transcript.trim()) {
              onTranscript(transcript, isFinal);
            }
          }
        } else if (data.type === "Metadata") {
          console.log("[Deepgram] Metadata received:", data);
        }
      } catch (error) {
        console.error("[Deepgram] Error parsing message:", error);
        if (onError) {
          onError(error as Error);
        }
      }
    });

    ws.addEventListener("error", (event) => {
      console.error("[Deepgram] WebSocket error:", event);
      if (onError) {
        onError(new Error("Deepgram WebSocket error"));
      }
    });

    ws.addEventListener("close", (event) => {
      console.log(`[Deepgram] WebSocket closed: ${event.code} ${event.reason}`);
    });

    return ws;
  }

  /**
   * Sends audio chunk to Deepgram WebSocket
   */
  sendAudio(ws: WebSocket, audioChunk: Uint8Array): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(audioChunk);
    }
  }

  /**
   * Closes the Deepgram WebSocket connection
   */
  closeStream(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      // Send close message to Deepgram
      ws.send(JSON.stringify({ type: "CloseStream" }));
      ws.close();
    }
  }
}

/**
 * Mock Deepgram Service for testing
 */
export class MockDeepgramService {
  createStreamingSTT(
    _options: DeepgramSTTOptions,
    _onTranscript: (transcript: string, isFinal: boolean) => void,
    _onError?: (error: Error) => void,
  ): WebSocket {
    console.log("[MockDeepgram] Creating mock STT stream");
    // Return a mock WebSocket-like object
    return {
      readyState: WebSocket.OPEN,
      send: () => {},
      close: () => {},
      addEventListener: () => {},
    } as unknown as WebSocket;
  }

  sendAudio(_ws: WebSocket, _audioChunk: Uint8Array): void {
    // No-op for mock
  }

  closeStream(_ws: WebSocket): void {
    // No-op for mock
  }
}
