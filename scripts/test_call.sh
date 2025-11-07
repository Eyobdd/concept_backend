#!/bin/bash

# Test Call Script
# This schedules a test call that will be processed by the worker

echo "🔧 Scheduling a test call..."
echo ""

# Get current timestamp
SCHEDULED_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Replace with your phone number!
PHONE_NUMBER="+1YOUR_PHONE_NUMBER"

echo "⚠️  IMPORTANT: Update PHONE_NUMBER in this script first!"
echo "   Current: $PHONE_NUMBER"
echo ""

# Schedule the call
curl -X POST http://localhost:8000/api/CallScheduler/scheduleCall \
  -H "Content-Type: application/json" \
  -d "{
    \"user\": \"user:test_$(date +%s)\",
    \"callSession\": \"session:test_$(date +%s)\",
    \"phoneNumber\": \"$PHONE_NUMBER\",
    \"scheduledFor\": \"$SCHEDULED_TIME\",
    \"maxRetries\": 3
  }"

echo ""
echo ""
echo "✅ Call scheduled!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure Twilio webhooks are configured with your ngrok URL"
echo "2. Start the background worker (if not already running):"
echo "   deno run --allow-net --allow-read --allow-env --allow-sys src/workers/callSchedulerWorker.ts"
echo "3. Watch the worker logs to see it process the call"
echo "4. Your phone should ring in ~60 seconds!"
echo ""
