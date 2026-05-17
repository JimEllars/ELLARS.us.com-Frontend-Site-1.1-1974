import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(record_video_dir="videos/")

    # Homepage (Bio)
    page.goto('http://localhost:5173')
    time.sleep(2)
    page.screenshot(path='homepage.png')

    # About
    page.goto('http://localhost:5173/about')
    time.sleep(2)
    page.screenshot(path='about.png')

    # News Media
    page.goto('http://localhost:5173/news')
    time.sleep(2)
    page.screenshot(path='news.png')

    browser.close()
