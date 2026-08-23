const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route('**/*', (route) => route.continue());

  // Just testing if the app loads without a white screen error
  console.log("Navigating to local preview server...");
  await page.goto('http://localhost:4173/');

  // Taking a screenshot to visually verify
  await page.screenshot({ path: 'test_screenshot.png' });

  console.log("Screenshot taken.");

  await browser.close();
})();
