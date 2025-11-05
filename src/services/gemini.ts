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

    const systemPrompt = `You are a semantic completion checker for a reflection journaling system. 
Your job is to determine if a user has finished answering a reflection prompt.

Rules:
1. The user is speaking their response (speech-to-text), so expect natural speech patterns
2. A response is complete if it meaningfully addresses the prompt
3. Brief responses (1-2 sentences) can be complete if they answer the question
4. Incomplete thoughts, trailing off, or clear mid-sentence stops indicate incompleteness
5. Consider the pause duration: longer pauses (>3s) suggest the user is done
6. Don't require elaborate responses - simple, genuine answers are valid

Respond with a JSON object:
{
  "isComplete": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    const userPrompt = `Prompt: "${prompt}"

User's response so far: "${userResponse}"

Pause duration: ${pauseDurationSeconds} seconds

Is this response semantically complete?`;

    try {
      const result = await model.generateContent([
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: userPrompt }] },
      ]);

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
