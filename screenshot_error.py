from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        # Go to an empty slug (which doesn't exist, we'll try something that should trigger the fallback)
        page.goto("http://localhost:5173/articles/invalid-slug")
        time.sleep(2)  # Wait for page to load

        # Take a screenshot
        page.screenshot(path="error_screenshot.png")

        browser.close()

if __name__ == "__main__":
    run()
