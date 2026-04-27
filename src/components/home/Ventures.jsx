import React from 'react';
import SafeIcon from '@/common/SafeIcon';

const Ventures = () => {
  const ventures = [
    {
      title: "AXiM Systems",
      description: "Enterprise automation and civic infrastructure solutions.",
      icon: "Cpu",
      accent: "text-purple-neon"
    },
    {
      title: "The Signal Podcast",
      description: "Long-form audio discourse on the intersection of technology and human equity.",
      icon: "Mic",
      accent: "text-electric-gold"
    },
    {
      title: "Ellars Rants",
      description: "Unfiltered video briefings on post-labor economics and institutional decay.",
      icon: "Video",
      accent: "text-phthalo-glow"
    }
  ];

  return (
    <section className="py-24 bg-void border-y border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 text-center">
          <span className="font-editorial text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-4">Current Operations</span>
          <h2 className="font-editorial font-black text-4xl text-white">ACTIVE <span className="text-gradient-gold">VENTURES</span></h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {ventures.map((v, idx) => (
            <div key={idx} className="interactive-card p-10 rounded-sm group flex flex-col h-full bg-surface border border-white/5">
              <div className={`w-16 h-16 mb-8 flex items-center justify-center rounded-sm bg-white/5 border border-white/10 ${v.accent} shadow-sm transition-transform group-hover:scale-110`}>
                <SafeIcon name={v.icon} className="w-8 h-8" />
              </div>
              <h3 className="font-editorial font-black text-2xl text-white mb-4 uppercase tracking-tight">{v.title}</h3>
              <p className="text-text-muted leading-relaxed font-light flex-grow">{v.description}</p>
              <div className={`mt-8 pt-6 border-t border-white/5 flex items-center text-[10px] font-editorial font-bold uppercase tracking-widest ${v.accent} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Access Protocol <SafeIcon name="ArrowRight" className="ml-2 w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Ventures;
