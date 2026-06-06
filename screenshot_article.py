from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        # Test loading screen
        page.goto('http://localhost:5173/article/siphon-economy', wait_until='domcontentloaded')
        page.screenshot(path='article_loading.png')

        # Wait for data to load
        time.sleep(3)
        page.screenshot(path='article_loaded.png', full_page=True)

        browser.close()

if __name__ == '__main__':
    run()
