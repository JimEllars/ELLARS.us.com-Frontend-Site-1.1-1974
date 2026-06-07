import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import EcosystemGrid from '@/components/apps/EcosystemGrid';
import DemandLetterApp from '@/components/apps/DemandLetterApp';

const Ecosystem = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pt-32 pb-20 min-h-screen blueprint-overlay bg-grid">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>The Ecosystem | Decentralized Architecture | James Ellars</title>
        <meta name="description" content="Explore the decentralized micro-app architecture and external ecosystem tools powering the Axim/Ellars infrastructure." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-editorial text-[10px] text-white uppercase tracking-widest font-bold block mb-4">Infrastructure & Tools</span>
          <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
            THE <span className="text-yellow-electric">ECOSYSTEM.</span>
          </h1>
          <p className="text-text-muted mt-6 max-w-2xl mx-auto text-lg font-light">
            Decentralized micro-apps and core API integrations powering modern civic infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-24">
          <div className="lg:col-span-7">
            <EcosystemGrid />
          </div>

          <div className="lg:col-span-5">
             <div className="sticky top-32">
               <div className="mb-6">
                 <h2 className="font-editorial font-black text-2xl text-white uppercase tracking-tight mb-2">
                   ACTIVE <span className="text-yellow-electric">MICRO-APP</span>
                 </h2>
                 <p className="text-text-muted font-light text-sm">
                   Demonstrating localized state management and future API bridging.
                 </p>
               </div>
               <DemandLetterApp />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Ecosystem;
