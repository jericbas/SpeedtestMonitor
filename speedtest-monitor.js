// speedtest-monitor.js
// Playwright script to run a speedtest, capture results and screenshot.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to speedtest.net...');
  await page.goto('https://www.speedtest.net/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Close consent/cookie modal if it appears
  try {
    const consentBtn = await page.locator('button:has-text("Continue")').first().or(
      page.locator('button:has-text("I Agree")').first()
    ).or(
      page.locator('[data-testid="banner-close-button"]')
    );
    await consentBtn.click({ timeout: 5000 });
    console.log('Closed consent modal');
  } catch (_) {}

  // Try to find and click the "GO" button (the big start button)
  console.log('Starting speedtest...');
  try {
    // Try different selector strategies for the GO button
    const goButton = await page.locator('a[href*="run"]').first().or(
      page.locator('.js-start-test').first()
    ).or(
      page.locator('span:has-text("GO")').first()
    ).or(
      page.locator('text=GO').first()
    );
    await goButton.click({ timeout: 10000 });
  } catch (e) {
    console.log('Could not find GO button, trying alternative...');
    // Click anywhere near the center of the test area
    await page.click('.test-wrapper, #start-test, body', { force: true });
  }

  // Wait for the test to complete (up to 2 minutes)
  console.log('Running speedtest...');
  
  // Wait for upload test to appear (means download is done)
  await page.waitForSelector('text=/upload/i', { timeout: 120000 }).catch(() => {});
  
  // Wait a bit more for test completion
  await page.waitForTimeout(5000);

  // Extract results with multiple fallback strategies
  let download = '';
  let upload = '';
  let resultUrl = '';

  try {
    // Try to get download speed
    download = await page.locator('.download-speed, [class*="download"]').first().textContent({ timeout: 5000 });
  } catch (e) {
    download = await page.locator('text=/\\d+\\s*Mbps/i').first().textContent({ timeout: 5000 }).catch(() => 'N/A');
  }

  try {
    // Try to get upload speed  
    upload = await page.locator('.upload-speed, [class*="upload"]').first().textContent({ timeout: 5000 });
  } catch (e) {
    upload = await page.locator('text=/\\d+\\s*Mbps/i').nth(1).textContent({ timeout: 5000 }).catch(() => 'N/A');
  }

  // Take screenshot
  await page.screenshot({ path: 'speedtest-result.png', fullPage: true });
  console.log('Screenshot saved: speedtest-result.png');

  // Try to get share URL
  try {
    const shareBtn = await page.locator('button:has-text("Share"), a:has-text("Share"), [data-testid*="share"]').first();
    await shareBtn.click({ timeout: 5000 });
    await page.waitForTimeout(2000);
    
    const urlInput = await page.locator('input[type="url"], input[readonly]').first();
    resultUrl = await urlInput.inputValue();
  } catch (_) {
    resultUrl = await page.url();
  }

  console.log('Download:', download.trim());
  console.log('Upload:', upload.trim());
  console.log('Result URL:', resultUrl.trim() || await page.url());

  await browser.close();
})();
