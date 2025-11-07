# Enhanced Call System Implementation Summary

## What Changed

Replaced Twilio's built-in STT/TTS with Google Cloud's superior speech processing while keeping Twilio for call control.

## Architecture

### Before (Twilio-only)
```
User → Twilio (all-in-one) → Webhooks → Database
       ↑ STT, TTS, Call Control
```

### After (Hybrid)
```
User → Twilio (call control) → Webhooks → Database
       ↓ Audio Stream (WebSocket)
       Your Server
       ├─→ Google Cloud STT (transcription)
       ├─→ Google Cloud TTS (voice synthesis)  
       └─→ Gemini (completion checking)
```

## New Files Created

### 1. `/src/services/googleCloud.ts`
Google Cloud STT/TTS service wrapper with:
- `textToSpeech()` - Converts text to natural speech (Neural2 voices)
- `speechToText()` - Transcribes audio with phone_call model
- `createStreamingSTT()` - Real-time transcription with partial results
- Mock implementation for testing

### 2. `/src/services/enhancedCallOrchestrator.ts`
Enhanced orchestrator that:
- Uses Google Cloud for STT/TTS instead of Twilio's built-in
- Manages WebSocket media streams from Twilio
- Implements real-time transcription with pause detection
- Uses Gemini for semantic completion checking (5-second pause threshold)
- Maintains same conceptual interface as original orchestrator

### 3. `/src/webhooks/twilioEnhanced.ts`
New webhook handlers that:
- Return TwiML with media streaming enabled
- Handle WebSocket connections for audio streaming
- Process real-time transcription
- Use Google TTS for prompts and greetings
- Support user name pronunciation from Profile concept

### 4. `/GOOGLE_CLOUD_SETUP.md`
Complete setup guide with:
- Step-by-step Google Cloud configuration
- Environment variable documentation
- Cost analysis and comparison
- Voice customization options
- Troubleshooting guide
- Production checklist

## Key Features

### 1. High-Quality Transcription
- Google Cloud's phone_call model optimized for phone audio
- Real-time streaming with partial results
- Automatic punctuation
- Better noise handling than Twilio

### 2. Natural Voice Synthesis
- Neural2 voices sound more human
- Configurable speaking rate and pitch
- Multiple voice options (male/female, different tones)
- Default: `en-US-Neural2-F` (warm, friendly female voice)

### 3. Intelligent Pause Detection
- Monitors speech in real-time
- 5-second pause threshold (configurable)
- Gemini LLM checks semantic completion
- Only advances when user truly finished responding

### 4. User Personalization
- Uses name pronunciation from Profile concept
- Greeting: "Hello [name pronunciation]. This is your daily reflection call..."
- Closing: "Thank you for completing your reflection. Have a great day!"

### 5. Conceptual Integrity Maintained
- No changes to frontend
- Concepts remain unchanged (`PhoneCall`, `ReflectionSession`, etc.)
- Service layer handles all complexity
- Can fallback to original Twilio webhooks if needed

## Cost Analysis

| Component | Cost/min | Notes |
|-----------|----------|-------|
| Google Cloud STT | $0.036 | phone_call model |
| Google Cloud TTS | $0.008 | Neural2 voices, ~5 prompts |
| Twilio Voice | $0.013 | Call connectivity |
| **Total** | **$0.057** | **~$3.42/hour** |

**Your $50 budget = ~877 minutes (14.6 hours) of calls**

Compare to:
- Twilio only: $0.013/min (~3,846 min with $50)
- Gemini Live: $1.60/min (~31 min with $50)

## Environment Variables Needed

```bash
# Google Cloud (choose one auth method)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# OR
GOOGLE_CLOUD_API_KEY=your-api-key

# Existing (keep these)
GEMINI_API_KEY=your-gemini-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
ENCRYPTION_KEY=your-encryption-key
BASE_URL=https://your-domain.com
```

## How to Enable

### Option 1: Replace Existing Webhooks (Recommended)

In your main server file:

```typescript
// Replace this:
// import { createTwilioWebhooks } from "./webhooks/twilio.ts";

// With this:
import { createEnhancedTwilioWebhooks } from "./webhooks/twilioEnhanced.ts";

// Then use it:
const twilioRoutes = createEnhancedTwilioWebhooks(db);
app.route("/webhooks/twilio", twilioRoutes);
```

### Option 2: Run Side-by-Side (For Testing)

```typescript
import { createTwilioWebhooks } from "./webhooks/twilio.ts";
import { createEnhancedTwilioWebhooks } from "./webhooks/twilioEnhanced.ts";

// Old webhooks
const twilioRoutes = createTwilioWebhooks(db);
app.route("/webhooks/twilio-old", twilioRoutes);

// New enhanced webhooks
const enhancedRoutes = createEnhancedTwilioWebhooks(db);
app.route("/webhooks/twilio", enhancedRoutes);
```

## Call Flow

### 1. Call Initiation
```
Frontend → POST /api/calls/initiate
         → Server creates PhoneCall + ReflectionSession
         → Twilio initiates call
```

### 2. Call Answered
```
Twilio → POST /webhooks/twilio/voice
       → Server returns TwiML:
         - Start media streaming (WebSocket)
         - Play greeting with Google TTS
         - Play first prompt with Google TTS
         - Wait for user response
```

### 3. User Speaks
```
User speaks → Twilio streams audio (WebSocket)
            → Google Cloud STT transcribes in real-time
            → Partial results accumulated
            → Final results stored in PhoneCall.currentResponseBuffer
```

### 4. Pause Detection
```
After 5 seconds of silence:
  → Gemini checks: "Is this response complete?"
  → If yes (confidence > 0.6):
    - Save response to ReflectionSession
    - Play next prompt OR end call
  → If no:
    - Keep waiting for more speech
```

### 5. Call Completion
```
All prompts answered:
  → Mark ReflectionSession as COMPLETED
  → Play closing message with Google TTS
  → End call
  → Save encrypted recording
```

## Testing

### With Mocks (No API Calls)
```bash
USE_MOCKS=true deno run start
```

### With Real APIs
```bash
# Set up Google Cloud credentials first
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
deno run start
```

## Known Limitations & TODOs

### 1. Audio Playback Mid-Call
Currently, prompts are played via Twilio's `<Say>` as fallback. To use Google TTS audio:
- **Option A**: Host audio files on CDN, use `<Play>` in TwiML
- **Option B**: Inject audio into media stream (more complex)

**TODO**: Implement audio hosting/playback for Google TTS

### 2. WebSocket Connection
Requires publicly accessible server (not localhost). Use ngrok for local testing:
```bash
ngrok http 8000
# Update BASE_URL to ngrok URL
```

### 3. Latency Considerations
- Google Cloud STT: ~100-300ms latency
- Network: Depends on server location
- Total: Should be imperceptible (<500ms)

**TODO**: Monitor latency in production, optimize if needed

### 4. Error Handling
Current implementation has basic error handling. Consider adding:
- Automatic fallback to Twilio STT/TTS if Google Cloud fails
- Retry logic for transient errors
- Better logging and monitoring

**TODO**: Implement robust error handling and fallback

## Advantages Over Original System

✅ **Better transcription accuracy** - Google Cloud's phone_call model
✅ **More natural voice** - Neural2 voices vs Polly
✅ **Smarter completion detection** - Real-time + Gemini
✅ **User personalization** - Name pronunciation support
✅ **Cost-effective** - 10x cheaper than Gemini Live
✅ **Conceptually clean** - No frontend changes, concepts unchanged
✅ **Flexible** - Easy to customize voice, pause threshold, etc.

## Disadvantages vs Original System

⚠️ **More complex** - WebSocket handling, streaming audio
⚠️ **Higher cost** - $0.057/min vs $0.013/min (but better quality)
⚠️ **More dependencies** - Google Cloud SDK, additional APIs
⚠️ **Requires public server** - WebSocket needs accessible endpoint

## Migration Path

1. **Phase 1**: Set up Google Cloud project and credentials
2. **Phase 2**: Test with mocks locally
3. **Phase 3**: Deploy to staging with real APIs
4. **Phase 4**: Run A/B test (old vs new webhooks)
5. **Phase 5**: Full migration once quality verified

## Support

For issues or questions:
1. Check `GOOGLE_CLOUD_SETUP.md` for setup help
2. Review error logs for specific issues
3. Test with `USE_MOCKS=true` to isolate API problems
4. Verify environment variables are set correctly
