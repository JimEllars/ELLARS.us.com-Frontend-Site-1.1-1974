const fs = require('fs');

const path = 'src/components/home/Ventures.jsx';
let content = fs.readFileSync(path, 'utf8');

const digitalAssetsSection = `
        <div className="mt-32 mb-16 text-center">
          <span className="font-editorial text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-4">Digital Products</span>
          <h2 className="font-editorial font-black text-4xl text-white">STRATEGIC <span className="text-electric-gold">ASSETS</span></h2>
        </div>

        <motion.div variants={containerVariant} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="grid lg:grid-cols-2 gap-8">
          {[
            {
              title: "The Blue-Collar Automation Dividend Manual",
              description: "A comprehensive guide to algorithmic economic equity and implementing the Automation Dividend in local economies.",
              tag: "E-Book / Manual"
            },
            {
              title: "Sovereign Supply Chains Compendium",
              description: "Strategic frameworks for decentralized logistics, vital system protection, and building localized supply networks.",
              tag: "Strategic Framework"
            }
          ].map((asset, idx) => (
            <motion.div variants={itemVariant} key={idx} className="will-change-transform">
              <div className="bg-void border border-white/10 rounded-sm p-10 flex flex-col h-full group hover:border-white/20 transition-colors deco-brackets relative">
                <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold block mb-4">{asset.tag}</span>
                <h3 className="font-editorial font-black text-2xl text-white mb-4 uppercase tracking-tight">{asset.title}</h3>
                <p className="text-text-muted leading-relaxed font-light flex-grow mb-8">{asset.description}</p>
                <div className="mt-auto">
                  <button className="border border-yellow-electric/30 text-yellow-electric text-xs tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors px-6 py-3 w-full sm:w-auto">
                    Acquire Asset
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
`;

content = content.replace('</motion.div>\n      </motion.div>\n    </section>', '</motion.div>\n' + digitalAssetsSection + '      </motion.div>\n    </section>');
fs.writeFileSync(path, content);
