import sys

with open("src/components/home/RantsFeed.jsx", "r") as f:
    content = f.read()

# Wrap article cards in <Link> to `/news-media/${post.slug}`
# Add hover states: `hover:-translate-y-1 hover:bg-yellow-electric/5 transition-all duration-300`
# Also ensure display: block is on the new link wrappers.

old_article = """<article key={post.id} className="interactive-card p-8 flex flex-col group h-full rounded-sm">"""
new_article = """<Link to={`/news-media/${post.slug}`} key={post.id} className="block group">
                <article className="interactive-card p-8 flex flex-col h-full rounded-sm hover:-translate-y-1 hover:bg-yellow-electric/5 transition-all duration-300">"""

content = content.replace(old_article, new_article)
content = content.replace("</article>", "</article>\n              </Link>")

with open("src/components/home/RantsFeed.jsx", "w") as f:
    f.write(content)

print("Patched RantsFeed.jsx interactivity")
