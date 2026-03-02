#!/bin/bash
# Speedtest CLI runner with server selection
# Usage: ./run-speedtest.sh [server_id]

SERVER_ID="${1:-36738}"  # Default to Mandaluyong (36738)
RESULTS_DIR="$HOME/SpeedtestMonitor"
HISTORY_FILE="$RESULTS_DIR/speedtest-history.json"
OUTPUT_FILE="$RESULTS_DIR/speedtest-latest.json"
LOG_FILE="$RESULTS_DIR/speedtest.log"

echo "$(date): Starting speedtest with server $SERVER_ID..." >> "$LOG_FILE"

# Check if speedtest exists
if ! command -v speedtest &> /dev/null; then
    echo "ERROR: speedtest CLI not found. Please install from https://www.speedtest.net/apps/cli" | tee -a "$LOG_FILE"
    exit 1
fi

# Run speedtest with JSON output
if speedtest --help 2>&1 | grep -q "format"; then
    # Supports --format=json
    RESULT=$(speedtest --server-id="$SERVER_ID" --format=json --accept-license --accept-gdpr 2>&1)
else
    # Fallback to basic output
    RESULT=$(speedtest --server-id="$SERVER_ID" --accept-license --accept-gdpr 2>&1)
fi

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "ERROR: speedtest failed with exit code $EXIT_CODE" | tee -a "$LOG_FILE"
    echo "$RESULT" >> "$LOG_FILE"
    exit 1
fi

# Parse result if JSON available
echo "$RESULT" | head -1 | grep -q "^{" && IS_JSON=true || IS_JSON=false

if [ "$IS_JSON" = true ]; then
    # Save as JSON
    TIMESTAMP=$(date -Iseconds)
    DOWNLOAD=$(echo "$RESULT" | jq -r '.download // .download.bandwidth // 0' 2>/dev/null | awk '{print $1/125000}')
    UPLOAD=$(echo "$RESULT" | jq -r '.upload // .upload.bandwidth // 0' 2>/dev/null | awk '{print $1/125000}')
    PING=$(echo "$RESULT" | jq -r '.ping.latency // .ping // 0' 2>/dev/null)
    SERVER_NAME=$(echo "$RESULT" | jq -r '.server.name // "N/A"' 2>/dev/null)
    SERVER_LOC=$(echo "$RESULT" | jq -r '.server.location // "N/A"' 2>/dev/null)
    SERVER_ID_ACTUAL=$(echo "$RESULT" | jq -r '.server.id // "N/A"' 2>/dev/null)
    ISP=$(echo "$RESULT" | jq -r '.isp // "N/A"' 2>/dev/null)
    
    # Create result object
    cat > "$OUTPUT_FILE" << JSON
{
  "timestamp": "$TIMESTAMP",
  "server_id": "$SERVER_ID_ACTUAL",
  "server_name": "$SERVER_NAME",
  "server_location": "$SERVER_LOC",
  "isp": "$ISP",
  "download": "$DOWNLOAD",
  "upload": "$UPLOAD",
  "ping": "$PING",
  "raw": $(echo "$RESULT" | head -1)
}
JSON

    # Append to history
    if [ -f "$HISTORY_FILE" ]; then
        jq ". + [$OUTPUT_FILE]" "$HISTORY_FILE" > "$HISTORY_FILE.tmp" && mv "$HISTORY_FILE.tmp" "$HISTORY_FILE"
    fi
    
    echo "$(date): Speedtest complete - Download: ${DOWNLOAD}Mbps, Upload: ${UPLOAD}Mbps, Ping: ${PING}ms" | tee -a "$LOG_FILE"
    echo "$(date): Server: $SERVER_NAME ($SERVER_LOC)" >> "$LOG_FILE"
else
    # Save raw output
    echo "$(date): Raw output:" >> "$LOG_FILE"
    echo "$RESULT" >> "$LOG_FILE"
    echo "$RESULT" > "$OUTPUT_FILE.raw"
fi

exit 0
