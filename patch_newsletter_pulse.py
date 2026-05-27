import re

with open('src/components/home/Newsletter.jsx', 'r') as f:
    content = f.read()

# Update the victory state styling for the electric pulse loop
content = content.replace(
    'className="deco-frame border border-yellow-electric/30 bg-surface px-8 py-6 max-w-2xl mx-auto rounded-sm animate-[pulse_2s_ease-in-out_infinite]"',
    'className="deco-frame border border-yellow-electric/30 bg-surface px-8 py-6 max-w-2xl mx-auto rounded-sm animate-pulse shadow-[0_0_15px_rgba(253,224,71,0.4)]"'
)

with open('src/components/home/Newsletter.jsx', 'w') as f:
    f.write(content)
