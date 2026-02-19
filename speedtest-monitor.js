// speedtest-monitor.js
// Playwright script to run a speedtest, select Mandaluyong server, capture results and screenshot.

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.speedtest.net/');

  // Close consent modal if it appears
  try {
    const consentBtn = await page.waitForSelector('button[data-testid="banner-close-button"]', { timeout: 5000 });
    await consentBtn.click();
  } catch (_) {}

  // Open server list and select Mandaluyong
  await page.click('button[data-testid="server-list-button"]');
  const serverSearch = await page.waitForSelector('input[data-testid="search-servers-input"]');
  await serverSearch.fill('Mandaluyong');
  // Wait for the server list to populate and click the first result
  await page.waitForTimeout(2000);
  const serverOption = await page.locator('text=Mandaluyong').first();
  await serverOption.click();

  // Start the test by clicking the big GO button
  await page.click('button[data-testid="start-button"]');

  // Wait for the test to finish – the result panel becomes visible
  await page.waitForSelector('div[data-testid="speed-indicator-Download"] .result-data-large', { timeout: 120000 });

  // Extract download and upload speeds
  const download = await page.textContent('div[data-testid="speed-indicator-Download"] .result-data-large');
  const upload   = await page.textContent('div[data-testid="speed-indicator-Upload"] .result-data-large');

  // Get the share URL (button with data-testid="share-results-button")
  await page.click('button[data-testid="share-results-button"]');
  const urlInput = await page.waitForSelector('input[data-testid="share-link-input"]');
  const resultUrl = await urlInput.inputValue();

  // Screenshot of the result panel
  await page.screenshot({ path: 'speedtest-result.png', fullPage: true });

  console.log('Download:', download.trim());
  console.log('Upload:', upload.trim());
  console.log('Result URL:', resultUrl.trim());

  await browser.close();
})();
