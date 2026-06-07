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

    // Instead of text matcher which might match incorrectly, use explicit locator
    await page.locator('button', { hasText: /^Proceed$/ }).click();
    console.log("Clicked Proceed on Step 1");

    // Wait and Fill Step 2
    await page.waitForTimeout(1500); // Give Framer Motion time to transition

    // Evaluate to fill since playwright can be finicky with animations sometimes
    await page.evaluate(() => {
       const el = document.querySelector('textarea[name="grievanceDetails"]');
       if(el) { el.value = 'Testing grievance detail'; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });

    await page.locator('button', { hasText: /^Proceed$/ }).click();
    console.log("Clicked Proceed on Step 2");

    // Wait and Fill Step 3
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
       const el = document.querySelector('textarea[name="resolutionDemands"]');
       if(el) { el.value = 'Resolution test'; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });

    await page.locator('button[type="submit"]').click();
    console.log("Clicked Generate Protocol on Step 3");

    // Check Loading State
    await page.waitForSelector('text=[SYNTHESIZING LEGAL DIRECTIVE]', { timeout: 5000 });
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
