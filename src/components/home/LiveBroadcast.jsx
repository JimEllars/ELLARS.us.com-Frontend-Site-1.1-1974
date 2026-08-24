import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import SafeIcon from '@/common/SafeIcon';
import DOMPurify from 'dompurify';

const LiveBroadcast = () => {
  const { isLiveStreamActive, setIsLiveStreamActive, streamEmbedUrl, setNewsletterModalOpen, userToken, isAuthenticated, userRole } = useAppStore();
  const [chatMessage, setChatMessage] = useState('');
  const [chatLogs, setChatLogs] = useState([]);
  const chatContainerRef = useRef(null);

  // Initialize chatLogs from localStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem('ellars_live_chat_logs');
    if (savedLogs) {
      try {
        setChatLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.warn('Failed to parse saved chat logs:', e);
      }
    }
  }, []);

  // Polling for live status
  useEffect(() => {
    let intervalId;

    const checkLiveStatus = async () => {
      try {
        const response = await fetch('/api/v1/stream/status');
        if (response.ok) {
          const data = await response.json();
          setIsLiveStreamActive(data.isLiveStreamActive);
        }
      } catch (err) {
        console.warn('[LiveBroadcast] Edge status polling failed:', err);
      }
    };

    // Check immediately, then poll every 30 seconds
    checkLiveStatus();
    intervalId = setInterval(checkLiveStatus, 30000);

    return () => clearInterval(intervalId);
  }, [setIsLiveStreamActive]);

  // Auto-scroll chat container to the bottom when chatLogs change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatLogs]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    // Sanitize user input with DOMPurify
    const cleanMessage = DOMPurify.sanitize(chatMessage.trim());
    if (!cleanMessage) return;

    let userHandle = 'Observer';
    if (isAuthenticated) {
       userHandle = userRole || 'Navigator';
       if (userToken) {
           try {
               const payload = JSON.parse(atob(userToken.split('.')[1]));
               if (payload.email) {
                   userHandle = payload.email.split('@')[0];
               }
           } catch (e) {
               console.warn('Failed to decode JWT:', e);
           }
       }
    }

    setChatLogs(prev => {
      const newLog = {
        id: Date.now(),
        user: userHandle,
        message: cleanMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const newLogs = [...prev, newLog];

      // Cap at the last 50 entries
      const cappedLogs = newLogs.slice(-50);

      // Persist to localStorage
      localStorage.setItem('ellars_live_chat_logs', JSON.stringify(cappedLogs));

      return cappedLogs;
    });
    setChatMessage('');
  };

  // Resolve embed URL
  const cfUid = import.meta.env.VITE_CF_STREAM_LIVE_UID;
  let embedUrl = streamEmbedUrl;
  if (!embedUrl) {
    if (cfUid) {
      embedUrl = `https://iframe.videodelivery.net/${cfUid}?autoplay=true&muted=true&preload=auto`;
    } else {
      embedUrl = 'https://talkstudio.streamlabs.com/embed';
    }
  }

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

            <div
              ref={chatContainerRef}
              className="flex-grow p-4 overflow-y-auto flex flex-col space-y-3"
            >
              {chatLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase text-center">
                    Feed open. Standing by for transmissions.
                  </p>
                </div>
              ) : (
                chatLogs.map(log => (
                  <div key={log.id} className="flex flex-col">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-yellow-electric text-[10px] font-bold uppercase tracking-widest">{log.user}</span>
                      <span className="text-zinc-500 text-[10px]">{log.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-300 font-editorial" dangerouslySetInnerHTML={{ __html: log.message }}></p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="p-4 border-t border-white/10 bg-white/5">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Transmit message..."
                  className="flex-grow bg-void border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-electric/50 font-editorial"
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim()}
                  className="px-4 py-2 bg-yellow-electric/10 text-yellow-electric border border-yellow-electric/30 rounded-sm hover:bg-yellow-electric/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <SafeIcon name="Send" className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </section>
  );
};

export default LiveBroadcast;
