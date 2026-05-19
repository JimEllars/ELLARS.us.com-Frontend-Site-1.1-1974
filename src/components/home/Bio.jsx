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
              <h2 className="font-deco font-normal tracking-wide text-white uppercase text-4xl md:text-5xl mb-8 leading-tight">
                A CAREER BUILT ON <span className="text-yellow-electric">SCALE AND EXECUTION.</span>
              </h2>
              <div className="space-y-6 text-text-muted text-lg font-light leading-relaxed">
                <p>
                  James Ellars is a business development specialist and systems strategist with an 18-Year Career in Business Development and Marketing, executing high-stakes transitions in the private sector.
                </p>
                <p>
                  Specializing in logistics networks, renewable energy infrastructure, and SaaS integrations, James has built his reputation on identifying inefficiencies and designing solutions that drive immense value.
                </p>
                <p>
                  Today, he is applying that rigorous, results-focused mindset to the greatest challenge of our time: people-focused infrastructure and economic freedom for the American working class.
                </p>
              </div>
              <div className="mt-12">
                <Link to="/articles" className="text-white font-editorial font-bold text-xs uppercase tracking-widest border-b border-white hover:border-gold-base hover:text-gold-base pb-1 transition-all">
                  Read Articles
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="border-b-2 border-r-2 border-yellow-electric/20 hover:border-yellow-electric p-8 rounded-sm transition-colors">
                <SafeIcon name="Briefcase" className="w-8 h-8 text-gold-base mb-6" />
                <div className="font-editorial font-black text-4xl text-white mb-2">18</div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-editorial font-bold">Year Career in Business Development and Marketing</div>
              </div>
              <div className="border-b-2 border-r-2 border-yellow-electric/20 hover:border-yellow-electric p-8 rounded-sm transition-colors">
                <SafeIcon name="Share2" className="w-8 h-8 text-phthalo-glow mb-6" />
                <div className="font-editorial font-black text-4xl text-white mb-2">03</div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-editorial font-bold">Core Industries Optimized</div>
              </div>
                            <div className="border-b-2 border-r-2 border-yellow-electric/20 hover:border-yellow-electric p-8 rounded-sm transition-colors sm:col-span-2">
                <SafeIcon name="Building2" className="w-8 h-8 text-phthalo-glow mb-6" />
                <div className="font-editorial font-black text-2xl text-white mb-2">Chamber Board Tenure</div>
                <div className="text-sm text-text-muted">Served on the Board of Directors for the Adelanto Chamber of Commerce (2014–2016), highlighting his deep, ground-level exposure to regional macroeconomic shifts.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Bio;