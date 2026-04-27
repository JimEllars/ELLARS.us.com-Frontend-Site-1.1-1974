import os

def replace_in_file(filepath, old, new):
    with open(filepath, 'r') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)

# Platform.jsx
platform_path = "src/pages/Platform.jsx"
replace_in_file(platform_path, '"text-white"', '"text-purple-neon"')
replace_in_file(platform_path, 'text-gold-base', 'text-yellow-electric')
replace_in_file(platform_path, 'hover:text-gold-bright', 'hover:text-yellow-electric hover:drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]')

# Intel.jsx
intel_path = "src/pages/Intel.jsx"
replace_in_file(intel_path, 'text-gold-base', 'text-yellow-electric')
replace_in_file(intel_path, 'border-gold-base/20', 'border-yellow-electric/30')
replace_in_file(intel_path, 'bg-gold-base/5', 'bg-yellow-electric/10 shadow-[0_0_15px_rgba(251,191,36,0.15)]')

# RantsArchive.jsx
rants_path = "src/pages/RantsArchive.jsx"
replace_in_file(rants_path, "bg-gold-base text-black", "bg-gradient-to-r from-phthalo-glow to-purple-neon text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border-transparent")
replace_in_file(rants_path, "bg-gold-base/90", "bg-gradient-to-br from-yellow-electric to-purple-neon opacity-90")
replace_in_file(rants_path, "text-gold-base", "text-yellow-electric")
replace_in_file(rants_path, "hover:text-gold-base", "hover:text-yellow-electric")

# ArticleCard.jsx
article_path = "src/components/intel/ArticleCard.jsx"
replace_in_file(article_path, "text-gold-base", "text-yellow-electric")
replace_in_file(article_path, "hover:text-gold-base", "hover:text-purple-neon")
replace_in_file(article_path, 'SafeIcon name="Calendar" className="w-3 h-3"', 'SafeIcon name="Calendar" className="w-3 h-3 text-purple-neon"')
replace_in_file(article_path, "text-gray-500 font-bold", "text-yellow-electric font-bold")

print("Components updated")
