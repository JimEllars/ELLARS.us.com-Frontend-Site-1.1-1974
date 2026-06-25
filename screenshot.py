from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(record_video_dir="videos/")
    page.goto('http://localhost:5173/about')
    page.wait_for_timeout(3000)
    page.screenshot(path='screenshot.png', full_page=True)
    browser.close()
