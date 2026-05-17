with open('src/pages/About.jsx', 'r') as f:
    content = f.read()

assert 'Bill Ellars' in content
assert 'Sultana High School' in content
assert '2020 Grassroots Tester Campaign' in content
assert 'birthDate' in content
assert 'Green Transportation Systems' in content
assert 'Sultana High School' in content
print("About.jsx successfully updated.")
