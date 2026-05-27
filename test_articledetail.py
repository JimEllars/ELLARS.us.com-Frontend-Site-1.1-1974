with open('src/pages/ArticleDetail.jsx', 'r') as f:
    content = f.read()

assert 'if (!slug || typeof slug' in content
assert 'Return to Hub' in content
assert 'Link to="/news-media"' in content
assert 'AlertTriangle' in content

print("ArticleDetail OK")
