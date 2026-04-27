import React from 'react';
import SafeIcon from '@/common/SafeIcon';

const Expertise = () => {
  return (
    <section className="border-y border-white/5 bg-panel py-8 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center font-editorial text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-6 font-bold">Expertise & Strategic Verticals</p>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50">
          <div className="flex items-center space-x-2 text-white font-editorial font-bold tracking-widest text-sm uppercase">
            <SafeIcon name="Cpu" className="w-5 h-5 text-gold-base" /> <span>SaaS Innovation</span>
          </div>
          <div className="flex items-center space-x-2 text-white font-editorial font-bold tracking-widest text-sm uppercase">
            <SafeIcon name="Sun" className="w-5 h-5 text-gold-base" /> <span>Renewable Energy</span>
          </div>
          <div className="flex items-center space-x-2 text-white font-editorial font-bold tracking-widest text-sm uppercase">
            <SafeIcon name="Share2" className="w-5 h-5 text-gold-base" /> <span>Global Logistics</span>
          </div>
          <div className="flex items-center space-x-2 text-white font-editorial font-bold tracking-widest text-sm uppercase">
            <SafeIcon name="MapPin" className="w-5 h-5 text-gold-base" /> <span>Civic Architecture</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Expertise;