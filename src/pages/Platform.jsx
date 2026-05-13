import React from 'react';
import SafeIcon from '@/common/SafeIcon';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

const Platform = () => {
        const modules = [
    {
      title: "PROTECTED VITAL SYSTEMS",
      icon: "ShieldCheck",
      status: "Directive 01",
      color: "text-yellow-electric",
      description: "Protecting essential systems—food, housing, education, and healthcare—from corporate profiteering to ensure the fundamental welfare of the American people.",
      progress: 85,
      sponsor: "Civic Infrastructure Guild",
      revisions: 12
    },
    {
      title: "TAXATION PARITY",
      icon: "Scale",
      status: "Directive 02",
      color: "text-yellow-electric",
      description: "Returning wealthy and corporate taxation to 1950s levels to prevent resource hoarding and ensure the economy works for everyone, not just the ultra-rich.",
      progress: 60,
      sponsor: "Economic Equity Council",
      revisions: 8
    },
    {
      title: "ELECTION SOVEREIGNTY",
      icon: "Vote",
      status: "Directive 03",
      color: "text-yellow-electric",
      description: "Overturning Citizens United and removing dark money from politics to prevent corporate interests from diluting the power of the people.",
      progress: 40,
      sponsor: "Technological Advisory Board",
      revisions: 24
    },
    {
      title: "HOUSING SOVEREIGNTY",
      icon: "Home",
      status: "Directive 04",
      color: "text-yellow-electric",
      description: "Prioritizing individual home ownership over corporate mass-rentals to strengthen the housing market and empower residents.",
      progress: 55,
      sponsor: "Civic Infrastructure Guild",
      revisions: 10
    },
    {
      title: "DIGITAL PRIVACY RIGHTS",
      icon: "Fingerprint",
      status: "Directive 05",
      color: "text-yellow-electric",
      description: "Establishing a right to data privacy where big tech must offer opt-in protocols and provide fair payment for the data they profit from.",
      progress: 70,
      sponsor: "Technological Advisory Board",
      revisions: 15
    },
    {
      title: "ENERGY INDEPENDENCE",
      icon: "Zap",
      status: "Directive 06",
      color: "text-yellow-electric",
      description: "Transitioning away from oil reliance toward clean transportation and robust public transit systems across America.",
      progress: 45,
      sponsor: "Economic Equity Council",
      revisions: 9
    },
    {
      title: "SYSTEMIC TERM LIMITS & AGE CAPS",
      icon: "Clock",
      status: "Directive 07",
      color: "text-yellow-electric",
      description: "Implementing mandatory term limits and age caps for all federal positions to prevent institutional squatting and ensure the government remains dynamic and uncorrupted.",
      progress: 30,
      sponsor: "Civic Infrastructure Guild",
      revisions: 5
    },
    {
      title: "SECULAR GOVERNANCE & FREEDOM",
      icon: "Sun",
      status: "Directive 08",
      color: "text-yellow-electric",
      description: "Upholding a strict separation of church and state to protect national health and ensure every citizen has the freedom to explore their own beliefs peacefully.",
      progress: 25,
      sponsor: "Technological Advisory Board",
      revisions: 4
    },
    {
      title: "DIRECT DEMOCRACY REFORM",
      icon: "Cpu",
      status: "Directive 09",
      color: "text-yellow-electric",
      description: "Eliminating the obsolete Electoral College in favor of the popular vote, utilizing modern technology to ensure every American's voice is heard equally.",
      progress: 20,
      sponsor: "Economic Equity Council",
      revisions: 7
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
        <meta name="description" content="A strategic blueprint for human-centric systems and economic sovereignty." />
        <script type="application/ld+json">
          {`
            {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "James Ellars",
    "url": "https://ellars.us.com",
    "description": "Leading the modernization of American civic infrastructure through private-sector rigor and algorithmic economic equity.",
    "knowsAbout": ["Economic Equity", "Automation Dividend", "Business Development Specialist", "Civic Infrastructure", "Vital System Protection", "Taxation Parity", "Digital Data Rights", "Housing Sovereignty", "Green Transportation Systems", "Systemic Term Limits", "Secular Governance", "Direct Democracy Reform", "Electoral College Obsolescence"]
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
            THE <span className="text-yellow-electric">PLATFORM.</span>
          </h1>
          <p className="text-text-muted mt-6 max-w-2xl mx-auto text-lg font-light">
            A strategic blueprint for human-centric systems and economic sovereignty.
          </p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="grid lg:grid-cols-2 gap-8">
          {modules.map((m, idx) => (
            <motion.div variants={itemVariants} key={idx} className="interactive-card p-10 rounded-sm group border-b-[#9400FF]/20 hover:border-[#9400FF] transition-colors bg-surface">
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-surface border border-white/10 flex items-center justify-center rounded-sm">
                  <SafeIcon name={m.icon} className={`w-6 h-6 ${m.color}`} />
                </div>
                <span className="text-[10px] text-white font-mono uppercase tracking-[0.2em] font-bold bg-white/5 px-2 py-1 border border-white/10 h-fit">{m.status}</span>
              </div>
              <h2 className="font-editorial font-black text-2xl text-white mb-4 group-hover:text-[#9400FF] transition-colors uppercase tracking-tight">{m.title}</h2>
              <p className="text-text-muted leading-relaxed font-light mb-6">{m.description}</p>

              <div className="mt-auto space-y-4 pt-6 border-t border-white/10">
                 <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                    <span>Consensus Progress</span>
                    <span className="text-[#4ade80]">{m.progress}%</span>
                 </div>
                 <div className="w-full bg-void h-2 rounded-sm overflow-hidden border border-white/5">
                    <div className="h-full bg-[#4ade80] transition-all duration-1000" style={{ width: `${m.progress}%` }}></div>
                 </div>
                 <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-4">
                    <span>Sponsor: {m.sponsor}</span>
                    <span>Revisions: {m.revisions}</span>
                 </div>
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
