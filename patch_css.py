import re

with open("src/index.css", "r") as f:
    css = f.read()

# Update .text-electric-gold
css = re.sub(
    r'\.text-electric-gold\s*\{[^}]+\}',
    '.text-electric-gold {\n    color: #fbbf24;\n    text-shadow: 0 0 10px rgba(251, 191, 36, 0.6), 0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(197, 160, 89, 0.2);\n  }',
    css
)

# Add .text-neon-purple after .text-electric-gold
css = css.replace(
    '.text-electric-gold {\n    color: #fbbf24;\n    text-shadow: 0 0 10px rgba(251, 191, 36, 0.6), 0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(197, 160, 89, 0.2);\n  }',
    '.text-electric-gold {\n    color: #fbbf24;\n    text-shadow: 0 0 10px rgba(251, 191, 36, 0.6), 0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(197, 160, 89, 0.2);\n  }\n\n  .text-neon-purple {\n    color: #a855f7;\n    text-shadow: 0 0 15px rgba(168, 85, 247, 0.5);\n  }'
)

# Update interactive-card hover states
css = re.sub(
    r'\.interactive-card:hover\s*\{[^}]+\}',
    '.interactive-card:hover {\n    @apply -translate-y-2 border-purple-neon/40 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.3),0_0_15px_rgba(0,143,122,0.4)];\n  }',
    css
)

css = re.sub(
    r'\.interactive-card:hover::before\s*\{[^}]+\}',
    '.interactive-card:hover::before {\n    background: linear-gradient(90deg, #008f7a, #a855f7, transparent);\n  }',
    css
)

# Update btn-gold to have a cyber gradient on hover
css = re.sub(
    r'\.btn-gold:hover\s*\{[^}]+\}',
    '.btn-gold:hover {\n    @apply shadow-[0_0_20px_rgba(251,191,36,0.3)];\n    background: linear-gradient(90deg, #050505, #fbbf24);\n    color: #050505;\n    border-color: #fbbf24;\n  }',
    css
)


with open("src/index.css", "w") as f:
    f.write(css)

print("CSS updated")
