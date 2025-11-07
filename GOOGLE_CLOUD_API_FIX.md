# Google Cloud API Setup Fix

## Issue 1: Text-to-Speech API Blocked

**Error:**
```
API_KEY_SERVICE_BLOCKED
Requests to this API texttospeech.googleapis.com method google.cloud.texttospeech.v1.TextToSpeech.SynthesizeSpeech are blocked.
```

**Solution: Enable Text-to-Speech API**

1. Go to: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com?project=gen-lang-client-0810467887
2. Click **"Enable"**
3. Wait 1-2 minutes for propagation

## Issue 2: Speech-to-Text gRPC/TLS Connection Failure

**Error:**
```
14 UNAVAILABLE: No connection established. Last error: Error: Client network socket disconnected before secure TLS connection was established
```

**Root Cause:**
- API keys don't work well with gRPC streaming in Deno
- Need service account credentials for proper gRPC authentication

**Solution: Use Service Account (Recommended)**

### Option A: Service Account JSON (Best for Production)

1. **Create Service Account:**
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=gen-lang-client-0810467887
   - Click "Create Service Account"
   - Name: `zien-backend-service`
   - Click "Create and Continue"
   - Grant roles:
     - `Cloud Speech-to-Text API User`
     - `Cloud Text-to-Speech API User`
   - Click "Done"

2. **Create JSON Key:**
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON"
   - Download the JSON file

3. **Update Environment:**
   ```bash
   # In your .env file, replace:
   # GOOGLE_CLOUD_API_KEY=AIzaSyB1MI1vazLiz8af5Vqu8IBQNFe3hL6DAxk
   
   # With:
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
   GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0810467887
   ```

4. **Restart services:**
   ```bash
   ./stop-all.sh
   ./start-all.sh
   ```

### Option B: Keep API Key (Quick Fix for TTS Only)

If you just want TTS to work and don't need STT transcription:

1. **Enable Text-to-Speech API** (see Issue 1 above)
2. **Disable STT temporarily** - Calls will work but won't transcribe

We can add a fallback that skips transcription if STT fails.

## Recommended: Option A (Service Account)

Service accounts provide:
- ✅ Proper gRPC authentication
- ✅ Better security (scoped permissions)
- ✅ No API key exposure
- ✅ Works with all Google Cloud services
- ✅ No rate limit issues

## Quick Test After Fix

After enabling TTS API or setting up service account:

1. Make a test call
2. Check logs for:
   - `[TTS] Audio generated successfully, using Google TTS` ✅
   - `[MediaStream] Transcript (final=true): ...` ✅
   - No "PERMISSION_DENIED" or "UNAVAILABLE" errors ✅

## Current Status

- ✅ Call connects successfully
- ✅ Fallback to Twilio voice works
- ✅ WebSocket media stream connects
- ❌ Google TTS blocked (need to enable API)
- ❌ Google STT fails (need service account for gRPC)
