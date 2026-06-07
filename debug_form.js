import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:4173/ecosystem', { timeout: 10000 });

    // Fill Step 1
    await page.fill('input[name="partyName"]', 'Test Party');
    await page.fill('input[name="partyAddress"]', '123 Fake St');
    await page.locator('button', { hasText: /^Proceed$/ }).click();

    // Take screenshot to see where we are
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'step2.png' });

    const html = await page.content();
    fs.writeFileSync('step2.html', html);

    console.log("Debug info saved.");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
})();
