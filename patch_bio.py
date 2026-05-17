import re

with open('src/components/home/Bio.jsx', 'r') as f:
    content = f.read()

# Update metric from 15+ to 18-Year
content = content.replace(
    '<div className="font-editorial font-black text-4xl text-white mb-2">15+</div>',
    '<div className="font-editorial font-black text-4xl text-white mb-2">18</div>'
)

# Update descriptions
content = content.replace(
    'James Ellars is a business development specialist and systems strategist with over 15 years of experience executing high-stakes transitions in the private sector.',
    'James Ellars is a business development specialist and systems strategist with an 18-Year Career in Business Development and Marketing, executing high-stakes transitions in the private sector.'
)

content = content.replace(
    '<div className="text-[10px] uppercase tracking-widest text-gray-500 font-editorial font-bold">Years in Enterprise Growth</div>',
    '<div className="text-[10px] uppercase tracking-widest text-gray-500 font-editorial font-bold">Year Career in Business Development and Marketing</div>'
)

chamber_board = """              <div className="bg-black/50 border border-white/5 p-8 rounded-sm sm:col-span-2">
                <SafeIcon name="Building2" className="w-8 h-8 text-phthalo-glow mb-6" />
                <div className="font-editorial font-black text-2xl text-white mb-2">Chamber Board Tenure</div>
                <div className="text-sm text-text-muted">Served on the Board of Directors for the Adelanto Chamber of Commerce (2014–2016), highlighting his deep, ground-level exposure to regional macroeconomic shifts.</div>
              </div>"""

content = content.replace(
    """<div className="bg-black/50 border border-white/5 p-8 rounded-sm sm:col-span-2">
                <SafeIcon name="Target" className="w-8 h-8 text-white mb-6" />
                <div className="font-editorial font-black text-2xl text-white mb-2">The Mission</div>
                <div className="text-sm text-text-muted">Applying private-sector rigor to modernize the foundation of the American working class.</div>
              </div>""",
    chamber_board
)

with open('src/components/home/Bio.jsx', 'w') as f:
    f.write(content)
