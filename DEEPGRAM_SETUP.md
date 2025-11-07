# Deepgram Integration Setup

## ✅ What We Just Did

Replaced Google Cloud Speech-to-Text with Deepgram for real-time transcription.

### Why Deepgram?
- ✅ **Works in Deno** - Uses WebSocket (not gRPC)
- ✅ **$200 free credits** - No credit card required
- ✅ **Cheaper** - $0.0125/min vs Google's $0.024/min
- ✅ **Better accuracy** - Nova-2 model optimized for phone audio
- ✅ **Real-time streaming** - Low latency transcription
- ✅ **No TLS issues** - Reliable WebSocket connection

## Setup Steps

### 1. Sign Up for Deepgram

1. Go to: https://console.deepgram.com/signup
2. Sign up (no credit card required)
3. Get $200 in free credits automatically

### 2. Get API Key

1. Go to: https://console.deepgram.com/project/default/settings/api-keys
2. Click "Create a New API Key"
3. Give it a name (e.g., "Zien Backend")
4. Copy the API key

### 3. Add to .env

Add this line to your `.env` file:

```bash
DEEPGRAM_API_KEY=your_api_key_here
```

Your `.env` should now have:
```bash
# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Google Cloud (for TTS only)
GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0810467887
GOOGLE_APPLICATION_CREDENTIALS=./google_app_key.json

# Deepgram (for STT)
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Gemini
GEMINI_API_KEY=...

# Other
ENCRYPTION_KEY=...
MONGODB_URL=...
BASE_URL=...
```

### 4. Restart Services

```bash
./stop-all.sh
./start-all.sh
```

## What Changed

### Files Modified

1. **`/src/services/deepgram.ts`** - New Deepgram service (WebSocket-based)
2. **`/src/services/enhancedCallOrchestrator.ts`** - Uses Deepgram instead of Google Cloud STT
3. **`/src/webhooks/twilioEnhanced.ts`** - Initializes Deepgram service

### Architecture

**Before:**
```
Twilio Call → Google Cloud STT (gRPC ❌) → Transcription
           → Google Cloud TTS (REST ✅) → Audio
```

**After:**
```
Twilio Call → Deepgram STT (WebSocket ✅) → Transcription
           → Google Cloud TTS (REST ✅) → Audio
```

## Testing

After adding your Deepgram API key and restarting, make a test call:

### Expected Logs

```
[Deepgram] Creating streaming STT connection...
[Deepgram] WebSocket connection opened
[TTS] Generating greeting audio with Google Cloud TTS...
[TTS] Audio generated successfully, using Google TTS
[MediaStream] Stream started: MZxxx for call CAxxxx
[Deepgram] Transcript (final=false): Hello
[Deepgram] Transcript (final=true): Hello, I'm grateful for...
[Completion Check] isComplete=true
```

### What to Check

- ✅ No "UNAVAILABLE" or "TLS connection" errors
- ✅ `[Deepgram] WebSocket connection opened`
- ✅ `[Deepgram] Transcript (final=true): ...` with your speech
- ✅ Natural Google voice plays greeting
- ✅ System detects when you finish speaking

## Cost Comparison

| Service | Cost/min | Your $50 Gets |
|---------|----------|---------------|
| **Deepgram STT** | $0.0125 | 4,000 min (66.7 hrs) |
| **Google TTS** | $0.016 | 3,125 min (52 hrs) |
| **Twilio** | $0.015 | 3,333 min (55.5 hrs) |
| **Total** | $0.0435/min | ~1,150 min (19 hrs) |

With Deepgram's $200 free credits:
- **16,000 minutes** (266 hours) of transcription for free!

## Features

### Deepgram Nova-2 Model

- ✅ Latest model (2024)
- ✅ Optimized for phone audio
- ✅ Better accuracy than Google Cloud
- ✅ Automatic punctuation
- ✅ Real-time and interim results
- ✅ Low latency (~300ms)

### Configuration

The system uses these Deepgram settings:
```typescript
{
  model: "nova-2",           // Latest, best accuracy
  language: "en-US",         // US English
  punctuate: true,           // Add punctuation
  interimResults: true,      // Get partial results
  encoding: "mulaw",         // Twilio's audio format
  sampleRate: 8000,          // Twilio's sample rate
  channels: 1,               // Mono audio
}
```

## Troubleshooting

### "Deepgram API key not found"
- Make sure you added `DEEPGRAM_API_KEY` to `.env`
- Restart services after adding the key

### "WebSocket connection failed"
- Check your API key is correct
- Verify you have free credits remaining
- Check internet connection

### "No transcription appearing"
- Check logs for `[Deepgram] Transcript` messages
- Verify audio is being sent: look for `[Deepgram] Error sending audio`
- Make sure you're speaking clearly

## Next Steps

1. **Add your Deepgram API key** to `.env`
2. **Restart services**: `./stop-all.sh && ./start-all.sh`
3. **Make a test call** and check the logs
4. **Verify transcription** appears in real-time

Your enhanced calls will now have:
- ✅ Natural Google voice (TTS)
- ✅ Real-time transcription (Deepgram STT)
- ✅ Completion detection
- ✅ No gRPC/TLS errors
- ✅ Better accuracy
- ✅ Lower cost

🎉 **You're all set!**
