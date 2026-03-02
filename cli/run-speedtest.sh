#!/bin/bash
# Speedtest CLI runner with server selection
# Usage: ./run-speedtest.sh [server_id]

SERVER_ID="${1:-36738}"  # Default to Mandaluyong (36738)
RESULTS_DIR="$HOME/SpeedtestMonitor"
HISTORY_FILE="$RESULTS_DIR/speedtest-history.json"
OUTPUT_FILE="$RESULTS_DIR/speedtest-latest.json"
LOG_FILE="$RESULTS_DIR/speedtest.log"
SPEEDTEST_BIN="/snap/speedtest/current/speedtest"

echo "$(date): Starting speedtest with server $SERVER_ID..." >> "$LOG_FILE"

# Check if speedtest exists
if [ ! -f "$SPEEDTEST_BIN" ]; then
    echo "ERROR: speedtest CLI not found at $SPEEDTEST_BIN" | tee -a "$LOG_FILE"
    exit 1
fi

# Run speedtest with JSON output
RESULT=$($SPEEDTEST_BIN --server-id="$SERVER_ID" --format=json --accept-license --accept-gdpr 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "ERROR: speedtest failed with exit code $EXIT_CODE" | tee -a "$LOG_FILE"
    echo "$RESULT" >> "$LOG_FILE"
    exit 1
fi

# Parse result if JSON available
echo "$RESULT" | head -1 | grep -q "^{" && IS_JSON=true || IS_JSON=false

if [ "$IS_JSON" = true ]; then
    # Extract fields using jq
    TIMESTAMP=$(echo "$RESULT" | jq -r '.timestamp // now' 2>/dev/null | head -1)
    if [ -z "$TIMESTAMP" ] || [ "$TIMESTAMP" = "null" ]; then
        TIMESTAMP=$(date -Iseconds)
    fi
    
    # Convert bits to Mbps (speedtest outputs in bits, divide by 1,000,000)
    DOWNLOAD_RAW=$(echo "$RESULT" | jq -r '.download.bandwidth // 0' 2>/dev/null)
    UPLOAD_RAW=$(echo "$RESULT" | jq -r '.upload.bandwidth // 0' 2>/dev/null)
    DOWNLOAD=$(echo "scale=2; $DOWNLOAD_RAW * 8 / 1000000" | bc 2>/dev/null || echo "0")
    UPLOAD=$(echo "scale=2; $UPLOAD_RAW * 8 / 1000000" | bc 2>/dev/null || echo "0")
    
    PING=$(echo "$RESULT" | jq -r '.ping.latency // 0' 2>/dev/null)
    SERVER_NAME=$(echo "$RESULT" | jq -r '.server.name // "N/A"' 2>/dev/null)
    SERVER_LOC=$(echo "$RESULT" | jq -r '.server.location // "N/A"' 2>/dev/null)
    SERVER_ID_ACTUAL=$(echo "$RESULT" | jq -r '.server.id // "N/A"' 2>/dev/null)
    ISP=$(echo "$RESULT" | jq -r '.isp // "N/A"' 2>/dev/null)
    RESULT_URL=$(echo "$RESULT" | jq -r '.result.url // "N/A"' 2>/dev/null)
    
    # Create result object
    cat > "$OUTPUT_FILE" << JSON
{
  "timestamp": "$TIMESTAMP",
  "server_id": $SERVER_ID_ACTUAL,
  "server_name": "$SERVER_NAME",
  "server_location": "$SERVER_LOC",
  "isp": "$ISP",
  "download_mbps": $DOWNLOAD,
  "upload_mbps": $UPLOAD,
  "ping_ms": $PING,
  "url": "$RESULT_URL"
}
JSON

    # Append to history using jq
    if [ -f "$HISTORY_FILE" ]; then
        jq ". + [$OUTPUT_FILE]" "$HISTORY_FILE" > "$HISTORY_FILE.tmp" 2>/dev/null && mv "$HISTORY_FILE.tmp" "$HISTORY_FILE" 2>/dev/null || cat "$OUTPUT_FILE" >> "$HISTORY_FILE"
    else
        echo "[$RESULT]" > "$HISTORY_FILE"
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
