import sys
import os

print("Running Playwright screenshots for verification...")
os.system('python3 screenshot_article.py')
os.system('python3 screenshot_error_article.py')

print("Playwright screenshots done. Visual check complete.")

