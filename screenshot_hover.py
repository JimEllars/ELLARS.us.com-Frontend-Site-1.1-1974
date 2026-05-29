from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        time.sleep(2)  # Wait for page to load

        # Hover over the first digital asset card
        page.hover(".deco-brackets")
        time.sleep(1) # wait for hover effect

        # Take a screenshot
        page.screenshot(path="hover_screenshot.png")

        browser.close()

if __name__ == "__main__":
    run()
