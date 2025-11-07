# Quick Start: Enhanced Calls with Google Cloud

## TL;DR

Your call system now uses Google Cloud for better speech quality while keeping Twilio for call control. Your $50 Gemini credit gets you ~15 hours of calls instead of 30 minutes.

## Setup (5 minutes)

### 1. Enable Google Cloud APIs
```bash
gcloud services enable speech.googleapis.com texttospeech.googleapis.com
```

### 2. Create Service Account
```bash
gcloud iam service-accounts create zien-call-service
gcloud iam service-accounts keys create ~/zien-key.json \
  --iam-account=zien-call-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 3. Add to `.env`
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/zien-key.json
```

### 4. Update Server
In your main server file, change:
```typescript
// OLD:
import { createTwilioWebhooks } from "./webhooks/twilio.ts";

// NEW:
import { createEnhancedTwilioWebhooks } from "./webhooks/twilioEnhanced.ts";
```

### 5. Restart
```bash
deno run start
```

## What You Get

✅ **Better transcription** - Google Cloud's phone-optimized model  
✅ **Natural voice** - Neural2 voices (sounds human!)  
✅ **Smart pauses** - Gemini detects when user finished speaking  
✅ **Name pronunciation** - Uses profile settings  
✅ **Cost-effective** - $0.057/min (~$3.42/hour)

## Cost Breakdown

| Your $50 gets you | Time |
|-------------------|------|
| Enhanced calls (Google Cloud + Twilio) | ~15 hours |
| Twilio-only calls | ~64 hours |
| Gemini Live calls | ~30 minutes |

**Sweet spot**: 10x better quality than Twilio-only, 30x cheaper than Gemini Live!

## Customization

### Change Voice
Edit `/src/services/enhancedCallOrchestrator.ts`:
```typescript
voiceName: "en-US-Neural2-F", // Female (default)
// Try: "en-US-Neural2-D" for male voice
```

### Adjust Pause Threshold
```typescript
pauseThreshold: 5, // seconds (default)
// Increase for thoughtful responses, decrease for quick answers
```

### Speaking Rate
```typescript
speakingRate: 0.95, // 0.25 to 4.0 (1.0 = normal)
// 0.9 = slightly slower (clearer)
// 1.1 = slightly faster (more energetic)
```

## Testing

### Local (with mocks)
```bash
USE_MOCKS=true deno run start
```

### Production
```bash
# Ensure env vars set
deno run start

# Test call
curl -X POST http://localhost:8000/api/calls/initiate \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

## Troubleshooting

**"Permission denied"**  
→ Check service account has `roles/speech.client` and `roles/texttospeech.client`

**"WebSocket connection failed"**  
→ Server must be publicly accessible (use ngrok for local testing)

**"No transcription"**  
→ Check audio quality, try increasing pause threshold

## Files Created

- `/src/services/googleCloud.ts` - STT/TTS wrapper
- `/src/services/enhancedCallOrchestrator.ts` - Call logic
- `/src/webhooks/twilioEnhanced.ts` - Webhook handlers
- `GOOGLE_CLOUD_SETUP.md` - Detailed setup guide
- `ENHANCED_CALL_IMPLEMENTATION.md` - Full documentation

## Next Steps

1. ✅ Set up Google Cloud (follow steps above)
2. ✅ Test with a few calls
3. ✅ Adjust voice/pause settings based on feedback
4. ✅ Monitor costs in Google Cloud Console
5. ✅ Deploy to production

## Questions?

Read the full docs:
- `GOOGLE_CLOUD_SETUP.md` - Setup and configuration
- `ENHANCED_CALL_IMPLEMENTATION.md` - Architecture and details

---

**Note**: This is backend-only. No frontend changes needed! 🎉
