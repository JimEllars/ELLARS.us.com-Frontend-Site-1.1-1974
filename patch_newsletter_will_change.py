import re

with open('src/components/home/Newsletter.jsx', 'r') as f:
    content = f.read()

# Add will-change: transform to the Framer motion elements to ensure jitter-free scrolling
content = content.replace(
    'className="deco-frame border border-yellow-electric/30 bg-surface px-8 py-6 max-w-2xl mx-auto rounded-sm animate-pulse shadow-[0_0_15px_rgba(253,224,71,0.4)]"',
    'className="deco-frame border border-yellow-electric/30 bg-surface px-8 py-6 max-w-2xl mx-auto rounded-sm animate-pulse shadow-[0_0_15px_rgba(253,224,71,0.4)] will-change-transform"'
)

with open('src/components/home/Newsletter.jsx', 'w') as f:
    f.write(content)
