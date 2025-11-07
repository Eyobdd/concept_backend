#!/bin/bash

# Stop script for server and worker

echo "🛑 Stopping Zien Backend Services"
echo "=================================="
echo ""

# Check for PID files
if [ -f .server.pid ]; then
    SERVER_PID=$(cat .server.pid)
    if kill -0 $SERVER_PID 2>/dev/null; then
        echo "Stopping server (PID: $SERVER_PID)..."
        kill $SERVER_PID
        echo "✅ Server stopped"
    else
        echo "⚠️  Server not running"
    fi
    rm -f .server.pid
else
    echo "⚠️  No server PID file found"
fi

if [ -f .call-worker.pid ]; then
    CALL_WORKER_PID=$(cat .call-worker.pid)
    if kill -0 $CALL_WORKER_PID 2>/dev/null; then
        echo "Stopping call worker (PID: $CALL_WORKER_PID)..."
        kill $CALL_WORKER_PID
        echo "✅ Call worker stopped"
    else
        echo "⚠️  Call worker not running"
    fi
    rm -f .call-worker.pid
else
    echo "⚠️  No call worker PID file found"
fi

if [ -f .window-worker.pid ]; then
    WINDOW_WORKER_PID=$(cat .window-worker.pid)
    if kill -0 $WINDOW_WORKER_PID 2>/dev/null; then
        echo "Stopping window worker (PID: $WINDOW_WORKER_PID)..."
        kill $WINDOW_WORKER_PID
        echo "✅ Window worker stopped"
    else
        echo "⚠️  Window worker not running"
    fi
    rm -f .window-worker.pid
else
    echo "⚠️  No window worker PID file found"
fi

# Also check for any deno processes on port 8000
PORT_PID=$(lsof -ti:8000 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "Found process on port 8000 (PID: $PORT_PID), stopping..."
    kill $PORT_PID
    echo "✅ Port 8000 freed"
fi

# Kill any tail processes for log files
echo "Stopping log tail processes..."
pkill -f "tail -f.*logs/server.log" 2>/dev/null && echo "✅ Server log tail stopped" || echo "✓ No server log tail running"
pkill -f "tail -f.*logs/call-worker.log" 2>/dev/null && echo "✅ Call worker log tail stopped" || echo "✓ No call worker log tail running"

echo ""
echo "✅ All services stopped"
