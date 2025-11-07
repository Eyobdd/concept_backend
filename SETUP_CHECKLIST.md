# Enhanced Calls Setup Checklist

Follow these steps to enable Google Cloud STT/TTS for your call system.

## ✅ Step 1: Set Up Google Cloud (Web Console)

Since `gcloud` CLI isn't installed, use the web console:

### 1.1 Enable APIs
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Select or create your project
- [ ] Enable **Cloud Speech-to-Text API**: https://console.cloud.google.com/apis/library/speech.googleapis.com
- [ ] Enable **Cloud Text-to-Speech API**: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com

### 1.2 Create Service Account
- [ ] Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
- [ ] Click **+ CREATE SERVICE ACCOUNT**
- [ ] Name: `zien-call-service`
- [ ] Grant roles:
  - [ ] **Cloud Speech Client**
  - [ ] **Cloud Text-to-Speech Client**
- [ ] Click **DONE**

### 1.3 Create and Download Key
- [ ] Click on your new service account
- [ ] Go to **KEYS** tab
- [ ] Click **ADD KEY** → **Create new key**
- [ ] Choose **JSON** format
- [ ] Save file as: `/Users/eyobdavidoff/Documents/GitHub/6.1040/concept_backend/zien-service-account.json`

**⚠️ Important**: Add `zien-service-account.json` to `.gitignore` to keep it secure!

---

## ✅ Step 2: Configure Environment Variables

### 2.1 Copy .env.example (if needed)
```bash
cd /Users/eyobdavidoff/Documents/GitHub/6.1040/concept_backend
cp .env.example .env
```

### 2.2 Add Google Cloud Configuration
Edit `.env` and add/update these lines:

```bash
# Google Cloud Configuration (for enhanced calls)
GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id-here
GOOGLE_APPLICATION_CREDENTIALS=/Users/eyobdavidoff/Documents/GitHub/6.1040/concept_backend/zien-service-account.json

# Enhanced Calls (set to "false" to use standard Twilio STT/TTS)
USE_ENHANCED_CALLS=true
```

**Replace `your-actual-project-id-here`** with your Google Cloud project ID (found in console).

### 2.3 Verify Other Required Variables
Make sure these are also set in `.env`:
- [ ] `MONGODB_URI`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `GEMINI_API_KEY`
- [ ] `ENCRYPTION_KEY`
- [ ] `BASE_URL`

---

## ✅ Step 3: Update Server (Already Done! ✨)

The server has been updated to use enhanced webhooks by default.

Changes made:
- [x] Imported `createEnhancedTwilioWebhooks` in `src/concept_server.ts`
- [x] Added logic to use enhanced webhooks when `USE_ENHANCED_CALLS=true`
- [x] Created startup script `start-enhanced.sh`

---

## ✅ Step 4: Test the Setup

### 4.1 Add Service Account to .gitignore
```bash
echo "zien-service-account.json" >> .gitignore
```

### 4.2 Start the Server
```bash
./start-enhanced.sh
```

Or manually:
```bash
deno run --allow-all src/concept_server.ts
```

### 4.3 Check Startup Logs
Look for:
```
✓ Enhanced Twilio webhooks registered at /webhooks/twilio (Google Cloud STT/TTS)
```

If you see this, the enhanced system is active! 🎉

### 4.4 Test with Mocks (Optional)
To test without making real API calls:
```bash
USE_MOCKS=true ./start-enhanced.sh
```

---

## 🎯 Quick Verification

Run this command to verify your setup:
```bash
cd /Users/eyobdavidoff/Documents/GitHub/6.1040/concept_backend

echo "Checking setup..."
echo ""

# Check .env exists
if [ -f .env ]; then
    echo "✅ .env file exists"
else
    echo "❌ .env file missing"
fi

# Check for Google Cloud config
if grep -q "GOOGLE_CLOUD_PROJECT_ID" .env; then
    echo "✅ GOOGLE_CLOUD_PROJECT_ID configured"
else
    echo "❌ GOOGLE_CLOUD_PROJECT_ID not found in .env"
fi

# Check service account file
if [ -f zien-service-account.json ]; then
    echo "✅ Service account key file exists"
else
    echo "❌ Service account key file missing"
fi

# Check if in .gitignore
if grep -q "zien-service-account.json" .gitignore; then
    echo "✅ Service account key in .gitignore"
else
    echo "⚠️  Add zien-service-account.json to .gitignore"
fi

echo ""
echo "Setup check complete!"
```

---

## 🔧 Troubleshooting

### "Permission denied" when starting server
```bash
chmod +x start-enhanced.sh
```

### "Module not found" errors
The Google Cloud libraries will be downloaded automatically by Deno on first run. This is normal.

### "Authentication failed"
- Verify `GOOGLE_APPLICATION_CREDENTIALS` path is correct and absolute
- Check that the JSON file exists at that location
- Ensure service account has the correct roles

### "API not enabled"
- Go back to Google Cloud Console
- Verify both Speech-to-Text and Text-to-Speech APIs are enabled
- Wait a few minutes for changes to propagate

### Want to use standard Twilio instead?
Set in `.env`:
```bash
USE_ENHANCED_CALLS=false
```

---

## 📊 Cost Monitoring

Set up billing alerts in Google Cloud Console:
1. Go to **Billing** → **Budgets & alerts**
2. Create budget for $50
3. Set alert at 50%, 90%, and 100%

---

## 🎉 Success Criteria

You're ready when:
- [x] Server starts without errors
- [x] Logs show "Enhanced Twilio webhooks registered"
- [x] Service account key is secure (in .gitignore)
- [x] All environment variables are set
- [x] Google Cloud APIs are enabled

---

## 📚 Next Steps

1. **Make a test call** to verify quality
2. **Monitor costs** in Google Cloud Console
3. **Adjust voice settings** if needed (see `ENHANCED_CALL_IMPLEMENTATION.md`)
4. **Deploy to production** when ready

---

## 🆘 Need Help?

- **Setup issues**: See `SETUP_GOOGLE_CLOUD.md`
- **Technical details**: See `ENHANCED_CALL_IMPLEMENTATION.md`
- **Quick reference**: See `QUICK_START_ENHANCED_CALLS.md`
- **Comparison**: See `CALL_SYSTEM_COMPARISON.md`
