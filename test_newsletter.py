with open('src/components/home/Newsletter.jsx', 'r') as f:
    content = f.read()

assert 'name="email"' in content
assert 'hasError' in content
assert 'deco-frame' in content
assert 'animate-[pulse' in content
assert 'min-h-[80px]' in content # for non-shifting

print("Newsletter OK")
