with open('src/components/home/Bio.jsx', 'r') as f:
    content = f.read()

assert '18-Year Career in Business Development and Marketing' in content
assert 'Adelanto Chamber of Commerce (2014–2016)' in content
print("Bio.jsx successfully updated.")
