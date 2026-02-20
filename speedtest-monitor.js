// speedtest-monitor.js
// Playwright script to run a speedtest with Mandaluyong server, capture results

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

  // Click Change Server button
  console.log('Clicking Change Server...');
  try {
    const changeServerBtn = await page.locator('a.js-change-server, .change-server, a:has-text("Change Server"), button:has-text("Change Server")').first();
    await changeServerBtn.click({ timeout: 10000 });
    console.log('Change Server button clicked');
  } catch (e) {
    console.log('Could not find Change Server button, proceeding with default server');
  }

  // Wait for server modal/dialog
  await page.waitForTimeout(2000);

  // Search for Mandaluyong
  console.log('Searching for Mandaluyong server...');
  try {
    const searchInput = await page.locator('input[placeholder*="server"], input[placeholder*="search"], .server-search input, input[type="text"]').first();
    await searchInput.fill('Mandaluyong', { timeout: 5000 });
    await page.waitForTimeout(1500);

    // Click on Mandaluyong option
    const mandaluyongOption = await page.locator('text=Mandaluyong, label:Mandaluyong, .server-list-item:has-text("Mandaluyong"), li:has-text("Mandaluyong"), div:has-text("Mandaluyong")').first();
    await mandaluyongOption.click({ timeout: 10000 });
    console.log('Mandaluyong server selected');

    // Wait for modal to close automatically
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('Could not select Mandaluyong server, proceeding with default:', e.message);
  }

  // Click GO button
  console.log('Starting speedtest...');
  const goButton = await page.locator('a.js-start-test').first();
  await goButton.click({ timeout: 10000 });
  console.log('GO button clicked - test running...');

  // Wait for download result
  console.log('Waiting for download result...');
  const download = await waitForSpeedValue(page, '.download-speed.result-data-value');
  console.log(`Download: ${download} Mbps`);

  // Wait for upload result
  console.log('Waiting for upload result...');
  const upload = await waitForSpeedValue(page, '.upload-speed.result-data-value');
  console.log(`Upload: ${upload} Mbps`);

  // Get ping
  let ping = 'N/A';
  try {
    ping = await page.locator('.ping-speed.result-data-value').textContent({ timeout: 5000 });
  } catch (e) {}
  console.log(`Ping: ${ping.trim()} ms`);

  // Click Share button to get result URL
  console.log('Getting result URL...');
  let resultUrl = await page.url();
  try {
    const shareBtn = await page.locator('a:has-text("Share"), button:has-text("Share"), .share-action').first();
    await shareBtn.click({ timeout: 5000 });
    await page.waitForTimeout(2000);

    const resultIdEl = await page.locator('.result-id, input[readonly]').first();
    const resultText = await resultIdEl.textContent() || await resultIdEl.inputValue();
    if (resultText && resultText.trim()) {
      const resultId = resultText.trim().replace(/^#/, '');
      resultUrl = `https://www.speedtest.net/result/${resultId}`;
    }
  } catch (e) {
    console.log('Could not get result URL from Share, using current page URL');
    try {
      const pageUrl = await page.url();
      const match = pageUrl.match(/\/(\d+)$/);
      if (match) {
        resultUrl = `https://www.speedtest.net/result/${match[1]}`;
      }
    } catch (_) {}
  }

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
    server: 'Mandaluyong',
    download: download,
    upload: upload,
    ping: ping.trim(),
    url: resultUrl
  };
  fs.writeFileSync('speedtest-data.json', JSON.stringify(results, null, 2));
  console.log('Results saved: speedtest-data.json');

  // Output ONLY the result URL (as requested)
  console.log(resultUrl);

  await browser.close();
})();
