import re

with open('src/pages/Platform.jsx', 'r') as f:
    content = f.read()

assert "THE WORKERS' INFRASTRUCTURE SHELL" in content
assert "THE NEXT-GEN TRANSIT MANDATE" in content
assert "POLITICAL ACCOUNTABILITY METRIC" in content

print("Modules OK")
