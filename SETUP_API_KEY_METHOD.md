# Quick Setup with API Key Method

This is the fastest way to get enhanced calls working!

## Step 1: Get API Key from Google AI Studio (2 minutes)

1. **Go to Google AI Studio**
   - Visit: https://aistudio.google.com/app/apikey

2. **Create API Key**
   - Click **"Get API key"** or **"Create API key"**
   - If prompted, select your Google Cloud project (or create a new one)
   - Click **"Create API key in new project"** if you don't have one
   - Copy the generated API key (starts with `AIza...`)

3. **Note your Project ID**
   - You'll see it in the format: `project-name-123456`
   - Or find it at: https://console.cloud.google.com/home/dashboard

## Step 2: Enable Required APIs (2 minutes)

The API key needs these APIs enabled:

1. **Enable Speech-to-Text API**
   - Direct link: https://console.cloud.google.com/apis/library/speech.googleapis.com
   - Click **"ENABLE"**

2. **Enable Text-to-Speech API**
   - Direct link: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
   - Click **"ENABLE"**

**Note**: Make sure you're in the same project where you created the API key!

## Step 3: Update .env File (1 minute)

Open your `.env` file and add these lines:

```bash
# Google Cloud Configuration (API Key Method)
GOOGLE_CLOUD_API_KEY=AIza...your-actual-api-key-here
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here

# Make sure enhanced calls are enabled
USE_ENHANCED_CALLS=true
```

**Important**: 
- Replace `AIza...your-actual-api-key-here` with your actual API key
- Replace `your-project-id-here` with your project ID
- Do NOT use service account credentials when using API key

## Step 4: Start the Server

```bash
cd /Users/eyobdavidoff/Documents/GitHub/6.1040/concept_backend
./start-enhanced.sh
```

## Verify It's Working

You should see in the logs:
```
✓ Enhanced Twilio webhooks registered at /webhooks/twilio (Google Cloud STT/TTS)
```

If you see any errors about authentication, double-check:
- API key is correct (starts with `AIza`)
- Both APIs are enabled in the same project
- Project ID matches the project where you created the API key

## Security Note

✅ API key is already in `.gitignore` - safe!  
⚠️ For production, consider using service account instead  
✅ For development/testing, API key is perfect!

## Troubleshooting

### "API key not valid"
- Make sure you copied the entire key (starts with `AIza`)
- Check for extra spaces or quotes

### "API not enabled"
- Visit the API enable links above
- Make sure you're in the correct project
- Wait 1-2 minutes for changes to propagate

### "Project not found"
- Verify project ID is correct
- Check at: https://console.cloud.google.com/home/dashboard

## You're Done! 🎉

Your enhanced call system is now ready with:
- ✅ Google Cloud Speech-to-Text (95% accuracy)
- ✅ Google Cloud Text-to-Speech (Neural2 voices)
- ✅ Gemini semantic completion checking
- ✅ Cost: ~$0.057/min (~15 hours with $50)

Make a test call to experience the quality improvement!
