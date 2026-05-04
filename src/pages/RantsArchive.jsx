import React, { useEffect, useState } from 'react';
import { useLoader } from '@/components/Layout';
import SafeIcon from '@/common/SafeIcon';
import { Helmet } from 'react-helmet-async';

const RantsArchive = () => {
  const { setIsLoading } = useLoader();
      const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  useEffect(() => {
    // Inject the pod.co player script
    const script = document.createElement('script');
    script.src = 'https://play.pod.co/embed/frame-v1.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const filters = ['ALL', 'VIDEO', 'AUDIO', 'DISPATCH'];



  return (
    <div className="pt-32 pb-20 min-h-screen bg-transparent">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>Rants Archive | James Ellars</title>
        <meta name="description" content="The official hub for the Ellars Rants show. High-resolution analysis on economics, technology, and the future of civic infrastructure." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold block mb-4">Unfiltered Discourse</span>
            <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
              ELLARS <span className="text-electric-gold">RANTS.</span>
            </h1>
            <p className="text-text-muted mt-6 text-lg font-light leading-relaxed">
              The official hub for the Ellars Rants show. High-resolution analysis on economics, technology, and the future of civic infrastructure.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 bg-surface p-1 border border-white/10 rounded-sm">
            {filters.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-2 font-editorial text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all ${activeFilter === f ? 'bg-electric-yellow text-black border-transparent' : 'text-gray-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {/* Podcast Player Integration */}
        <div className="mb-16">
          <div className="podcastdotco-wrapper flex justify-center">
            <iframe
              data-target="rants"
              src="https://play.pod.co/rants"
              frameBorder="0"
              width="100%"
              scrolling="no"
              style={{ overflow: 'hidden', maxWidth: '750px', height: '500px' }}
              className="podcastdotco-player podcastdotco-player--podcast"
              title="Ellars Rants Player"
            >
            </iframe>
          </div>
        </div>

        </div>
    </div>
  );
};

export default RantsArchive;
