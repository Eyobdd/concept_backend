#!/bin/bash

# Script to open log windows for monitoring
# Can be run independently or called by start-all.sh

echo "📺 Opening log windows..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if logs exist
if [ ! -f "$SCRIPT_DIR/logs/server.log" ]; then
    echo "⚠️  Warning: logs/server.log not found. Creating empty file..."
    mkdir -p "$SCRIPT_DIR/logs"
    touch "$SCRIPT_DIR/logs/server.log"
fi

if [ ! -f "$SCRIPT_DIR/logs/call-worker.log" ]; then
    echo "⚠️  Warning: logs/call-worker.log not found. Creating empty file..."
    mkdir -p "$SCRIPT_DIR/logs"
    touch "$SCRIPT_DIR/logs/call-worker.log"
fi

# Check if log tail processes are already running
SERVER_LOG_COUNT=$(pgrep -f "tail -f.*logs/server.log" | wc -l | tr -d ' ')
WORKER_LOG_COUNT=$(pgrep -f "tail -f.*logs/call-worker.log" | wc -l | tr -d ' ')

# Open server log if not already running
if [ "$SERVER_LOG_COUNT" = "0" ]; then
    echo "Opening server log (call transcriptions)..."
    osascript -e 'tell application "Terminal" to do script "cd '"$SCRIPT_DIR"' && clear && echo \"📡 Server Log (Call Transcriptions & Deepgram/Gemini Output)\" && echo \"═══════════════════════════════════════════════════════════\" && echo \"\" && tail -f logs/server.log"' > /dev/null 2>&1
    sleep 0.5
else
    echo "✓ Server log already open (found $SERVER_LOG_COUNT process)"
fi

# Open worker log if not already running
if [ "$WORKER_LOG_COUNT" = "0" ]; then
    echo "Opening call worker log (worker actions)..."
    osascript -e 'tell application "Terminal" to do script "cd '"$SCRIPT_DIR"' && clear && echo \"⏰ Call Worker Log (Scheduling & Call Initiation)\" && echo \"═══════════════════════════════════════════════════════════\" && echo \"\" && tail -f logs/call-worker.log"' > /dev/null 2>&1
    sleep 0.5
else
    echo "✓ Call worker log already open (found $WORKER_LOG_COUNT process)"
fi

echo ""
echo "✅ Log windows ready!"
echo ""
echo "To close the log windows, just close the Terminal tabs."
