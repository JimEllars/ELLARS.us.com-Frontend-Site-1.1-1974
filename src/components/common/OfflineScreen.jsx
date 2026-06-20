import React from 'react';
import { motion } from 'framer-motion';

const OfflineScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="min-h-screen z-[999] absolute inset-0 bg-void/95 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto select-none"
    >
      <div className="deco-frame border border-red-500/30 bg-black/60 p-12 text-center relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.15)]">
        <div className="deco-brackets before:border-red-500/50 after:border-red-500/50"></div>
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/50 animate-pulse">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          </div>
        </div>
        <div className="font-mono text-sm md:text-base tracking-widest text-red-500 uppercase mb-4">
          // SIGNAL LOST: NO CONNECTION TO AXIM CORE
        </div>
        <div className="text-xs text-text-muted font-inter uppercase tracking-widest leading-loose">
          Transmission severed. <br className="hidden md:block" />
          Awaiting network re-establishment...
        </div>
        <div className="mt-8">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-transparent text-red-500 border border-red-500/50 px-8 py-4 font-editorial font-bold uppercase tracking-[0.2em] text-xs transition-all duration-300 hover:bg-red-500/10 hover:border-red-500 animate-pulse"
          >
            REESTABLISH CONNECTION
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default OfflineScreen;
