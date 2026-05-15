import sys
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Create a context with record_video_dir
        context = browser.new_context(record_video_dir="videos/")
        page = context.new_page()
        try:
            page.goto('http://localhost:5173/news-media')
            page.wait_for_timeout(2000)
            page.screenshot(path='news-media.png')

            page.goto('http://localhost:5173/platform')
            page.wait_for_timeout(2000)
            page.screenshot(path='platform.png')

            page.goto('http://localhost:5173/about')
            page.wait_for_timeout(2000)
            page.screenshot(path='about.png')

            page.goto('http://localhost:5173/')
            page.wait_for_timeout(2000)
            page.screenshot(path='home.png')
            print("Screenshots and videos captured.")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    main()
