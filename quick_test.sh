#!/bin/bash

echo "📞 Quick Call Test Script"
echo "========================="
echo ""

# IMPORTANT: Set your phone number here!
PHONE_NUMBER="+18579996709"

# Generate unique session ID
SESSION_ID="session:test_$(date +%s)"
USER_ID="user:test_$(date +%s)"

if [ "$PHONE_NUMBER" = "+1YOUR_PHONE_NUMBER" ]; then
    echo "⚠️  ERROR: Please edit this script and set your phone number!"
    echo "   Open: quick_test.sh"
    echo "   Change line 7 to your actual phone number (e.g., +16175551234)"
    exit 1
fi

echo "Using session: $SESSION_ID"
echo "Using user: $USER_ID"
echo ""

echo "Step 1: Creating test profile..."
PROFILE_RESULT=$(curl -s -X POST http://localhost:8000/api/Profile/createProfile \
  -H "Content-Type: application/json" \
  -d "{
    \"user\": \"$USER_ID\",
    \"displayName\": \"Test User\",
    \"phoneNumber\": \"$PHONE_NUMBER\",
    \"timezone\": \"America/New_York\"
  }")
echo "✓ Profile created for $PHONE_NUMBER"

echo ""
echo "Step 2: Creating reflection session..."
SESSION_RESULT=$(curl -s -X POST http://localhost:8000/api/ReflectionSession/startSession \
  -H "Content-Type: application/json" \
  -d '{"user": "'"$USER_ID"'", "callSession": "'"$SESSION_ID"'", "method": "PHONE", "prompts": [{"promptId": "prompt1", "promptText": "What are you grateful for today?"}, {"promptId": "prompt2", "promptText": "What is one thing you learned today?"}]}')

if echo "$SESSION_RESULT" | grep -q "error"; then
  echo "❌ Error creating session: $SESSION_RESULT"
  exit 1
fi
echo "✓ Reflection session created with 2 prompts"

echo ""
echo "Step 3: Scheduling call for RIGHT NOW..."
SCHEDULED_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SCHEDULE_RESULT=$(curl -s -X POST http://localhost:8000/api/CallScheduler/scheduleCall \
  -H "Content-Type: application/json" \
  -d "{
    \"user\": \"$USER_ID\",
    \"callSession\": \"$SESSION_ID\",
    \"phoneNumber\": \"$PHONE_NUMBER\",
    \"scheduledFor\": \"$SCHEDULED_TIME\",
    \"maxRetries\": 3
  }")
echo "✓ Call scheduled for $SCHEDULED_TIME"

echo ""
echo "✅ Call scheduled!"
echo ""
echo "📋 What happens next:"
echo "1. Worker will pick up the call in ~60 seconds"
echo "2. Your phone ($PHONE_NUMBER) will ring"
echo "3. Answer and follow the prompts"
echo "4. Speak your responses clearly"
echo "5. Pause 3+ seconds after each response"
echo ""
echo "📊 Monitor progress:"
echo "- Worker logs: Check the worker terminal"
echo "- Backend logs: Check the backend terminal"
echo "- ngrok inspector: http://127.0.0.1:4040"
echo "- Twilio console: https://console.twilio.com/us1/monitor/logs/calls"
echo ""
echo "⏰ Waiting for worker to process (polls every 60s)..."
