import React from 'react';
import { Link } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';

const NotFound = () => {
  return (
    <div className="bg-[#050505] min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="deco-frame max-w-lg w-full border border-yellow-electric/30 p-12 text-center rounded-sm font-mono text-zinc-400">
        <SafeIcon name="AlertTriangle" className="w-12 h-12 text-yellow-electric/80 mx-auto mb-6" />
        <h1 className="text-yellow-electric text-3xl md:text-5xl font-deco uppercase tracking-widest mb-6">
          404 // SIGNAL LOST
        </h1>
        <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-8">
          The requested transmission could not be located.
        </p>
        <Link to="/" className="inline-flex items-center space-x-2 border border-yellow-electric/30 text-yellow-electric hover:bg-yellow-electric/10 font-bold text-xs uppercase tracking-widest px-8 py-4 transition-colors rounded-sm shadow-[0_0_15px_rgba(253,224,71,0.2)]">
          <SafeIcon name="ArrowLeft" className="w-4 h-4" />
          <span>RETURN TO HUB</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
