# WebSocket URL Fix for Twilio Calls

## Problem
When a call was initiated and picked up, Twilio returned an "Application error" message. The issue was in the TwiML generation code that creates the WebSocket stream URL.

## Root Cause
The code was hardcoding `wss://` (secure WebSocket) for all WebSocket URLs:

```typescript
<Stream url="wss://${baseUrl.replace(/^https?:\/\//, "")}/webhooks/twilio/media-stream">
```

This caused issues because:
- For local development with `BASE_URL=http://localhost:8000`, it would generate `wss://localhost:8000/...`
- WebSocket protocol should match the HTTP protocol: `http://` → `ws://`, `https://` → `wss://`
- Twilio couldn't connect to the incorrect WebSocket URL, causing the application error

## Solution
Modified `generateInitialTwiML()` in `/src/services/enhancedCallOrchestrator.ts` to dynamically determine the correct WebSocket protocol:

```typescript
// Convert HTTP/HTTPS to WS/WSS for WebSocket URL
const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws";
const wsHost = baseUrl.replace(/^https?:\/\//, "");
const wsUrl = `${wsProtocol}://${wsHost}`;
```

Now the WebSocket URL is correctly generated as:
- `http://localhost:8000` → `ws://localhost:8000/webhooks/twilio/media-stream`
- `https://your-domain.com` → `wss://your-domain.com/webhooks/twilio/media-stream`

## Files Modified
- `/src/services/enhancedCallOrchestrator.ts` - Fixed WebSocket URL generation in `generateInitialTwiML()` method (lines 175-178, 208, 225)

## Testing
1. Restart the server: `pkill -9 deno && deno run start`
2. Initiate a test call
3. Pick up the phone - you should now hear the greeting and prompts instead of an application error

## Environment Requirements
Make sure your `.env` file has the correct `BASE_URL`:
- Local development: `BASE_URL=http://localhost:8000`
- Production with ngrok: `BASE_URL=https://your-ngrok-url.ngrok.io`
- Production deployment: `BASE_URL=https://your-domain.com`
