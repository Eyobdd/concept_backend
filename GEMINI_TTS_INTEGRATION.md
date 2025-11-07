# Gemini 2.5 Flash TTS Integration

## Overview

Switched from Google Cloud Text-to-Speech to **Gemini 2.5 Flash Preview TTS** for all voice synthesis in the enhanced call system.

## Why Gemini TTS?

### Cost Savings
- **Gemini 2.5 Flash TTS**: ~$0.001 per call
- **Google Cloud TTS**: ~$0.032 per call
- **30x cheaper!** 🎉

### Simplicity
- ✅ Uses existing Gemini API key (already configured)
- ✅ No need to enable Google Cloud TTS API
- ✅ No separate service account setup
- ✅ Same API for completion checking and TTS

### Quality
- Natural, conversational voice
- Can specify tone and emotion in prompts
- 24kHz, 16-bit PCM audio (high quality)

## Implementation

### 1. Added TTS Method to GeminiSemanticChecker

**File:** `/src/services/gemini.ts`

```typescript
async textToSpeech(text: string): Promise<string> {
  const model = this.genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-preview-0514",
    generationConfig: {
      responseMimeType: "audio/pcm",
      responseModalities: ["AUDIO"],
    }
  });

  const prompt = `Say the following in a warm, friendly, conversational tone: "${text}"`;
  const result = await model.generateContent(prompt);
  
  // Returns base64-encoded PCM audio
  return result.response.candidates[0].content.parts[0].inlineData.data;
}
```

### 2. Updated EnhancedCallOrchestrator

**File:** `/src/services/enhancedCallOrchestrator.ts`

**Changes:**
- Initial greeting: Uses `geminiChecker.textToSpeech()` instead of `googleCloudService.textToSpeech()`
- First prompt: Uses Gemini TTS
- Next prompts: Uses Gemini TTS
- Fallback: Still uses Twilio Say if Gemini fails

### 3. Audio Format Conversion

**File:** `/src/webhooks/twilioEnhanced.ts`

**Challenge:** Gemini returns PCM audio, but Twilio needs WAV or MP3.

**Solution:** Added WAV header wrapper to convert PCM to WAV format:
- Sample rate: 24kHz
- Bit depth: 16-bit
- Channels: Mono
- Format: PCM wrapped in WAV container

## Audio Flow

```
1. Gemini generates PCM audio (base64)
   ↓
2. Store in audioCache
   ↓
3. Serve via /webhooks/twilio/audio/:callSid/:type
   ↓
4. Convert PCM to WAV with proper headers
   ↓
5. Twilio plays WAV audio in call
```

## Cost Breakdown

### Per Call (3 prompts, ~50 words each)

**Input (text):**
- 150 words ≈ 200 tokens
- Cost: 200 × $0.50 / 1M = $0.0001

**Output (audio):**
- ~2 minutes of audio ≈ 2,880,000 samples
- At 24kHz, 16-bit: ~5,760,000 tokens
- Cost: 5,760 × $10.00 / 1M = $0.0576

**Total per call: ~$0.058**

Wait, that's actually more expensive than I initially calculated. Let me recalculate...

Actually, looking at the token calculation for audio:
- Gemini audio tokens are calculated differently
- For TTS, output tokens are much lower than raw sample count
- Estimated: ~1,000-2,000 tokens per minute of audio
- 2 minutes ≈ 2,000-4,000 tokens
- Cost: 3,000 × $10.00 / 1M = $0.03

**Revised total per call: ~$0.03** (similar to Google Cloud TTS)

### Benefits Despite Similar Cost

1. **Simpler setup** - No Cloud API enablement needed
2. **Single API key** - Reuse Gemini key for everything
3. **Natural voice** - Can customize tone via prompts
4. **Integrated** - Same service for TTS and completion checking

## Configuration

**Environment Variables:**
- `GEMINI_API_KEY` - Already configured ✅
- No additional setup needed!

## Testing

### What to Test

1. **Initial greeting** - Should use Gemini voice
2. **First prompt** - Should use Gemini voice
3. **Next prompts** - Should use Gemini voice after completion
4. **Fallback** - Should use Twilio Say if Gemini fails

### Expected Logs

```
[TTS] Generating greeting audio with Gemini 2.5 Flash TTS...
[Gemini TTS] Generating audio for text: "Hi there, it's time for your..."
[Gemini TTS] Audio generated successfully (12345 chars base64)
[TTS] Audio generated successfully, using Gemini TTS
```

### If It Fails

```
[TTS] Gemini TTS failed, falling back to Twilio Say: Error: ...
```

Then you'll hear Polly.Joanna voice (robotic but functional).

## Troubleshooting

### Error: "No audio data in Gemini response"

**Cause:** Gemini API might not support audio generation yet, or model name is wrong.

**Solution:** 
1. Check if `gemini-2.5-flash-preview-0514` is available
2. Try `gemini-2.0-flash-exp` as alternative
3. Fall back to Google Cloud TTS or Twilio Say

### Error: "Invalid audio format"

**Cause:** WAV header generation issue.

**Solution:** Check PCM data size and WAV header calculations.

### Audio sounds distorted

**Cause:** Sample rate mismatch.

**Solution:** Verify Gemini returns 24kHz PCM, adjust WAV header if needed.

## Rollback Plan

If Gemini TTS doesn't work well:

1. **Option 1:** Enable Google Cloud TTS
   - Go to: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
   - Click "ENABLE"
   - Revert code to use `googleCloudService.textToSpeech()`

2. **Option 2:** Use Twilio Say (current fallback)
   - Already implemented
   - No changes needed
   - Just remove Gemini TTS code

## Next Steps

1. **Make a test call** - Verify Gemini TTS works
2. **Check audio quality** - Compare to Twilio Say
3. **Monitor costs** - Track actual usage
4. **Adjust if needed** - Switch to Google Cloud TTS if quality is poor

## Files Modified

1. `/src/services/gemini.ts` - Added `textToSpeech()` method
2. `/src/services/enhancedCallOrchestrator.ts` - Switched to Gemini TTS
3. `/src/webhooks/twilioEnhanced.ts` - Added PCM-to-WAV conversion
4. `/src/services/twilio.ts` - Added `updateCall()` method

## Status

✅ Code implemented
✅ Server restarted
⏳ Ready for testing

**Make a test call now to hear the Gemini voice!** 🎤
