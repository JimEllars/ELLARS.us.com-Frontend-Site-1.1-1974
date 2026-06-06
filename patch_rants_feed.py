import re

with open('src/components/home/RantsFeed.jsx', 'r') as f:
    content = f.read()

# 1. Update data sorting logic
sort_logic = """    async function fetchPosts() {
      const data = await getLatestPosts(5); // Fetch a bit more to ensure we find a Daily News if it exists

      // Sort to prioritize Daily News
      const sortedData = [...data].sort((a, b) => {
        const isADaily = (a.title.rendered || '').toLowerCase().includes('daily news') || (a.acf?.category_label || '').toLowerCase() === 'daily news';
        const isBDaily = (b.title.rendered || '').toLowerCase().includes('daily news') || (b.acf?.category_label || '').toLowerCase() === 'daily news';
        if (isADaily && !isBDaily) return -1;
        if (!isADaily && isBDaily) return 1;
        return new Date(b.date) - new Date(a.date);
      }).slice(0, 3); // Keep only top 3

      setPosts(sortedData);
      setLoading(false);
    }"""

content = re.sub(r'async function fetchPosts\(\) \{[\s\S]*?setLoading\(false\);\n    \}', sort_logic, content)

# 2. Update the Link routing to `/articles/${post.slug}` and styling
# Find the map function
old_map = """            posts.map((post) => (
              <Link to={`/news-media/${post.slug}`} key={post.id} className="block group">
                <article className="interactive-card p-8 flex flex-col h-full rounded-sm hover:-translate-y-1 hover:bg-yellow-electric/5 transition-all duration-300">"""

new_map = """            posts.map((post, index) => {
              const isDailyNews = (post.title.rendered || '').toLowerCase().includes('daily news') || (post.acf?.category_label || '').toLowerCase() === 'daily news';
              const isFeatured = index === 0 && isDailyNews;

              return (
              <Link
                to={`/articles/${post.slug}`}
                key={post.id}
                className={`block group ${isFeatured ? 'md:col-span-2' : ''}`}
              >
                <article className={`interactive-card p-8 flex flex-col h-full rounded-sm hover:-translate-y-1 hover:shadow-2xl hover:border-yellow-electric hover:bg-yellow-electric/5 transition-all duration-300 ${isFeatured ? 'deco-frame border-yellow-electric shadow-[0_0_15px_rgba(253,224,71,0.2)]' : ''}`}>"""

content = content.replace(old_map, new_map)
content = content.replace('            ))', '            )})') # Fix closing bracket for map block

with open('src/components/home/RantsFeed.jsx', 'w') as f:
    f.write(content)

