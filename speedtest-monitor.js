// speedtest-monitor.js
// Playwright script to run a speedtest, capture results and screenshot.
const { chromium } = require('playwright');
const fs = require('fs');

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
  
  console.log('Navigating to speedtest.net...');
  await page.goto('https://www.speedtest.net/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  // Wait for JS to render
  await page.waitForTimeout(3000);
  
  // Click GO button
  console.log('Starting speedtest...');
  const goButton = await page.locator('a.js-start-test').first();
  await goButton.click({ timeout: 10000 });
  console.log('GO button clicked - test running...');
  
  // Wait for actual numeric download value (not placeholder)
  console.log('Waiting for download result...');
  const download = await waitForSpeedValue(page, '.download-speed.result-data-value');
  console.log(`Download: ${download} Mbps`);
  
  // Wait for upload result
  console.log('Waiting for upload result...');
  const upload = await waitForSpeedValue(page, '.upload-speed.result-data-value');
  console.log(`Upload: ${upload} Mbps`);
  
  // Get ping (usually ready quickly)
  let ping = '';
  try {
    ping = await page.locator('.ping-speed.result-data-value').textContent({ timeout: 5000 });
  } catch (e) {
    ping = 'N/A';
  }
  
  console.log(`Ping: ${ping.trim()} ms`);
  
  // Get result URL
  let resultUrl = await page.url();
  try {
    const resultId = await page.locator('.result-id').textContent({ timeout: 5000 });
    if (resultId && resultId.trim()) {
      resultUrl = `https://www.speedtest.net/result/${resultId.trim()}`;
    }
  } catch (e) {}
  
  // Take final screenshot
  await page.screenshot({ path: 'speedtest-result.png', fullPage: true });
  console.log('Screenshot saved: speedtest-result.png');

  // Output results
  console.log('\n=== SPEEDTEST RESULTS ===');
  console.log(`Download: ${download} Mbps`);
  console.log(`Upload: ${upload} Mbps`);
  console.log(`Ping: ${ping.trim()} ms`);
  console.log(`URL: ${resultUrl}`);
  console.log('=========================\n');
  
  // Save to JSON
  const results = {
    timestamp: new Date().toISOString(),
    download: download,
    upload: upload,
    ping: ping.trim(),
    url: resultUrl
  };
  fs.writeFileSync('speedtest-data.json', JSON.stringify(results, null, 2));
  console.log('Results saved: speedtest-data.json');

  await browser.close();
})();
