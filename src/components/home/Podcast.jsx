import React from 'react';
import SafeIcon from '@/common/SafeIcon';

const Podcast = () => {
  return (
    <section className="py-32 bg-[#080808] border-y border-white/5 relative z-10">
      <div className="absolute right-0 top-0 w-1/2 h-full bg-phthalo-deep opacity-20 blur-[100px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center relative z-10">
        <div className="order-2 lg:order-1 relative">
          <div className="glass-panel p-2 rounded-sm relative group cursor-pointer">
            <div className="aspect-video bg-black rounded-sm overflow-hidden relative">
              <img 
                src="https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?auto=format&fit=crop&q=80&w=1000" 
                alt="Podcast Studio" 
                className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500 grayscale"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <SafeIcon name="Play" className="w-8 h-8 text-white ml-1" />
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-black rounded-sm flex items-center justify-center border border-white/10">
                  <span className="font-editorial font-bold text-white text-lg">E</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Ellars Rants: Episode 04</p>
                  <p className="text-gray-400 text-xs">The Ethics of Algorithms</p>
                </div>
              </div>
              <div className="hidden sm:flex space-x-3 text-white/50">
                <SafeIcon name="SkipBack" className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                <SafeIcon name="Pause" className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                <SafeIcon name="SkipForward" className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <span className="font-editorial text-[10px] text-phthalo-glow uppercase tracking-widest font-bold block mb-6">The Ellars Rants Show</span>
          <h2 className="font-editorial font-black text-4xl md:text-6xl text-white mb-8 leading-tight">
            HIGH-RESOLUTION <br />
            <span className="text-gradient-phthalo">DISCOURSE.</span>
          </h2>
          <p className="text-xl text-text-muted font-light leading-relaxed mb-10">
            Step inside the studio. Deep-dive conversations on macro-economics, local logistics, and the cultural shifts defining the next decade. Raw, uncut, and uncompromising.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xs transition-colors text-white text-sm font-medium">
              <SafeIcon name="Headphones" className="w-4 h-4" /> <span>Apple Podcasts</span>
            </a>
            <a href="#" className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xs transition-colors text-white text-sm font-medium">
              <SafeIcon name="Youtube" className="w-4 h-4 text-red-500" /> <span>YouTube</span>
            </a>
            <a href="#" className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xs transition-colors text-white text-sm font-medium">
              <SafeIcon name="Music" className="w-4 h-4 text-green-400" /> <span>Spotify</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Podcast;