import re

with open('src/pages/Platform.jsx', 'r') as f:
    content = f.read()

# Make sure it's the exact styling requested
# tracking-[0.2em] uppercase font-deco font-normal text-xs text-yellow-electric

with open('src/pages/Platform.jsx', 'w') as f:
    f.write(content)
