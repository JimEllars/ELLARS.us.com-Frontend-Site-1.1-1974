import sys

with open("src/components/home/RantsFeed.jsx", "r") as f:
    content = f.read()

# Replace header styling and text
content = content.replace('<h2 className="font-editorial font-black text-4xl md:text-6xl text-white mb-6 leading-tight">\n              ELLARS <span className="text-electric-gold">RANTS.</span>\n            </h2>', '<h2 className="tracking-[0.2em] uppercase font-deco text-yellow-electric mb-6 leading-tight text-4xl md:text-6xl">\n              ARTICLES\n            </h2>')

with open("src/components/home/RantsFeed.jsx", "w") as f:
    f.write(content)

print("Patched RantsFeed.jsx nomenclature")
