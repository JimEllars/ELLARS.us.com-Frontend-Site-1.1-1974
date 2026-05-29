import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '@/common/SafeIcon';
import { Link } from 'react-router-dom';

const Ventures = () => {
  const ventures = [
    {
      title: "AXiM Systems",
      link: "https://axim.us.com",
      description: "Enterprise automation and civic infrastructure solutions.",
      icon: "Cpu",
      accent: "text-yellow-electric",
      external: true
    },
    {
      title: "ELLARS Rants",
      link: "https://play.pod.co/rants",
      description: "Long-form audio discourse on the intersection of technology and human equity.",
      icon: "Mic",
      accent: "text-yellow-electric",
      external: true
    },
    {
      title: "News & Media",
      link: "/news-media",
      description: "Unfiltered video briefings on post-labor economics and institutional decay.",
      icon: "Video",
      accent: "text-yellow-electric",
      external: false
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
    <section className="py-24 bg-void border-y border-white/5 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-7xl mx-auto px-6"
      >
        <div className="mb-16 text-center">
          <span className="font-editorial text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-4">Current Operations</span>
          <h2 className="font-editorial font-black text-4xl text-white">ACTIVE <span className="text-electric-gold">PROJECTS</span></h2>
        </div>

        <motion.div variants={containerVariant} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="grid lg:grid-cols-3 gap-8">
                    {ventures.map((v, idx) => {
            const CardContent = (
              <>
                <div className={`w-16 h-16 mb-8 flex items-center justify-center rounded-sm bg-white/5 border border-white/10 ${v.accent} shadow-sm transition-transform group-hover:scale-110`}>
                  <SafeIcon name={v.icon} className="w-8 h-8" />
                </div>
                <h3 className="font-editorial font-black text-2xl text-white mb-4 uppercase tracking-tight">{v.title}</h3>
                <p className="text-text-muted leading-relaxed font-light flex-grow">{v.description}</p>
                <div className={`mt-8 pt-6 border-t border-white/5 flex items-center text-[10px] font-editorial font-bold uppercase tracking-widest ${v.accent} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  {v.title === "News & Media" ? "Access Hub" : "Learn More"} <SafeIcon name="ArrowRight" className="ml-2 w-3 h-3" />
                </div>
              </>
            );

            return (
              <motion.div variants={itemVariant} key={idx}>
                {v.external ? (
                  <a href={v.link} target="_blank" rel="noopener noreferrer" className="interactive-card p-10 rounded-sm group flex flex-col h-full bg-surface  block">
                    {CardContent}
                  </a>
                ) : (
                  <Link to={v.link} className="interactive-card p-10 rounded-sm group flex flex-col h-full bg-surface  block">
                    {CardContent}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        <div className="mt-32 mb-16 text-center">
          <span className="font-editorial text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold block mb-4">Digital Products</span>
          <h2 className="font-editorial font-black text-4xl text-white">STRATEGIC <span className="text-electric-gold">ASSETS</span></h2>
        </div>

        <motion.div variants={containerVariant} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="grid lg:grid-cols-2 gap-8">
          {[
            {
              title: "The Blue-Collar Automation Dividend Manual",
              description: "A comprehensive guide to people-first economics and implementing the Automation Dividend in local communities.",
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
                <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-[0.2em] font-bold block mb-4">{asset.tag}</span>
                <h3 className="font-editorial font-black text-2xl text-white mb-4 uppercase tracking-tight">{asset.title}</h3>
                <p className="text-text-muted leading-relaxed font-light flex-grow mb-8">{asset.description}</p>
                <div className="mt-auto">
                  <button className="border border-yellow-electric/30 text-yellow-electric font-bold text-xs tracking-[0.2em] uppercase hover:bg-yellow-electric/10 transition-colors px-6 py-3 w-full sm:w-auto">
                    Acquire Asset
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Ventures;
