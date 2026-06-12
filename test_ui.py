from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="videos/")
        page = context.new_page()

        try:
            page.goto("http://localhost:5173", timeout=30000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path="screenshots/home.png")

            page.goto("http://localhost:5173/about", timeout=30000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path="screenshots/about.png")

            # Form submission would go here...

            page.goto("http://localhost:5173/articles/sample-article", timeout=30000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path="screenshots/article.png")

        except Exception as e:
            print(f"Error during tests: {e}")

        context.close()
        browser.close()

if __name__ == "__main__":
    run()
