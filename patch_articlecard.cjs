const fs = require('fs');

let content = fs.readFileSync('src/components/intel/ArticleCard.jsx', 'utf8');

// Slug validation to prevent 404
content = content.replace(
  '    <Link to={`/articles/${post.slug}`} className="block h-full group">',
  '    <Link to={post.slug ? `/articles/${post.slug}` : "#"} className="block h-full group" onClick={(e) => { if (!post.slug) e.preventDefault(); }}>'
);

fs.writeFileSync('src/components/intel/ArticleCard.jsx', content);
