const fs = require('fs');

let content = fs.readFileSync('src/components/apps/EcosystemGrid.jsx', 'utf8');

const newLoadingState = `
             {/* Thematic Terminal Loading State matching DemandLetterApp */}
             <div className="w-20 h-20 border-2 border-yellow-electric/30 rounded-sm mb-8 flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-yellow-electric/10 animate-pulse"></div>
               <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="w-12 h-12 border-t-2 border-r-2 border-yellow-electric rounded-full"
               />
               <div className="absolute inset-2 border border-yellow-electric/20 rounded-full"></div>
             </div>
             <p className="font-mono text-yellow-electric text-sm tracking-[0.2em] uppercase blink">
               [INITIALIZING DECENTRALIZED PROTOCOLS]
             </p>
             <p className="font-mono text-text-muted text-[10px] tracking-widest mt-3 uppercase">
               ESTABLISHING SECURE HANDSHAKE
             </p>
             <div className="w-48 h-1 bg-white/5 mt-6 relative overflow-hidden rounded-full">
               <motion.div
                 initial={{ x: "-100%" }}
                 animate={{ x: "100%" }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                 className="absolute top-0 left-0 w-1/2 h-full bg-yellow-electric/50"
               />
             </div>
`;

content = content.replace(/\{\/\* Thematic Terminal Loading State \*\/\}[\s\S]*?(?=<\/div>\s*<\/div>\s*\)\s*:\s*\()/g, newLoadingState);

fs.writeFileSync('src/components/apps/EcosystemGrid.jsx', content, 'utf8');
