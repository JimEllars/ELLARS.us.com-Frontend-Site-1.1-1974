import React from 'react';

const Newsletter = () => {
  return (
    <section className="py-32 border-t border-white/5 relative z-10">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <span className="font-editorial text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-6">Strategic Access</span>
        <h2 className="font-editorial font-black text-4xl md:text-6xl text-white mb-8">
          JOIN THE <span className="text-electric-gold">VANGUARD.</span>
        </h2>
        <p className="text-xl text-text-muted font-light mb-12 max-w-2xl mx-auto">
          Gain exclusive access to technical dispatches and strategic insight before public release.
        </p>
        <form className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
          <input 
            type="email" 
            placeholder="YOUR EMAIL ADDRESS" 
            className="flex-grow bg-white/5 border border-white/10 text-white px-6 py-5 font-editorial text-xs tracking-widest outline-none focus:border-gold-base transition-colors rounded-sm" 
            required 
          />
          <button type="submit" className="bg-white text-black font-editorial font-bold text-xs uppercase tracking-widest px-10 py-5 hover:bg-gold-bright transition-colors rounded-sm shadow-xl">
            Join
          </button>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;