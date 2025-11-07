/**
 * Gemini LLM Service for Semantic Completion Checking
 * 
 * Uses Google's Gemini 2.5-flash model to determine if a user has
 * semantically completed their response to a reflection prompt.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiConfig {
  apiKey: string;
  model?: string; // Default: "gemini-2.5-flash"
}

export interface CompletionCheckResult {
  isComplete: boolean;
  confidence: number; // 0-1 scale
  reasoning?: string; // Optional explanation for debugging
}

export interface RatingExtractionResult {
  rating: number | null; // -2 to 2, or null if cannot extract
  confidence: number; // 0-1 scale
  reasoning?: string; // Optional explanation for debugging
}

/**
 * Service for checking semantic completion of user responses
 */
export class GeminiSemanticChecker {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(config: GeminiConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || "gemini-2.5-flash";
  }

  /**
   * Checks if a user's response semantically completes the given prompt.
   * 
   * @param prompt The reflection prompt that was asked
   * @param userResponse The accumulated user response so far
   * @param pauseDurationSeconds How long the user has been silent
   * @returns CompletionCheckResult indicating if response is complete
   */
  async checkCompletion(
    prompt: string,
    userResponse: string,
    pauseDurationSeconds: number,
  ): Promise<CompletionCheckResult> {
    const model = this.genAI.getGenerativeModel({ model: this.model });

    const systemPrompt = `You are analyzing spoken responses during a phone-based reflection session.

Your task: Determine if the user has semantically completed their response to a prompt.

Rules:
1. The user is speaking their response (speech-to-text), so expect natural speech patterns, filler words, and imperfect grammar
2. A response is complete if it meaningfully addresses the prompt, even if brief
3. Brief responses (1-2 sentences) can be complete if they answer the question
4. Trailing filler words like "um", "uh", "and", "so", "yeah" at the END suggest MORE is coming - mark as incomplete
5. BUT if the response has substance and just ends with a filler, it may still be complete (use moderate confidence 0.6-0.8)
6. Pause duration helps: pauses >6s suggest the user is done speaking
7. Mark complete with confidence 0.75+ if the response addresses the prompt and doesn't end with trailing fillers
8. Only mark incomplete if clearly unfinished or ends with obvious continuation words

Return ONLY valid JSON in this exact format:
{"isComplete": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;

    const userPrompt = `Prompt: "${prompt}"

User's response so far: "${userResponse}"

Pause duration: ${pauseDurationSeconds} seconds

Is this response semantically complete?`;

    try {
      const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt);

      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback: if no JSON, use heuristics
        return this.fallbackCompletion(userResponse, pauseDurationSeconds);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isComplete: parsed.isComplete || false,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      // Fallback to heuristics on error
      return this.fallbackCompletion(userResponse, pauseDurationSeconds);
    }
  }

  /**
   * Fallback heuristic-based completion check when API fails
   */
  private fallbackCompletion(
    userResponse: string,
    pauseDurationSeconds: number,
  ): CompletionCheckResult {
    // Simple heuristics:
    // - If pause > 5s and response has content, likely complete
    // - If response ends with sentence-ending punctuation and pause > 3s, likely complete
    // - Otherwise, incomplete

    const hasContent = userResponse.trim().length > 10;
    const endsWithPunctuation = /[.!?]$/.test(userResponse.trim());
    const longPause = pauseDurationSeconds > 5;
    const mediumPause = pauseDurationSeconds > 3;

    if (longPause && hasContent) {
      return {
        isComplete: true,
        confidence: 0.7,
        reasoning: "Fallback: Long pause with content",
      };
    }

    if (endsWithPunctuation && mediumPause && hasContent) {
      return {
        isComplete: true,
        confidence: 0.6,
        reasoning: "Fallback: Sentence ending with medium pause",
      };
    }

    return {
      isComplete: false,
      confidence: 0.5,
      reasoning: "Fallback: Insufficient indicators of completion",
    };
  }

  /**
   * Extracts a day rating from a user's spoken response using structured output.
   * 
   * @param userResponse The user's spoken response to the rating prompt
   * @returns RatingExtractionResult with extracted rating (-2 to 2) or null
   */
  async extractRating(userResponse: string): Promise<RatingExtractionResult> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.model,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            rating: {
              type: "integer",
              description: "The extracted rating from -2 to 2, or null if cannot extract",
              nullable: true,
              minimum: -2,
              maximum: 2
            },
            confidence: {
              type: "number",
              description: "Confidence in the extraction from 0.0 to 1.0",
              minimum: 0,
              maximum: 1
            },
            reasoning: {
              type: "string",
              description: "Brief explanation of the extraction"
            }
          },
          required: ["rating", "confidence", "reasoning"]
        }
      }
    });

    const systemPrompt = `You are extracting a day rating from a user's spoken response during a phone reflection session.

The user was asked: "On a scale from negative 2 to positive 2, using whole numbers only, how would you rate your day?"

Valid ratings: -2, -1, 0, 1, 2

Your task: Extract the rating from their response. The user may say it in various ways:
- Numeric: "2", "negative 1", "zero"
- Word form: "two", "negative two", "minus one"
- In context: "I'd say it was a 1", "probably negative 2", "it was a zero kind of day"

Rules:
1. Look for any clear indication of a rating from -2 to 2
2. If the response is ambiguous or doesn't contain a rating, return null
3. Prefer explicit numbers over implied sentiment
4. Return high confidence (0.8+) only if the rating is clearly stated
5. Return null if you're not reasonably confident (< 0.5)

Extract the rating from the following response:`;

    try {
      const result = await model.generateContent(systemPrompt + "\n\n" + userResponse);
      const response = result.response;
      const text = response.text();

      // Parse JSON response (should be structured output)
      const parsed = JSON.parse(text);
      
      // Validate the rating is within bounds
      if (parsed.rating !== null && (parsed.rating < -2 || parsed.rating > 2)) {
        console.warn(`[Gemini] Invalid rating ${parsed.rating} extracted, setting to null`);
        parsed.rating = null;
        parsed.confidence = 0;
      }

      return {
        rating: parsed.rating,
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || "No reasoning provided",
      };
    } catch (error) {
      console.error("[Gemini] Error extracting rating:", error);
      // Return null rating on error
      return {
        rating: null,
        confidence: 0,
        reasoning: `Error during extraction: ${error}`,
      };
    }
  }

  /**
   * Generates speech audio from text using Gemini 2.5 Flash Preview TTS
   * 
   * @param text The text to convert to speech
   * @param voice Optional voice configuration (default: natural female voice)
   * @returns Base64-encoded audio data (PCM format, 24kHz, 16-bit)
   */
  async textToSpeech(text: string, voiceName: string = "Kore"): Promise<string> {
    try {
      console.log(`[Gemini TTS] Generating audio for text: "${text.substring(0, 50)}..."`);
      console.log(`[Gemini TTS] Using voice: ${voiceName}`);
      
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-preview-tts"
      });

      // Use the correct API format from the documentation
      const result = await model.generateContent({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName,
              },
            },
          },
        },
      });
      
      // Get the audio data from the response
      const audioData = result.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!audioData) {
        throw new Error("No audio data in Gemini TTS response");
      }
      
      console.log(`[Gemini TTS] Audio generated successfully (${audioData.length} chars base64)`);
      
      return audioData;
    } catch (error) {
      console.error(`[Gemini TTS] Error generating audio:`, error);
      throw error;
    }
  }
}

/**
 * Mock implementation for testing without API calls
 */
export class MockGeminiSemanticChecker {
  private responses: Map<string, CompletionCheckResult> = new Map();

  /**
   * Set a mock response for a specific prompt
   */
  setMockResponse(prompt: string, result: CompletionCheckResult) {
    this.responses.set(prompt, result);
  }

  /**
   * Mock completion check - returns pre-configured result or default
   */
  async checkCompletion(
    promptText: string,
    userResponse: string,
    pauseDuration: number,
  ): Promise<CompletionCheckResult> {
    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      
      const prompt = `You are analyzing a user's spoken response during a phone-based reflection session.

Prompt: "${promptText}"
User's response so far: "${userResponse}"
Pause duration: ${pauseDuration} seconds

Determine if the user has completed their thought. Consider:
- Natural speech patterns and pauses
- Semantic completeness of the response
- Whether the response addresses the prompt

Respond ONLY with valid JSON in this exact format:
{"isComplete": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Parse JSON response
      const parsed = JSON.parse(responseText);
      return {
        isComplete: parsed.isComplete,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error("[Gemini] Error checking completion:", error);
      // Fallback to heuristic if API fails
      return this.fallbackCompletion(userResponse, pauseDuration);
    }
  }

  private fallbackCompletion(
    userResponse: string,
    pauseDurationSeconds: number,
  ): CompletionCheckResult {
    // Simple heuristics:
    // - If pause > 5s and response has content, likely complete
    // - If response ends with sentence-ending punctuation and pause > 3s, likely complete
    // - Otherwise, incomplete

    const hasContent = userResponse.trim().length > 10;
    const endsWithPunctuation = /[.!?]$/.test(userResponse.trim());
    const longPause = pauseDurationSeconds > 5;
    const mediumPause = pauseDurationSeconds > 3;

    if (longPause && hasContent) {
      return {
        isComplete: true,
        confidence: 0.7,
        reasoning: "Fallback: Long pause with content",
      };
    }

    if (endsWithPunctuation && mediumPause && hasContent) {
      return {
        isComplete: true,
        confidence: 0.6,
        reasoning: "Fallback: Sentence ending with medium pause",
      };
    }

    return {
      isComplete: false,
      confidence: 0.5,
      reasoning: "Fallback: Insufficient indicators of completion",
    };
  }
}
