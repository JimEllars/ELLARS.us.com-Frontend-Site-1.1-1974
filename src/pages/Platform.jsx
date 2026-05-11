import React from 'react';
import SafeIcon from '@/common/SafeIcon';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

const Platform = () => {
    const modules = [
    {
      title: "THE AMERICAN TAX CREDIT",
      icon: "Database",
      status: "Priority Alpha",
      color: "text-yellow-electric",
      description: "A proactive vision for an extra $12,000 annual tax credit, paid monthly, providing the algorithmic stability and predictability families need to navigate the digital age."
    },
    {
      title: "PEOPLE-FIRST ECONOMICS",
      icon: "Users",
      status: "Core Protocol",
      color: "text-yellow-electric",
      description: "Measuring economic health through human prosperity and localized wealth recirculation, ensuring the American Dream remains an accessible reality for the working class."
    },
    {
      title: "THE AUTOMATION DIVIDEND",
      icon: "Cpu",
      status: "Active Deployment",
      color: "text-yellow-electric",
      description: "A funding mechanism that closes corporate loopholes and taxes entities that utilize public infrastructure and automation to replace human labor."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="pt-32 pb-20 min-h-screen blueprint-overlay bg-grid">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>The Platform | James Ellars</title>
        <meta property="og:type" content="article" />
        <meta property="og:title" content="The Platform | James Ellars" />
        <meta property="og:image" content="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp" />
        <meta name="description" content="A technical manual for the modernization of civic infrastructure." />
        <script type="application/ld+json">
          {`
            {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "James Ellars",
    "url": "https://ellars.us.com",
    "description": "Leading the modernization of American civic infrastructure through private-sector rigor and algorithmic economic equity."
}
          `}
        </script>
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://ellars.us.com"
              },{
                "@type": "ListItem",
                "position": 2,
                "name": "Platform",
                "item": "https://ellars.us.com/platform"
              }]
            }
          `}
        </script>
      </Helmet>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-editorial text-[10px] text-white uppercase tracking-widest font-bold block mb-4">Operational Directives</span>
          <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
            THE <span className="text-electric-gold">PLATFORM.</span>
          </h1>
          <p className="text-text-muted mt-6 max-w-2xl mx-auto text-lg font-light">
            A technical manual for the modernization of civic infrastructure.
          </p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="grid lg:grid-cols-2 gap-8">
          {modules.map((m, idx) => (
            <motion.div variants={itemVariants} key={idx} className="interactive-card p-10 rounded-sm group border-b-[#a855f7]/20 hover:border-yellow-electric transition-colors">
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-surface border border-white/10 flex items-center justify-center rounded-sm">
                  <SafeIcon name={m.icon} className={`w-6 h-6 ${m.color}`} />
                </div>
                <span className="text-[10px] text-white font-mono uppercase tracking-[0.2em] font-bold bg-white/5 px-2 py-1 border border-white/10 h-fit">{m.status}</span>
              </div>
              <h2 className="font-editorial font-black text-2xl text-white mb-4 group-hover:text-yellow-electric transition-colors uppercase tracking-tight">{m.title}</h2>
              <p className="text-text-muted leading-relaxed font-light">{m.description}</p>
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center text-[10px] font-editorial font-bold uppercase tracking-widest text-yellow-electric opacity-0 group-hover:opacity-100 transition-opacity">
                Access Documentation <SafeIcon name="ArrowRight" className="ml-2 w-3 h-3" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Implementation Roadmap */}
        <div className="mt-32 pt-20 border-t border-white/10">
          <div className="text-center mb-16">
            <h2 className="font-editorial font-black text-3xl md:text-5xl text-white uppercase tracking-tight">IMPLEMENTATION ROADMAP</h2>
          </div>

          <div className="relative">
            {/* Horizontal connecting line */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -translate-y-1/2 hidden md:block"></div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Policy Briefing", desc: "Initial stakeholder alignment and economic modeling." },
                { step: "02", title: "Legislative Drafting", desc: "Translating models into actionable policy frameworks." },
                { step: "03", title: "Pilot Programs", desc: "Localized testing of the American Tax Credit." },
                { step: "04", title: "Civic Infrastructure Deployment", desc: "Full-scale rollout and continuous algorithmic monitoring." }
              ].map((item, idx) => (
                <div key={idx} className="relative bg-surface border border-white/10 p-6 rounded-sm z-10 md:mt-0 mt-8">
                  <div className="absolute -top-4 md:-top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-phthalo-glow shadow-[0_0_10px_rgba(0,143,122,0.5)] mb-2"></div>
                    <div className="h-4 w-px bg-white/20 hidden md:block"></div>
                  </div>
                  <span className="font-mono text-xs text-phthalo-glow block mb-2">{item.step}</span>
                  <h3 className="font-editorial font-bold text-white uppercase text-sm mb-2">{item.title}</h3>
                  <p className="text-text-muted text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Platform;
