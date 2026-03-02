# Speedtest CLI Setup

## Prerequisites

Install the official Ookla Speedtest CLI:

```bash
# Ubuntu/Debian
curl -s https://install.speedtest.net/app/files/ookla-speedtest-1.2.0-linux-x86_64.tgz | sudo tar xzf - -C /usr/local/bin --strip-components=1

# Or follow official instructions:
# https://www.speedtest.net/apps/cli
```

## Verify Installation

```bash
speedtest --version
```

## Server ID

Server ID 36738 = Mandaluyong, Philippines (Converge ICT)

Find other servers:
```bash
speedtest --servers
```

## Files

- `run-speedtest.sh` - Runs speedtest and saves results
- `speedtest-latest.json` - Latest result
- `speedtest-history.json` - All results over time

## Timer

Runs every hour with random 0-30min delay via systemd.

Control:
```bash
systemctl --user status speedtest-cli.timer
systemctl --user stop speedtest-cli.timer
systemctl --user start speedtest-cli.timer  
```
