# ⚠️ ARCHIVED — SpeedtestMonitor

> **Status:** This project is archived. It served its purpose as a learning exercise, but a much better solution exists.

## The Discovery

**I didn't know that speedtest.net had an official CLI command.**

This repository originally used Playwright to automate a browser and scrape speedtest.net results — a complex, fragile approach. After building this, I discovered that Ookla provides an official command-line tool (`speedtest`) that does everything this project does, but better, faster, and more reliably.

**The CLI version is in the [`cli/`](cli/) directory.**

---

## What This Project Was

Automated speedtest monitoring using Playwright — originally captured internet speed test results from speedtest.net by controlling a headless browser.

### Why It Existed
- Learn Playwright automation
- Capture speed test results programmatically
- Target specific server locations

### Why It's Archived
The browser-automation approach is unnecessary when `speedtest --server-id=36738` works instantly.

---

## Recommended Approach: Official CLI

```bash
# Install official CLI (via snap, apt, or manual install)
snap install speedtest

# Run with specific server
speedtest --server-id=36738 --format=json --accept-license --accept-gdpr

# Much faster, no browser overhead, official API
```

See [`cli/README.md`](cli/README.md) for the working CLI setup.

---

## Original Playwright Version (Legacy)

<details>
<summary>Click to see original Playwright docs</summary>

### Prerequisites
- Node.js >= 18.0.0
- Playwright dependencies installed

### Quick Start
```bash
# Install dependencies
npm install

# Install Playwright browser
npm run install:playwright

# Run the speed test
npm start
```

### Scripts
| Command | Description |
|---------|-------------|
| `npm start` | Run the speedtest monitor |
| `npm test` | Alias for start |
| `npm run install:playwright` | Install Chromium browser for Playwright |

</details>

---

## Lessons Learned

1. **Check for official tools first** — Browser automation is overkill when a CLI exists
2. **Complexity ≠ Better** — The simple bash script in `cli/` is more reliable
3. **API > Scraping** — Official APIs/format beats DOM parsing every time

---

## License

MIT
