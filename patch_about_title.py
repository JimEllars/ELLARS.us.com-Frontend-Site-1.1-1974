with open('src/pages/About.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<h4 className="text-white font-editorial text-xl font-bold mb-4">ROOTED IN REALITY. DRIVEN BY SYSTEMS.</h4>',
    '<h4 className="text-white font-editorial text-xl font-bold mb-4">THE DESERT LEGACY</h4>'
)

with open('src/pages/About.jsx', 'w') as f:
    f.write(content)
