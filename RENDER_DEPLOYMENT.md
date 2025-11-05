# Deploying to Render

This guide walks you through deploying the backend to Render with both a web service (API + webhooks) and a background worker (call scheduler).

## Prerequisites

- [ ] Render account (https://render.com)
- [ ] MongoDB Atlas database (or other MongoDB instance)
- [ ] Twilio account with phone number
- [ ] Google Gemini API key
- [ ] GitHub repository with your code

## Step 1: Prepare Your Repository

1. **Commit all changes** to your GitHub repository
2. **Ensure `.env` is in `.gitignore`** (never commit secrets!)
3. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Twilio phone call integration"
   git push origin main
   ```

## Step 2: Create Web Service on Render

### 2.1 Create New Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your repository

### 2.2 Configure Web Service

**Basic Settings:**
- **Name**: `your-app-backend` (or any name)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `concept_backend`
- **Runtime**: `Deno`
- **Build Command**: (leave empty - Deno doesn't need build)
- **Start Command**: 
  ```bash
  deno run --allow-net --allow-read --allow-env --allow-sys src/concept_server.ts
  ```

**Instance Type:**
- Start with **Free** tier for testing
- Upgrade to **Starter** ($7/month) for production

### 2.3 Add Environment Variables

Click **"Environment"** tab and add these variables:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Encryption
ENCRYPTION_KEY=1eed3e19355de660e100dd9b02ef511fb59b58acf84e4e1539b3ad5b60148495

# Server Config
BASE_URL=https://your-app-backend.onrender.com
PORT=8000

# Use real services (not mocks)
USE_MOCKS=false
```

**Important**: Replace `your-app-backend` in `BASE_URL` with your actual Render service name!

### 2.4 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (2-5 minutes)
3. Once deployed, note your URL: `https://your-app-backend.onrender.com`

## Step 3: Create Background Worker on Render

### 3.1 Create New Background Worker

1. Go back to Render Dashboard
2. Click **"New +"** → **"Background Worker"**
3. Connect the same GitHub repository

### 3.2 Configure Background Worker

**Basic Settings:**
- **Name**: `your-app-worker` (or any name)
- **Region**: Same as web service
- **Branch**: `main`
- **Root Directory**: `concept_backend`
- **Runtime**: `Deno`
- **Build Command**: (leave empty)
- **Start Command**:
  ```bash
  deno run --allow-net --allow-read --allow-env --allow-sys src/workers/callSchedulerWorker.ts
  ```

**Instance Type:**
- Start with **Free** tier
- Upgrade to **Starter** for production

### 3.3 Add Environment Variables

Add the **same environment variables** as the web service (copy from Step 2.3)

### 3.4 Deploy

1. Click **"Create Background Worker"**
2. Wait for deployment

## Step 4: Configure Twilio Webhooks

1. Go to Twilio Console: https://console.twilio.com
2. Navigate to **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your phone number
4. Scroll to **Voice Configuration**:
   - **A CALL COMES IN**: 
     - Webhook: `https://your-app-backend.onrender.com/webhooks/twilio/voice`
     - HTTP POST
   - **CALL STATUS CHANGES**:
     - Webhook: `https://your-app-backend.onrender.com/webhooks/twilio/status`
     - HTTP POST
5. Click **Save**

## Step 5: Test Your Deployment

### 5.1 Check Services are Running

**Web Service:**
```bash
curl https://your-app-backend.onrender.com
# Should return: "Concept Server is running."
```

**Check Logs:**
- Go to your web service in Render Dashboard
- Click **"Logs"** tab
- Should see: "✓ Twilio webhooks registered at /webhooks/twilio"

### 5.2 Test a Call

You can test by:
1. Using your frontend to schedule a call
2. Or manually via API:
   ```bash
   curl -X POST https://your-app-backend.onrender.com/api/CallScheduler/scheduleCall \
     -H "Content-Type: application/json" \
     -d '{
       "user": "user:test",
       "callSession": "session:test",
       "phoneNumber": "+1YOUR_PHONE",
       "scheduledFor": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
       "maxRetries": 3
     }'
   ```

3. Check worker logs to see it process the call

## Step 6: Monitor and Debug

### Monitoring

**Web Service Logs:**
- Shows incoming webhook calls
- API requests
- Errors

**Worker Logs:**
- Shows call processing
- Retry attempts
- Twilio API calls

### Common Issues

**Issue**: "Cannot find module"
- **Fix**: Ensure all imports use correct paths
- Check `deno.json` import map

**Issue**: Webhooks not receiving calls
- **Fix**: Verify Twilio webhook URLs are correct
- Check BASE_URL environment variable
- Ensure web service is running (not sleeping)

**Issue**: Worker not processing calls
- **Fix**: Check worker logs for errors
- Verify MongoDB connection
- Ensure environment variables are set

**Issue**: Free tier services sleep after 15 min inactivity
- **Fix**: Upgrade to paid tier ($7/month per service)
- Or use a cron job to ping every 10 minutes

## Step 7: Production Checklist

Before going live:

- [ ] Upgrade to paid tier (prevents sleeping)
- [ ] Set up custom domain (optional)
- [ ] Configure MongoDB Atlas IP whitelist (allow Render IPs)
- [ ] Set up monitoring/alerts in Render
- [ ] Test call flow end-to-end
- [ ] Verify recording encryption works
- [ ] Test retry logic
- [ ] Check Twilio usage/costs
- [ ] Set up error tracking (e.g., Sentry)

## Costs Estimate

**Render:**
- Web Service (Starter): $7/month
- Background Worker (Starter): $7/month
- **Total**: $14/month

**Twilio:**
- Phone number: ~$1/month
- Outbound calls: ~$0.013/minute
- Recording storage: ~$0.0025/minute
- **Estimate**: $5-20/month depending on usage

**MongoDB Atlas:**
- Free tier: $0 (512MB)
- Shared tier: $9/month (2GB)

**Google Gemini:**
- Free tier: 15 requests/minute
- Paid: $0.00025/1K characters

**Total Monthly**: ~$20-50 depending on usage

## Scaling

As your app grows:

1. **Increase worker instances** (Render allows multiple workers)
2. **Upgrade MongoDB** to dedicated cluster
3. **Add Redis** for caching/queue management
4. **Set up CDN** for static assets
5. **Monitor costs** and optimize API usage

## Support

- Render Docs: https://render.com/docs
- Twilio Docs: https://www.twilio.com/docs
- MongoDB Atlas: https://www.mongodb.com/docs/atlas/

---

## Quick Reference

**Web Service URL**: `https://your-app-backend.onrender.com`

**Webhook Endpoints**:
- Voice: `/webhooks/twilio/voice`
- Status: `/webhooks/twilio/status`
- Recording: `/webhooks/twilio/recording`
- Transcription: `/webhooks/twilio/transcription`
- Gather: `/webhooks/twilio/gather`

**API Base**: `/api/[ConceptName]/[actionName]`

**Health Check**: `GET /`
