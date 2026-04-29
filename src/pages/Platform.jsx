import React from 'react';
import SafeIcon from '@/common/SafeIcon';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

const Platform = () => {
  const modules = [
    {
      title: "THE CALIFORNIA FLOOR",
      icon: "Database",
      status: "Priority Alpha",
      color: "text-white",
      description: "A modernized Negative Income Tax establishing an algorithmic baseline of stability for national infrastructure."
    },
    {
      title: "END THE SIPHON ECONOMY",
      icon: "Shield",
      status: "Active Deployment",
      color: "text-yellow-electric",
      description: "Structural reinvestment mandates for multinational extraction within regional geography."
    },
    {
      title: "CONSTITUTIONAL INTEGRITY",
      icon: "Lock",
      status: "Core Protocol",
      color: "text-white",
      description: "Patching governance vulnerabilities through strict term limits and capital-policy decoupling."
    },
    {
      title: "LOGISTICS ARCHITECTURE",
      icon: "Map",
      status: "Beta Phase",
      color: "text-white",
      description: "Modernizing physical networks via decentralized energy grids and automated logistics hubs."
    }
  ];

  const containerVariant = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="pt-32 pb-20 min-h-screen blueprint-overlay">
      <Helmet>
        <title>The Platform | James Ellars</title>
        <meta name="description" content="An architectural manual for the modernization of civic infrastructure." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-editorial text-[10px] text-white uppercase tracking-widest font-bold block mb-4">Operational Directives</span>
          <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
            THE <span className="text-electric-gold">PLATFORM.</span>
          </h1>
          <p className="text-text-muted mt-6 max-w-2xl mx-auto text-lg font-light">
            A architectural manual for the modernization of civic infrastructure.
          </p>
        </div>

        <motion.div variants={containerVariant} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="grid lg:grid-cols-2 gap-8">
          {modules.map((m, idx) => (
            <motion.div variants={itemVariant} key={idx} className="interactive-card p-10 rounded-sm group">
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-surface border border-white/10 flex items-center justify-center rounded-sm">
                  <SafeIcon name={m.icon} className={`w-6 h-6 ${m.color}`} />
                </div>
                <span className="text-[10px] text-white uppercase tracking-widest font-bold bg-white/5 px-2 py-1 border border-white/10 h-fit">{m.status}</span>
              </div>
              <h2 className="font-editorial font-black text-2xl text-white mb-4 group-hover:text-yellow-electric transition-colors uppercase tracking-tight">{m.title}</h2>
              <p className="text-text-muted leading-relaxed font-light">{m.description}</p>
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center text-[10px] font-editorial font-bold uppercase tracking-widest text-yellow-electric opacity-0 group-hover:opacity-100 transition-opacity">
                Access Documentation <SafeIcon name="ArrowRight" className="ml-2 w-3 h-3" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Platform;