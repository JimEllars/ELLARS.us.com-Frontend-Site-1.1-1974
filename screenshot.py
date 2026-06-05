from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(record_video_dir=".")

        print("Testing Newsletter submission UI and ventures grids")
        # Load the app
        page.goto('http://localhost:5173')
        page.wait_for_timeout(3000)

        # Take a screenshot of the home page
        page.screenshot(path='home_full.png', full_page=True)

        print("Testing Platform UI changes")
        # Go to platform page
        page.goto('http://localhost:5173/platform')
        page.wait_for_timeout(3000)
        page.screenshot(path='platform_full.png', full_page=True)

        print("Testing Invalid Article Detail")
        # Go to an invalid slug page
        page.goto('http://localhost:5173/article/')
        page.wait_for_timeout(3000)
        page.screenshot(path='article_invalid.png', full_page=True)

        browser.close()

verify()
