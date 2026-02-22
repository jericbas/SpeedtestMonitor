# SpeedtestMonitor

Automated speedtest monitoring using Playwright — captures internet speed test results from speedtest.net with a specified server location.

## What It Does

- Runs automated speed tests using [Playwright](https://playwright.dev) against speedtest.net
- Targets a specific server location (default: Mandaluyong)
- Captures results for monitoring/logging purposes

## Prerequisites

- Node.js >= 18.0.0
- Playwright dependencies installed

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browser
npm run install:playwright

# Run the speed test
npm start
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the speedtest monitor |
| `npm test` | Alias for start |
| `npm run install:playwright` | Install Chromium browser for Playwright |

## Configuration

The script uses a specific server location — check `speedtest-monitor.js` to modify the target server or adjust timing parameters.

## License

MIT
