#!/bin/bash

# Start script for enhanced call system with Google Cloud

echo "🚀 Starting Zien Backend with Enhanced Calls"
echo "=============================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Please copy .env.example to .env and configure it:"
    echo "   cp .env.example .env"
    exit 1
fi

# Check for Google Cloud credentials (API Key OR Service Account)
has_api_key=$(grep -q "GOOGLE_CLOUD_API_KEY" .env && echo "yes" || echo "no")
has_service_account=$(grep -q "GOOGLE_APPLICATION_CREDENTIALS" .env && echo "yes" || echo "no")
has_project_id=$(grep -q "GOOGLE_CLOUD_PROJECT_ID" .env && echo "yes" || echo "no")

if [ "$has_project_id" = "no" ]; then
    echo "⚠️  Warning: GOOGLE_CLOUD_PROJECT_ID not found in .env"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
elif [ "$has_api_key" = "no" ] && [ "$has_service_account" = "no" ]; then
    echo "⚠️  Warning: Google Cloud credentials not found in .env"
    echo "   Enhanced calls require ONE of:"
    echo "   - GOOGLE_CLOUD_API_KEY (recommended for development)"
    echo "   - GOOGLE_APPLICATION_CREDENTIALS (recommended for production)"
    echo ""
    echo "   See SETUP_API_KEY_METHOD.md for quick setup"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
elif [ "$has_api_key" = "yes" ]; then
    echo "✅ Using Google Cloud API Key authentication"
else
    echo "✅ Using Google Cloud Service Account authentication"
fi

# Source .env file
export $(grep -v '^#' .env | xargs)

# Check if USE_ENHANCED_CALLS is set
if [ "$USE_ENHANCED_CALLS" = "false" ]; then
    echo "ℹ️  Using standard Twilio webhooks (USE_ENHANCED_CALLS=false)"
else
    echo "✨ Using enhanced webhooks with Google Cloud STT/TTS"
fi

echo ""
echo "Starting server..."
echo ""

# Start the server
deno run --allow-all src/concept_server.ts
