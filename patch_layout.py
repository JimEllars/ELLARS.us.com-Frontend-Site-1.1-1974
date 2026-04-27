with open("src/components/Layout.jsx", "r") as f:
    content = f.read()

# We need to add the third ambient glow element
new_glow = '<div className="fixed top-0 right-1/4 w-96 h-96 bg-purple-neon rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>\n      <Navbar />'

content = content.replace('<Navbar />', new_glow)

with open("src/components/Layout.jsx", "w") as f:
    f.write(content)

print("Layout updated")
