from playwright.sync_api import sync_playwright
import time
import subprocess
import os

# Start dev server
process = subprocess.Popen(["npm", "run", "dev"])
time.sleep(5)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173")
    time.sleep(3)
    page.screenshot(path="screenshot.png")

    # Try testing the calculator specific link to see the url param hydrating properly
    page.goto("http://localhost:5173/the-platform?roi=30")
    time.sleep(3)
    page.screenshot(path="calculator_screenshot.png")

    browser.close()

process.terminate()
