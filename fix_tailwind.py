import re

with open('tailwind.config.js', 'r') as f:
    content = f.read()

content = content.replace("            fontFamily: {", "      fontFamily: {")

with open('tailwind.config.js', 'w') as f:
    f.write(content)
