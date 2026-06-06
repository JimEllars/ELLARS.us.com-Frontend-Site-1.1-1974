with open('src/components/home/RantsFeed.jsx', 'r') as f:
    content = f.read()

# Fix the map
content = content.replace('            ))', '            )})')
content = content.replace('              </div>\n            )})', '              </div>\n            ))')

with open('src/components/home/RantsFeed.jsx', 'w') as f:
    f.write(content)
