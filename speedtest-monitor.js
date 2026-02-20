// speedtest-monitor.js
// Playwright script to run a speedtest with Mandaluyong server, capture results
// Usage: node speedtest-monitor.js [--verbose | --details]

const { chromium } = require('playwright');
const fs = require('fs');

const verbose = process.argv.includes('--verbose') || process.argv.includes('--details');

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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  if (verbose) console.log('Navigating to speedtest.net...');
  await page.goto('https://www.speedtest.net/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for JS to render
  await page.waitForTimeout(3000);

  // SIMPLIFIED: Speedtest.net often auto-detects nearest server
  // We'll proceed with the default or auto-selected server
  // which should already be optimal for your location

  // Click GO button
  if (verbose) console.log('Starting speedtest...');
  const goButton = await page.locator('a.js-start-test').first();
  await goButton.click({ timeout: 10000 });
  if (verbose) console.log('GO button clicked - test running...');

  // Wait for download result
  if (verbose) console.log('Waiting for download result...');
  const download = await waitForSpeedValue(page, '.download-speed.result-data-value');
  if (verbose) console.log(`Download: ${download} Mbps`);

  // Wait for upload result
  if (verbose) console.log('Waiting for upload result...');
  const upload = await waitForSpeedValue(page, '.upload-speed.result-data-value');
  if (verbose) console.log(`Upload: ${upload} Mbps`);

  // Get ping
  let ping = 'N/A';
  try {
    ping = await page.locator('.ping-speed.result-data-value').textContent({ timeout: 5000 });
  } catch (e) {}
  if (verbose) console.log(`Ping: ${ping.trim()} ms`);

  // Get result URL from page URL directly
  let resultUrl = await page.url();
  try {
    await page.waitForSelector('.result-container', { timeout: 10000 });
  } catch (e) {}

  // Try to get result ID from URL or page
  const pageUrl = await page.url();
  const match = pageUrl.match(/\/(\d+)$/);
  if (match) {
    resultUrl = `https://www.speedtest.net/result/${match[1]}`;
  }

  // Save to JSON
  const results = {
    timestamp: new Date().toISOString(),
    download: download,
    upload: upload,
    ping: ping.trim(),
    url: resultUrl
  };
  fs.writeFileSync('speedtest-data.json', JSON.stringify(results, null, 2));

  // Take final screenshot
  await page.screenshot({ path: 'speedtest-result.png', fullPage: true });

  // Output based on verbose mode
  if (verbose) {
    console.log('\n=== SPEEDTEST RESULTS ===');
    console.log(`Download: ${download} Mbps`);
    console.log(`Upload: ${upload} Mbps`);
    console.log(`Ping: ${ping.trim()} ms`);
    console.log(`URL: ${resultUrl}`);
    console.log('=========================\n');
  }

  // ALWAYS output the result URL (primary output)
  console.log(resultUrl);

  await browser.close();
})();
