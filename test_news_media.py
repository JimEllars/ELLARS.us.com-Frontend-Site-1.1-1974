with open('src/pages/NewsMedia.jsx', 'r') as f:
    content = f.read()

assert 'The All-American Tax Credit vs. Reactive Welfare Structures' in content
assert '#fde047' in content
assert '#4ade80' in content
assert 'DOMPurify.sanitize(stripHtml(post.title.rendered))' in content
assert 'DOMPurify.sanitize(stripHtml(post.excerpt.rendered))' in content
assert 'DOMPurify.sanitize(post.imageUrl)' in content
print("NewsMedia.jsx successfully updated.")
