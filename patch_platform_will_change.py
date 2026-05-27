import re

with open('src/pages/Platform.jsx', 'r') as f:
    content = f.read()

# Add will-change: transform to the Framer motion elements in Platform.jsx
content = content.replace(
    'className={`interactive-card p-10 rounded-sm group border border-white/5 border-b-2 border-r-2 border-yellow-electric/20 hover:border-yellow-electric transition-all duration-500 bg-surface ${!showAll && idx >= 6 ? \'hidden md:block\' : \'\'}`}',
    'className={`interactive-card p-10 rounded-sm group border border-white/5 border-b-2 border-r-2 border-yellow-electric/20 hover:border-yellow-electric transition-all duration-500 bg-surface will-change-transform ${!showAll && idx >= 6 ? \'hidden md:block\' : \'\'}`}'
)

with open('src/pages/Platform.jsx', 'w') as f:
    f.write(content)
