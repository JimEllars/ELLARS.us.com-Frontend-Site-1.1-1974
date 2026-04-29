import React from 'react';
import { Link } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';

const Bio = () => {
  return (
    <section className="py-32 relative bg-grid z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="glass-panel p-10 md:p-20 relative overflow-hidden rounded-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold-base opacity-5 blur-[100px]"></div>
          
          <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
            <div>
              <h2 className="font-editorial font-black text-4xl md:text-5xl text-white mb-8 leading-tight">
                A CAREER BUILT ON <span className="text-gradient-gold">SCALE AND EXECUTION.</span>
              </h2>
              <div className="space-y-6 text-text-muted text-lg font-light leading-relaxed">
                <p>
                  James Ellars is a business development specialist and systems strategist with over 15 years of experience executing high-stakes transitions in the private sector.
                </p>
                <p>
                  Specializing in logistics networks, renewable energy infrastructure, and SaaS integrations, James has built his reputation on identifying inefficiencies and architecting solutions that drive immense value. 
                </p>
                <p>
                  Today, he is applying that rigorous, ROI-focused methodology to the greatest challenge of our time: civic infrastructure and economic sovereignty for the American working class.
                </p>
              </div>
              <div className="mt-12">
                <Link to="/articles" className="text-white font-editorial font-bold text-xs uppercase tracking-widest border-b border-white hover:border-gold-base hover:text-gold-base pb-1 transition-all">
                  Read Articles
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-black/50 border border-white/5 p-8 rounded-sm">
                <SafeIcon name="Briefcase" className="w-8 h-8 text-gold-base mb-6" />
                <div className="font-editorial font-black text-4xl text-white mb-2">15+</div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-editorial font-bold">Years in Enterprise Growth</div>
              </div>
              <div className="bg-black/50 border border-white/5 p-8 rounded-sm">
                <SafeIcon name="Share2" className="w-8 h-8 text-phthalo-glow mb-6" />
                <div className="font-editorial font-black text-4xl text-white mb-2">03</div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-editorial font-bold">Core Industries Optimized</div>
              </div>
              <div className="bg-black/50 border border-white/5 p-8 rounded-sm sm:col-span-2">
                <SafeIcon name="Target" className="w-8 h-8 text-white mb-6" />
                <div className="font-editorial font-black text-2xl text-white mb-2">The Mission</div>
                <div className="text-sm text-text-muted">Applying private-sector rigor to modernize the foundation of the American working class.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Bio;