import sys

with open("src/components/home/Ventures.jsx", "r") as f:
    content = f.read()

# Remove the Strategic Assets block
# The block starts with `<div className="mt-32 mb-16 text-center">`
# and ends right before `</motion.div>\n    </section>`

start_index = content.find('<div className="mt-32 mb-16 text-center">')
end_index = content.rfind('</motion.div>\n    </section>')
# Since we have two `</motion.div>` there, the first rfind will find the very last `</motion.div>` which belongs to the parent.
# Wait, let's carefully replace using regex or string replace.

import re

# Remove handleAssetDownload
content = re.sub(r'\s*const handleAssetDownload = \(assetId\) => \{\s*console\.log\(`Prepared to download asset: \$\{assetId\}`\);\s*\};\s*', '\n\n', content)

# Remove the strategic assets section
content = re.sub(r'<div className="mt-32 mb-16 text-center">.*?STRATEGIC.*?<span className="text-electric-gold">ASSETS</span></h2>\s*</div>\s*<motion\.div variants=\{containerVariant\}.*?className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">.*?\]\.map\(\(asset, idx\) => \(.*?</motion\.div>\s*\)\)\}\s*</motion\.div>', '', content, flags=re.DOTALL)

with open("src/components/home/Ventures.jsx", "w") as f:
    f.write(content)

print("Patched Ventures.jsx")
