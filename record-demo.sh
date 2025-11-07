#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎥 Starting Backend Trace Recording for Demo${NC}"
echo "=========================================="
echo ""

# Kill any existing deno processes
echo -e "${YELLOW}Stopping existing processes...${NC}"
pkill -9 deno
sleep 2

# Create trace file with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TRACE_FILE="demo_trace_${TIMESTAMP}.log"

echo -e "${GREEN}✅ Starting backend with trace logging${NC}"
echo -e "${BLUE}📝 Trace file: ${TRACE_FILE}${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C when you finish recording your demo${NC}"
echo ""

# Start the server with output to both console and file
deno run start 2>&1 | tee "$TRACE_FILE"

# This runs when you press Ctrl+C
echo ""
echo -e "${GREEN}✅ Demo recording stopped${NC}"
echo -e "${BLUE}📄 Full trace saved to: ${TRACE_FILE}${NC}"
echo ""
echo "To view the trace:"
echo "  cat ${TRACE_FILE}"
echo ""
echo "To extract just the demo portion (last 500 lines):"
echo "  tail -500 ${TRACE_FILE} > demo_trace_final.txt"
