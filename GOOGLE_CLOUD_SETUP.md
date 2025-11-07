# Google Cloud STT/TTS Setup Guide

This guide explains how to set up Google Cloud Speech-to-Text and Text-to-Speech for enhanced call quality.

## Overview

The enhanced call system uses:
- **Twilio** for call control and connectivity
- **Google Cloud Speech-to-Text** for high-quality transcription
- **Google Cloud Text-to-Speech** for natural voice synthesis
- **Gemini** for semantic completion checking (already configured)

## Benefits Over Twilio's Built-in STT/TTS

- **Better accuracy**: Google Cloud STT is optimized for phone audio with advanced noise reduction
- **Natural voices**: Neural2 voices sound more human and engaging
- **Semantic understanding**: Combined with Gemini for intelligent pause detection
- **Cost-effective**: ~$0.10/min vs $1.60/min for Gemini Live API

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your Project ID

### 2. Enable Required APIs

Enable these APIs in your project:
- Cloud Speech-to-Text API
- Cloud Text-to-Speech API

```bash
gcloud services enable speech.googleapis.com
gcloud services enable texttospeech.googleapis.com
```

### 3. Create Service Account (Recommended)

For production, use a service account:

```bash
# Create service account
gcloud iam service-accounts create zien-call-service \
  --display-name="Zien Call Service"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:zien-call-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/speech.client"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:zien-call-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/texttospeech.client"

# Create and download key
gcloud iam service-accounts keys create ~/zien-service-account.json \
  --iam-account=zien-call-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 4. Configure Environment Variables

Add to your `.env` file:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/zien-service-account.json

# OR use API key (less secure, for development only)
# GOOGLE_CLOUD_API_KEY=your-api-key

# Existing variables (keep these)
GEMINI_API_KEY=your-gemini-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
ENCRYPTION_KEY=your-encryption-key
BASE_URL=https://your-domain.com
```

### 5. Update Server to Use Enhanced Webhooks

In your main server file, import and use the enhanced webhooks:

```typescript
import { createEnhancedTwilioWebhooks } from "./webhooks/twilioEnhanced.ts";

// Replace old webhook routes
const twilioRoutes = createEnhancedTwilioWebhooks(db);
app.route("/webhooks/twilio", twilioRoutes);
```

## Cost Estimation

### Google Cloud Pricing (as of 2024)

**Speech-to-Text (phone_call model):**
- $0.009 per 15 seconds = $0.036/minute

**Text-to-Speech (Neural2 voices):**
- $0.000016 per character
- Average prompt ~100 characters = $0.0016 per prompt
- ~5 prompts per call = $0.008/minute

**Total Google Cloud cost:** ~$0.044/minute

**Twilio call cost:** ~$0.013/minute

**Combined total:** ~$0.057/minute (~$3.42/hour)

### Comparison

| Solution | Cost/min | Cost/hour | Your $50 gets |
|----------|----------|-----------|---------------|
| Twilio only | $0.013 | $0.78 | ~3,846 min (64 hrs) |
| **Google Cloud + Twilio** | **$0.057** | **$3.42** | **~877 min (14.6 hrs)** |
| Gemini Live + Twilio | $1.60 | $96 | ~31 min (0.5 hrs) |

## Voice Configuration

### Available Neural2 Voices

**Female voices (recommended):**
- `en-US-Neural2-F` - Warm, friendly (default)
- `en-US-Neural2-C` - Professional, clear
- `en-US-Neural2-E` - Youthful, energetic
- `en-US-Neural2-G` - Mature, authoritative
- `en-US-Neural2-H` - Soft, gentle

**Male voices:**
- `en-US-Neural2-D` - Warm, friendly
- `en-US-Neural2-A` - Professional, clear
- `en-US-Neural2-I` - Deep, authoritative
- `en-US-Neural2-J` - Youthful, energetic

### Customizing Voice

Edit `enhancedCallOrchestrator.ts`:

```typescript
const greetingAudio = await this.googleCloudService.textToSpeech({
  text: greetingText,
  voiceName: "en-US-Neural2-F", // Change this
  speakingRate: 0.95, // 0.25 to 4.0 (1.0 = normal)
  pitch: 0.0, // -20.0 to 20.0 (0 = normal)
});
```

## How It Works

### Call Flow

1. **User answers call** → Twilio sends webhook to `/webhooks/twilio/voice`
2. **Server responds with TwiML** that:
   - Starts media streaming (WebSocket connection)
   - Plays greeting using Google TTS
   - Plays first prompt using Google TTS
3. **User speaks** → Audio streams to server via WebSocket
4. **Google STT transcribes** in real-time with partial results
5. **After 5-second pause** → Gemini checks if response is complete
6. **If complete** → Play next prompt or end call
7. **Recording saved** → Encrypted and stored in database

### Architecture

```
User's Phone
    ↓
Twilio (call control)
    ↓
Your Server
    ├─→ Google Cloud STT (transcription)
    ├─→ Google Cloud TTS (voice synthesis)
    └─→ Gemini (completion checking)
    ↓
Database (encrypted storage)
```

## Testing

### With Mocks (No API Calls)

```bash
USE_MOCKS=true deno run start
```

### With Real APIs

```bash
# Ensure environment variables are set
deno run start

# Make a test call
curl -X POST http://localhost:8000/api/calls/initiate \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

## Troubleshooting

### "Permission denied" errors

- Check that your service account has the correct roles
- Verify `GOOGLE_APPLICATION_CREDENTIALS` points to valid JSON file

### "Audio format not supported"

- Twilio streams μ-law 8kHz audio
- Google Cloud STT expects this format (configured automatically)

### "WebSocket connection failed"

- Ensure your server is publicly accessible (not localhost)
- Check that BASE_URL is set correctly with `wss://` protocol

### "No transcription returned"

- Check audio quality (background noise, poor connection)
- Verify language code matches user's language
- Try increasing pause threshold in `EnhancedCallOrchestrator`

## Production Checklist

- [ ] Service account created with minimal permissions
- [ ] API keys stored securely (not in code)
- [ ] BASE_URL points to production domain with HTTPS
- [ ] Audio files hosted on CDN (for TTS playback)
- [ ] Error monitoring configured
- [ ] Cost alerts set up in Google Cloud Console
- [ ] Backup to Twilio's built-in STT/TTS if Google Cloud fails

## Next Steps

1. Test with a few calls to verify quality
2. Monitor costs in Google Cloud Console
3. Adjust voice settings based on user feedback
4. Consider implementing audio file caching for common prompts
5. Set up fallback to Twilio STT/TTS if Google Cloud is unavailable
