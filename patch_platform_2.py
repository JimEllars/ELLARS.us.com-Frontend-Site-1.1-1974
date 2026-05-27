with open('src/pages/Platform.jsx', 'r') as f:
    content = f.read()

content = content.replace('// SafeIcon doesn\'t have Home necessarily, let\'s use "Hammer" or "ShieldCheck"', '')
content = content.replace('// or "Zap" or "Navigation"', '')

with open('src/pages/Platform.jsx', 'w') as f:
    f.write(content)
