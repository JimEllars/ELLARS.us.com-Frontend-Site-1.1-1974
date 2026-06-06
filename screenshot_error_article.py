from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        # Test error state
        page.goto('http://localhost:5173/article/invalid-slug', wait_until='domcontentloaded')

        # Wait for fallback mode
        time.sleep(3)
        page.screenshot(path='article_error.png')

        browser.close()

if __name__ == '__main__':
    run()
