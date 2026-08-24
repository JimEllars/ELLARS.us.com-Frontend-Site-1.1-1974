import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import SafeIcon from '@/common/SafeIcon';

const LiveBroadcast = () => {
  const { isLiveStreamActive, streamEmbedUrl, setNewsletterModalOpen } = useAppStore();

  // Use a fallback generic Talk Studio embed URL or provided
  const embedUrl = streamEmbedUrl || 'https://talkstudio.streamlabs.com/embed';

  if (!isLiveStreamActive) {
    return (
      <section className="w-full bg-void border-y border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 deco-frame p-6 bg-white/5">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <div>
                <p className="font-editorial text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Broadcast Standby
                </p>
                <p className="font-editorial text-sm font-bold uppercase tracking-widest text-white mt-1">
                  Next Transmission Approaching
                </p>
              </div>
            </div>
            <button
              onClick={() => setNewsletterModalOpen(true)}
              className="px-6 py-3 border border-yellow-electric/30 text-yellow-electric hover:bg-yellow-electric/10 transition-colors uppercase tracking-widest text-xs font-editorial font-bold flex items-center space-x-2"
            >
              <span>Get Notified</span>
              <SafeIcon name="Bell" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-void py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-50"></div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">

        <div className="flex items-center space-x-3 mb-8">
          <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]"></span>
          <span className="font-editorial text-sm font-bold uppercase tracking-widest text-red-500">
            LIVE NOW
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 deco-frame border border-yellow-electric/30 bg-black overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-popups"
              loading="lazy"
              allowFullScreen
              title="Live Broadcast"
            ></iframe>
          </div>

          <div className="lg:col-span-4 deco-frame border border-yellow-electric/30 bg-black/50 flex flex-col h-[500px] lg:h-auto overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <span className="font-editorial text-xs font-bold uppercase tracking-widest text-white">Live Transmission Feed</span>
              <SafeIcon name="MessageSquare" className="w-4 h-4 text-yellow-electric" />
            </div>
            <div className="flex-grow p-4 flex items-center justify-center">
              {/* Optional embedded chat or fallback */}
              <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase text-center">
                Chat module authenticating...
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default LiveBroadcast;
