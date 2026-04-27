with open("src/components/home/Ventures.jsx", "r") as f:
    content = f.read()

# Replace titles
content = content.replace('"The Signal Podcast"', '"ELLARS Rants"')
content = content.replace('"Ellars Rants"', '"View Media"')

# Add link to AXiM Systems
# I will add a `link` property to the first venture
content = content.replace('      title: "AXiM Systems",', '      title: "AXiM Systems",\n      link: "https://axim.us.com",')

# Modify the render map
old_render = '''          {ventures.map((v, idx) => (
            <div key={idx} className="interactive-card p-10 rounded-sm group flex flex-col h-full bg-surface border border-white/5">'''

new_render = '''          {ventures.map((v, idx) => {
            const CardContent = (
              <>
                <div className={`w-16 h-16 mb-8 flex items-center justify-center rounded-sm bg-white/5 border border-white/10 ${v.accent} shadow-sm transition-transform group-hover:scale-110`}>
                  <SafeIcon name={v.icon} className="w-8 h-8" />
                </div>
                <h3 className="font-editorial font-black text-2xl text-white mb-4 uppercase tracking-tight">{v.title}</h3>
                <p className="text-text-muted leading-relaxed font-light flex-grow">{v.description}</p>
                <div className={`mt-8 pt-6 border-t border-white/5 flex items-center text-[10px] font-editorial font-bold uppercase tracking-widest ${v.accent} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Access Protocol <SafeIcon name="ArrowRight" className="ml-2 w-3 h-3" />
                </div>
              </>
            );

            return v.link ? (
              <a href={v.link} key={idx} target="_blank" rel="noopener noreferrer" className="interactive-card p-10 rounded-sm group flex flex-col h-full bg-surface border border-white/5 block">
                {CardContent}
              </a>
            ) : (
              <div key={idx} className="interactive-card p-10 rounded-sm group flex flex-col h-full bg-surface border border-white/5">
                {CardContent}
              </div>
            );
          })}'''

# Using regex to replace the old render block
import re
content = re.sub(
    r'\{ventures\.map\(\(v, idx\) => \(\s*<div key=\{idx\} className="interactive-card p-10 rounded-sm group flex flex-col h-full bg-surface border border-white/5">\s*<div className=\{`w-16 h-16 mb-8 flex items-center justify-center rounded-sm bg-white/5 border border-white/10 \$\{v\.accent\} shadow-sm transition-transform group-hover:scale-110`\}>\s*<SafeIcon name=\{v\.icon\} className="w-8 h-8" />\s*</div>\s*<h3 className="font-editorial font-black text-2xl text-white mb-4 uppercase tracking-tight">\{v\.title\}</h3>\s*<p className="text-text-muted leading-relaxed font-light flex-grow">\{v\.description\}</p>\s*<div className=\{`mt-8 pt-6 border-t border-white/5 flex items-center text-\[10px\] font-editorial font-bold uppercase tracking-widest \$\{v\.accent\} opacity-0 group-hover:opacity-100 transition-opacity`\}>\s*Access Protocol <SafeIcon name="ArrowRight" className="ml-2 w-3 h-3" />\s*</div>\s*</div>\s*\)\)}',
    new_render,
    content
)

with open("src/components/home/Ventures.jsx", "w") as f:
    f.write(content)
