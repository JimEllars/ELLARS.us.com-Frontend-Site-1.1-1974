import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import SafeIcon from '@/common/SafeIcon';

const About = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const historyData = [
    {
      year: "2018 - 2021",
      role: "Director of Logistics",
      company: "Nexus Supply Chain Solutions",
      description: "Restructured regional supply networks, reducing latency by 24% and generating $4.2M in annual operational savings."
    },
    {
      year: "2021 - 2023",
      role: "VP of Business Development",
      company: "Axiom Tech Group",
      description: "Scaled the enterprise division, successfully negotiating 12 key municipal contracts to integrate smart-city analytics."
    },
    {
      year: "2023 - Present",
      role: "Founder & Lead Strategist",
      company: "Ellars Consulting Partners",
      description: "Advising mid-cap tech firms and local governments on the economic integration of automation and AI technologies."
    }
  ];

  const philosophyData = [
    {
      title: "Algorithmic Efficiency",
      icon: "Cpu",
      description: "Governance should function like a well-optimized system. We replace bloated bureaucracies with data-driven logistics."
    },
    {
      title: "Post-Labor Economics",
      icon: "TrendingUp",
      description: "Preparing our communities for an automated future by establishing resilient financial floors, not temporary safety nets."
    },
    {
      title: "Decentralized Infrastructure",
      icon: "Network",
      description: "Building autonomous local networks that reduce dependence on fragile, centralized macro-systems."
    }
  ];

  return (
    <div className="pt-32 pb-20 min-h-screen bg-void bg-grid">
      <Helmet>
        <title>The Candidate | James Ellars</title>
        <meta name="description" content="James Ellars - Built for Results. Operational History and Core Philosophy." />
      </Helmet>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center md:text-left"
        >
          <div className="inline-flex items-center space-x-2 border border-yellow-electric/30 rounded-sm px-3 py-1 mb-6 bg-yellow-electric/10 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
            <SafeIcon name="Target" className="w-3 h-3 text-yellow-electric" />
            <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold">Profile Overview</span>
          </div>
          <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight uppercase mb-4">
            THE CANDIDATE <br className="hidden md:block"/> // JAMES <span className="text-electric-gold">ELLARS</span>
          </h1>
          <h2 className="font-editorial text-2xl md:text-4xl text-gray-400 uppercase tracking-widest font-bold mb-8">
            BUILT FOR <span className="text-white">RESULTS.</span>
          </h2>
          <p className="text-text-muted max-w-3xl text-lg md:text-xl font-light leading-relaxed">
            The logistical challenges of the 2030s require leaders who have actually scaled systems. We do not need career orators; we need architects of efficiency.
          </p>
        </motion.div>
      </section>

      {/* Operational History */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="mb-12 border-b border-white/10 pb-4">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="Briefcase" className="w-6 h-6 mr-4 text-electric-gold" />
            Operational History
          </h3>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {historyData.map((item, index) => (
            <motion.div key={index} variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm border border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-electric-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="text-electric-gold font-editorial text-sm font-bold tracking-widest mb-2">{item.year}</div>
              <h4 className="text-white font-editorial text-xl font-bold mb-1">{item.role}</h4>
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-4 pb-4 border-b border-white/10">{item.company}</div>
              <p className="text-text-muted font-light text-sm leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Core Philosophy */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 border-b border-white/10 pb-4">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="Compass" className="w-6 h-6 mr-4 text-electric-gold" />
            Core Philosophy
          </h3>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {philosophyData.map((item, index) => (
            <motion.div key={index} variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm border border-white/5 relative group">
               <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:bg-electric-gold/20 transition-colors duration-500">
                  <SafeIcon name={item.icon} className="w-6 h-6 text-white group-hover:text-electric-gold transition-colors duration-500" />
               </div>
              <h4 className="text-white font-editorial text-xl font-bold mb-4">{item.title}</h4>
              <p className="text-text-muted font-light text-sm leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
};

export default About;
