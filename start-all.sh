#!/bin/bash

# Start script for both server and call scheduler worker

echo "🚀 Starting Zien Backend (Server + Worker)"
echo "==========================================="
echo ""

# Kill any existing Deno processes and clear cache
echo "🧹 Cleaning up existing processes and cache..."
pkill -9 deno 2>/dev/null
rm -rf .deno_cache 2>/dev/null
sleep 1
echo "✅ Cleanup complete"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Please copy .env.example to .env and configure it:"
    echo "   cp .env.example .env"
    exit 1
fi

# Source .env file
export $(grep -v '^#' .env | xargs)

# Check for Google Cloud credentials (API Key OR Service Account)
has_api_key=$(grep -q "GOOGLE_CLOUD_API_KEY" .env && echo "yes" || echo "no")
has_service_account=$(grep -q "GOOGLE_APPLICATION_CREDENTIALS" .env && echo "yes" || echo "no")
has_project_id=$(grep -q "GOOGLE_CLOUD_PROJECT_ID" .env && echo "yes" || echo "no")

if [ "$has_project_id" = "no" ]; then
    echo "⚠️  Warning: GOOGLE_CLOUD_PROJECT_ID not found in .env"
elif [ "$has_api_key" = "no" ] && [ "$has_service_account" = "no" ]; then
    echo "⚠️  Warning: Google Cloud credentials not found in .env"
    echo "   Enhanced calls require ONE of:"
    echo "   - GOOGLE_CLOUD_API_KEY (recommended for development)"
    echo "   - GOOGLE_APPLICATION_CREDENTIALS (recommended for production)"
elif [ "$has_api_key" = "yes" ]; then
    echo "✅ Using Google Cloud API Key authentication"
else
    echo "✅ Using Google Cloud Service Account authentication"
fi

# Check if USE_ENHANCED_CALLS is set
if [ "$USE_ENHANCED_CALLS" = "false" ]; then
    echo "ℹ️  Using standard Twilio webhooks (USE_ENHANCED_CALLS=false)"
else
    echo "✨ Using enhanced webhooks with Google Cloud STT/TTS"
fi

echo ""
echo "Starting services..."
echo ""

# Create log directory
mkdir -p logs

# Start the concept server in background
echo "📡 Starting Concept Server..."
deno run --allow-all src/concept_server.ts > logs/server.log 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

# Wait a moment for server to start
sleep 2

# Start the call scheduler worker in background
echo "⏰ Starting Call Scheduler Worker..."
deno run --allow-all src/workers/callSchedulerWorker.ts > logs/call-worker.log 2>&1 &
CALL_WORKER_PID=$!
echo "   Call Worker PID: $CALL_WORKER_PID"

# Wait a moment
sleep 1

# Start the call window scheduler worker in background
echo "📅 Starting Call Window Scheduler Worker..."
deno run --allow-all src/workers/callWindowScheduler.ts > logs/window-worker.log 2>&1 &
WINDOW_WORKER_PID=$!
echo "   Window Worker PID: $WINDOW_WORKER_PID"

echo ""
echo "✅ All services started!"
echo ""
echo "📊 Status:"
echo "   Server: http://localhost:8000 (PID: $SERVER_PID)"
echo "   Call Worker: Running (PID: $CALL_WORKER_PID)"
echo "   Window Worker: Running (PID: $WINDOW_WORKER_PID)"
echo ""
echo "📝 Logs:"
echo "   Server: tail -f logs/server.log"
echo "   Call Worker: tail -f logs/call-worker.log"
echo "   Window Worker: tail -f logs/window-worker.log"
echo ""
echo "🛑 To stop all services:"
echo "   kill $SERVER_PID $CALL_WORKER_PID $WINDOW_WORKER_PID"
echo "   Or use: ./stop-all.sh"
echo ""

# Open log windows in new Terminal tabs
sleep 1  # Give logs time to be created
./open-logs.sh

# Save PIDs to file for easy stopping
echo "$SERVER_PID" > .server.pid
echo "$CALL_WORKER_PID" > .call-worker.pid
echo "$WINDOW_WORKER_PID" > .window-worker.pid

# Keep script running and monitor processes
trap "echo ''; echo 'Stopping services...'; kill $SERVER_PID $CALL_WORKER_PID $WINDOW_WORKER_PID 2>/dev/null; rm -f .server.pid .call-worker.pid .window-worker.pid; exit" INT TERM

echo "Press Ctrl+C to stop all services"
echo ""

# Monitor processes
while kill -0 $SERVER_PID 2>/dev/null && kill -0 $CALL_WORKER_PID 2>/dev/null && kill -0 $WINDOW_WORKER_PID 2>/dev/null; do
    sleep 1
done

echo "⚠️  One or more services stopped unexpectedly"
echo "Check logs for details:"
echo "  Server: logs/server.log"
echo "  Call Worker: logs/call-worker.log"
echo "  Window Worker: logs/window-worker.log"

# Cleanup
kill $SERVER_PID $CALL_WORKER_PID $WINDOW_WORKER_PID 2>/dev/null
rm -f .server.pid .call-worker.pid .window-worker.pid
