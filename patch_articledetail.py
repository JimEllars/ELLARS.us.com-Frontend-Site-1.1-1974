import re

with open('src/pages/ArticleDetail.jsx', 'r') as f:
    content = f.read()

# Update the structural guard
content = content.replace(
    "if (!slug || typeof slug !== 'string' || slug.trim() === '') {",
    "if (typeof slug === 'undefined' || !slug || typeof slug !== 'string' || slug.trim() === '') {"
)

# Update the fallback error card link styling
content = re.sub(
    r'<Link to="/news-media" className="inline-block bg-white text-black font-editorial font-bold text-xs uppercase tracking-widest px-8 py-4 hover:bg-yellow-electric transition-colors rounded-sm shadow-\[0_0_15px_rgba\(253,224,71,0\.4\)\]">',
    r'<Link to="/news-media" className="inline-block border border-yellow-electric/20 text-yellow-electric hover:bg-yellow-electric/10 font-editorial font-bold text-xs uppercase tracking-widest px-8 py-4 transition-colors rounded-sm shadow-[0_0_15px_rgba(253,224,71,0.4)]">',
    content
)

with open('src/pages/ArticleDetail.jsx', 'w') as f:
    f.write(content)
