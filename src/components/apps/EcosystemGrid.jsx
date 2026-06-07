import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '@/common/SafeIcon';

const tools = [
  {
    name: "Noota",
    description: "Audio to Text transcriptions.",
    icon: "Mic",
    status: "Active"
  },
  {
    name: "Deskera / SuiteDash",
    description: "Primary CRM & Automation routing.",
    icon: "Database",
    status: "Active"
  },
  {
    name: "Internxt",
    description: "Decentralized secure storage.",
    icon: "HardDrive",
    status: "Active"
  },
  {
    name: "Retable",
    description: "Data management and list building.",
    icon: "Table",
    status: "Active"
  },
  {
    name: "Illusto",
    description: "Video editing and rendering.",
    icon: "Video",
    status: "Active"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

const EcosystemGrid = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full">
      <div className="mb-10 text-center md:text-left">
        <h2 className="font-editorial font-black text-3xl md:text-4xl text-white uppercase tracking-tight mb-2">
          AXIM CORE API <span className="text-yellow-electric">INTEGRATIONS</span>
        </h2>
        <p className="text-text-muted font-light text-sm">
          The decentralized pillars powering the Ellars/Axim infrastructure.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 border border-yellow-electric/20 bg-void flex flex-col items-center justify-center rounded-sm min-h-[300px]">
          <div className="relative flex flex-col items-center">

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
</div>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {tools.map((tool, idx) => (
            <motion.div
              variants={itemVariants}
              key={idx}
              whileHover={{ y: -5 }}
              className="interactive-card p-6 rounded-sm bg-surface border border-white/5 border-b-2 border-yellow-electric/20 hover:border-yellow-electric transition-all duration-300 flex flex-col h-full group will-change-transform"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-void border border-white/10 flex items-center justify-center rounded-sm group-hover:border-yellow-electric/50 transition-colors">
                  <SafeIcon name={tool.icon} className="w-5 h-5 text-yellow-electric" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#4ade80] bg-[#4ade80]/10 px-2 py-1 border border-[#4ade80]/20">
                  {tool.status}
                </span>
              </div>
              <h3 className="font-editorial text-lg text-white mb-2 uppercase tracking-wide group-hover:text-yellow-electric transition-colors">
                {tool.name}
              </h3>
              <p className="text-text-muted text-xs font-light leading-relaxed flex-grow">
                {tool.description}
              </p>
              <div className="mt-6 pt-4 border-t border-white/5">
                <button className="text-[10px] font-mono text-yellow-electric uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-white transition-colors">
                  View Protocol
                  <SafeIcon name="ArrowRight" className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default EcosystemGrid;
