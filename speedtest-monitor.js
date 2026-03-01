// speedtest-monitor.js
// Playwright script to run a speedtest with retry logic
// Usage: node speedtest-monitor.js [--verbose] [--output=url|json|full] [--save-history]

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const verbose = process.argv.includes('--verbose');
const outputArg = process.argv.find(arg => arg.startsWith('--output='));
const outputFormat = outputArg ? outputArg.split('=')[1] : 'url';
const saveHistory = process.argv.includes('--save-history');
const MAX_RETRIES = 3;

// History file path
const HISTORY_FILE = path.join(__dirname, 'speedtest-history.json');

async function waitForSpeedValue(page, selector, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const text = await page.locator(selector).textContent({ timeout: 1000 });
      if (text && text.trim() !== '' && text.trim() !== '—' && /^[\d.,]+$/.test(text.trim().replace(/\s/g, ''))) {
        return text.trim();
      }
    } catch (e) {}
    await page.waitForTimeout(500);
  }
  throw new Error(`Timeout waiting for speed value from ${selector}`);
}

function saveToHistory(results) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf8');
      history = JSON.parse(data);
    }
    history.push(results);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    if (verbose) console.log(`Saved to history: ${HISTORY_FILE}`);
  } catch (e) {
    console.error(`Failed to save history: ${e.message}`);
  }
}

async function runSpeedtest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  if (verbose) console.log('Navigating to speedtest.net...');
  await page.goto('https://www.speedtest.net/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  if (verbose) console.log('Starting speedtest...');
  const goButton = await page.locator('a.js-start-test').first();
  await goButton.click({ timeout: 10000 });
  if (verbose) console.log('GO button clicked - test running...');
  
  if (verbose) console.log('Waiting for download result...');
  const download = await waitForSpeedValue(page, '.download-speed.result-data-value');
  if (verbose) console.log(`Download: ${download} Mbps`);
  
  if (verbose) console.log('Waiting for upload result...');
  const upload = await waitForSpeedValue(page, '.upload-speed.result-data-value');
  if (verbose) console.log(`Upload: ${upload} Mbps`);
  
  let ping = 'N/A';
  try {
    ping = await page.locator('.ping-speed.result-data-value').textContent({ timeout: 5000 });
  } catch (e) {}
  if (verbose) console.log(`Ping: ${ping.trim()} ms`);
  
  // Wait a bit for result data to settle
  await page.waitForTimeout(2000);
  
  // Try multiple methods to get result URL
  let resultUrl = 'https://www.speedtest.net/';
  
  // Method 1: Check page URL
  const pageUrl = await page.url();
  const match = pageUrl.match(/\/result\/(\d+)/);
  if (match) {
    resultUrl = `https://www.speedtest.net/result/${match[1]}`;
  }
  
  // Method 2: Look for result container and copy link (if available)
  try {
    const resultLink = await page.locator('a[href*="/result/"]').first().getAttribute('href');
    if (resultLink && resultLink.includes('/result/')) {
      resultUrl = resultLink.startsWith('http') ? resultLink : `https://www.speedtest.net${resultLink}`;
    }
  } catch (e) {}
  
  // Method 3: Check for result ID in page content
  try {
    const resultId = await page.locator('.result-id, [data-resultid], #result-id').textContent({ timeout: 2000 });
    if (resultId && /^\d+$/.test(resultId.trim())) {
      resultUrl = `https://www.speedtest.net/result/${resultId.trim()}`;
    }
  } catch (e) {}
  
  if (verbose) console.log(`Result URL: ${resultUrl}`);
  
  const results = {
    timestamp: new Date().toISOString(),
    download: download,
    upload: upload,
    ping: ping.trim(),
    url: resultUrl
  };
  
  // Save current results
  fs.writeFileSync('speedtest-data.json', JSON.stringify(results, null, 2));
  
  // Append to history if requested
  if (saveHistory) {
    saveToHistory(results);
  }
  
  await page.screenshot({ path: 'speedtest-result.png', fullPage: true });
  
  // Output based on format
  if (outputFormat === 'json') {
    console.log(JSON.stringify(results, null, 2));
  } else if (outputFormat === 'full') {
    console.log('\n=== SPEEDTEST RESULTS ===');
    console.log(`Timestamp: ${results.timestamp}`);
    console.log(`Download:  ${download} Mbps`);
    console.log(`Upload:    ${upload} Mbps`);
    console.log(`Ping:      ${ping.trim()} ms`);
    console.log(`URL:       ${resultUrl}`);
    console.log('=========================\n');
  } else {
    console.log(resultUrl);
  }
  
  await browser.close();
}

(async () => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (verbose && attempt > 1) {
      console.log(`Retry attempt ${attempt}/${MAX_RETRIES}...`);
    }
    try {
      await runSpeedtest();
      return;
    } catch (error) {
      lastError = error;
      if (verbose) {
        console.log(`Attempt ${attempt} failed: ${error.message}`);
      }
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  console.error(`Failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
  process.exit(1);
})();
