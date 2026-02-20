// speedtest-monitor.js
// Playwright script to run a speedtest with retry logic
// Usage: node speedtest-monitor.js [--verbose] [--output=url|json|full]

const { chromium } = require('playwright');
const fs = require('fs');

const verbose = process.argv.includes('--verbose');
const outputArg = process.argv.find(arg => arg.startsWith('--output='));
const outputFormat = outputArg ? outputArg.split('=')[1] : 'url';
const MAX_RETRIES = 3;

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

  let resultUrl = await page.url();
  try {
    await page.waitForSelector('.result-container', { timeout: 10000 });
  } catch (e) {}

  const pageUrl = await page.url();
  const match = pageUrl.match(/\/(\d+)$/);
  if (match) {
    resultUrl = `https://www.speedtest.net/result/${match[1]}`;
  }

  const results = {
    timestamp: new Date().toISOString(),
    download: download,
    upload: upload,
    ping: ping.trim(),
    url: resultUrl
  };
  fs.writeFileSync('speedtest-data.json', JSON.stringify(results, null, 2));
  await page.screenshot({ path: 'speedtest-result.png', fullPage: true });

  // Output based on format
  if (outputFormat === 'json') {
    console.log(JSON.stringify(results, null, 2));
  } else if (outputFormat === 'full') {
    console.log('\n=== SPEEDTEST RESULTS ===');
    console.log(`Download: ${download} Mbps`);
    console.log(`Upload: ${upload} Mbps`);
    console.log(`Ping: ${ping.trim()} ms`);
    console.log(`URL: ${resultUrl}`);
    console.log('=========================\n');
  } else {
    // Default: url only
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
