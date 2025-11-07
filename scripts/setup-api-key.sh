#!/bin/bash

# Quick setup script for API key method

echo "🔑 Google Cloud API Key Setup"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📝 Please provide your Google Cloud credentials:"
echo ""

# Get API key
read -p "Enter your Google Cloud API Key (from https://aistudio.google.com/app/apikey): " api_key

# Get project ID
read -p "Enter your Google Cloud Project ID: " project_id

echo ""
echo "Updating .env file..."

# Check if variables already exist and update them, or append if not
if grep -q "GOOGLE_CLOUD_API_KEY" .env; then
    # Update existing
    sed -i.bak "s/^GOOGLE_CLOUD_API_KEY=.*/GOOGLE_CLOUD_API_KEY=$api_key/" .env
    sed -i.bak "s/^GOOGLE_CLOUD_PROJECT_ID=.*/GOOGLE_CLOUD_PROJECT_ID=$project_id/" .env
    rm .env.bak 2>/dev/null
else
    # Append new
    echo "" >> .env
    echo "# Google Cloud Configuration (API Key Method)" >> .env
    echo "GOOGLE_CLOUD_API_KEY=$api_key" >> .env
    echo "GOOGLE_CLOUD_PROJECT_ID=$project_id" >> .env
fi

# Ensure USE_ENHANCED_CALLS is true
if grep -q "USE_ENHANCED_CALLS" .env; then
    sed -i.bak "s/^USE_ENHANCED_CALLS=.*/USE_ENHANCED_CALLS=true/" .env
    rm .env.bak 2>/dev/null
else
    echo "USE_ENHANCED_CALLS=true" >> .env
fi

echo "✅ .env file updated"
echo ""
echo "🎯 Next steps:"
echo "1. Enable APIs at:"
echo "   - https://console.cloud.google.com/apis/library/speech.googleapis.com"
echo "   - https://console.cloud.google.com/apis/library/texttospeech.googleapis.com"
echo ""
echo "2. Start the server:"
echo "   ./start-enhanced.sh"
echo ""
echo "✨ Setup complete!"
