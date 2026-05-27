with open('src/pages/Platform.jsx', 'r') as f:
    content = f.read()

content = content.replace('      icon: "Home", \n', '      icon: "Home",\n')

with open('src/pages/Platform.jsx', 'w') as f:
    f.write(content)
