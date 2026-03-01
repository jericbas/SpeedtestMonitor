#!/bin/bash
cd /home/je/SpeedtestMonitor

# Run speedtest
node speedtest-monitor.js --verbose --output=full

# Read results
RESULTS=$(cat speedtest-data.json 2>/dev/null | jq -r '"\(.download) Mbps down / \(.upload) Mbps up / \(.ping) ms ping"' 2>/dev/null)

# Log results
if [ -n "$RESULTS" ]; then
    echo "[$RESULTS] Speedtest completed: $RESULTS"
fi

echo "Speedtest complete at $(date)"
