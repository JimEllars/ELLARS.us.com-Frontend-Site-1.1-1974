from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        time.sleep(2)  # Wait for page to load

        # Take a full page screenshot
        page.screenshot(path="full_page_screenshot.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    run()
