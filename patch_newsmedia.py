import re

with open('src/pages/NewsMedia.jsx', 'r') as f:
    content = f.read()

# 1. Update the sorting logic
old_sort = "const allCombinedPosts = [...posts, ...socialPosts].sort((a, b) => new Date(b.date) - new Date(a.date));"
new_sort = """const allCombinedPosts = [...posts, ...socialPosts].sort((a, b) => {
    const isADaily = (a.title?.rendered || '').toLowerCase().includes('daily news') || (a.acf?.category_label || '').toLowerCase() === 'daily news';
    const isBDaily = (b.title?.rendered || '').toLowerCase().includes('daily news') || (b.acf?.category_label || '').toLowerCase() === 'daily news';
    if (isADaily && !isBDaily) return -1;
    if (!isADaily && isBDaily) return 1;
    return new Date(b.date) - new Date(a.date);
  });"""
content = content.replace(old_sort, new_sort)

# 2. Update mapping rendering to support feature highlighting and fixing Link path
old_map = "filteredPosts.map((post) => {"
new_map = "filteredPosts.map((post, index) => {"
content = content.replace(old_map, new_map)

# Replace the specific mapping loop for the return statement
old_return = """              return (

                            <Link to={post.isExternal ? post.externalUrl : `/articles/${post.slug}`} key={post.id} className="block h-full" target={post.isExternal ? '_blank' : '_self'} rel={post.isExternal ? 'noopener noreferrer' : ''}>
              <article className={`interactive-card flex flex-col group h-full rounded-sm border-b-yellow-electric/20 hover:border-yellow-electric transition-colors ${post.acf?.category_label?.toUpperCase() === 'SOCIAL' && post.imageUrl ? '' : 'p-8'}`}>"""

new_return = """              const isDailyNews = (post.title?.rendered || '').toLowerCase().includes('daily news') || (post.acf?.category_label || '').toLowerCase() === 'daily news';
              const isFeatured = index === 0 && isDailyNews;

              return (
                            <Link to={post.isExternal ? post.externalUrl : `/articles/${post.slug}`} key={post.id} className={`block h-full group ${isFeatured ? 'md:col-span-2' : ''}`} target={post.isExternal ? '_blank' : '_self'} rel={post.isExternal ? 'noopener noreferrer' : ''}>
              <article className={`interactive-card flex flex-col h-full rounded-sm border-b-yellow-electric/20 hover:-translate-y-1 hover:shadow-2xl hover:border-yellow-electric transition-all duration-300 ${post.acf?.category_label?.toUpperCase() === 'SOCIAL' && post.imageUrl ? '' : 'p-8'} ${isFeatured ? 'deco-frame border-yellow-electric shadow-[0_0_15px_rgba(253,224,71,0.2)]' : ''}`}>"""

content = content.replace(old_return, new_return)

with open('src/pages/NewsMedia.jsx', 'w') as f:
    f.write(content)
