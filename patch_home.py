import sys

with open("src/pages/Home.jsx", "r") as f:
    content = f.read()

content = content.replace("<Ventures />\n      <Expertise />\n      <RantsFeed />", "<Ventures />\n      <RantsFeed />\n      <Expertise />")

with open("src/pages/Home.jsx", "w") as f:
    f.write(content)

print("Patched Home.jsx")
