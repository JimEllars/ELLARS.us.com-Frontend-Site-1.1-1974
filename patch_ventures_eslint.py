import sys

with open("src/components/home/Ventures.jsx", "r") as f:
    content = f.read()

content = content.replace("const Ventures = () => {\n\nconst ventures =", "const Ventures = () => {\n  const ventures =")

with open("src/components/home/Ventures.jsx", "w") as f:
    f.write(content)

print("Patched Ventures formatting")
