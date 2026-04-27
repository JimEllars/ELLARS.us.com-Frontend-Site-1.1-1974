with open("src/components/home/Hero.jsx", "r") as f:
    content = f.read()

# Replace bg-gold-bright animate-pulse with bg-purple-neon animate-pulse
content = content.replace('bg-gold-bright animate-pulse', 'bg-purple-neon animate-pulse')

# Update border to have subtle purple glow
content = content.replace('border-white/10 rounded-sm px-4 py-1.5 bg-white/5 backdrop-blur-md', 'border-purple-neon/30 rounded-sm px-4 py-1.5 bg-white/5 backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.15)]')

# Update hover class of watch rants button to neon/purple gradient
content = content.replace('hover:bg-gold-bright', 'hover:bg-gradient-to-r hover:from-phthalo-glow hover:to-purple-neon hover:text-white hover:border-transparent')

# Optional: Add class to headline
with open("src/components/home/Hero.jsx", "w") as f:
    f.write(content)

print("Hero updated")
