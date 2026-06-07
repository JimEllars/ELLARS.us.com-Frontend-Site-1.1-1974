import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173/ecosystem', { timeout: 10000 });
    console.log("Navigated to /ecosystem");

    // Wait for the ecosystem grid loading state to finish (should take ~1200ms)
    await page.waitForSelector('.interactive-card', { timeout: 5000 });
    console.log("Ecosystem Grid cards loaded");

    // Check Demand Letter Form exists
    await page.waitForSelector('input[name="partyName"]', { timeout: 5000 });
    console.log("Demand Letter form step 1 visible");

    // Fill Step 1
    await page.fill('input[name="partyName"]', 'Test Party');
    await page.fill('input[name="partyAddress"]', '123 Fake St');
    await page.click('button:has-text("Proceed")');

    // Wait and Fill Step 2
    await page.waitForSelector('textarea[name="grievanceDetails"]', { timeout: 5000 });
    await page.fill('textarea[name="grievanceDetails"]', 'Testing grievance detail');
    await page.click('button:has-text("Proceed")');

    // Wait and Fill Step 3
    await page.waitForSelector('textarea[name="resolutionDemands"]', { timeout: 5000 });
    await page.fill('textarea[name="resolutionDemands"]', 'Resolution test');
    await page.click('button:has-text("Generate Protocol")');

    // Check Loading State
    await page.waitForSelector('text=[SYNTHESIZING LEGAL DIRECTIVE]', { timeout: 2000 });
    console.log("Loading state triggered");

    // Wait for Success
    await page.waitForSelector('text=Directive Executed', { timeout: 5000 });
    console.log("Success state reached");

    console.log("All UI tests passed.");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
