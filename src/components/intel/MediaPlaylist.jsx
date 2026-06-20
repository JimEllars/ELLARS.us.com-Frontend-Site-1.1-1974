import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '@/common/SafeIcon';
import { useTelemetry } from '@/hooks/useTelemetry';


const mockPlaylist = [
  {
    id: 1,
    title: 'The All-American Tax Credit vs. Reactive Welfare Structures',
    date: '2024-05-15',
    type: 'video',
    duration: '45:20',
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 2,
    title: 'Automation Dividend: Reframing the Future of Work',
    date: '2024-05-10',
    type: 'audio',
    duration: '32:15',
    thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    videoUrl: ''
  },
  {
    id: 3,
    title: 'Supply Chain Efficiency & Sovereign Innovation',
    date: '2024-04-28',
    type: 'video',
    duration: '55:10',
    thumbnail: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 4,
    title: 'Civic Infrastructure & Digital Data Rights',
    date: '2024-04-15',
    type: 'audio',
    duration: '40:05',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    videoUrl: ''
  }
];

const MediaPlaylist = () => {
  const { trackEvent } = useTelemetry();
  const [activeMedia, setActiveMedia] = useState(mockPlaylist[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup video element on unmount to prevent memory leak
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, []);

  const togglePlay = () => {
    if (activeMedia.type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.warn('Video play failed', e));
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleMediaSelect = (media) => {
    setActiveMedia(media);
    setIsPlaying(false); // Reset play state when switching media
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-void border border-white/10 rounded-sm overflow-hidden">
      {/* Active Player (Left Pane) md:col-span-2 */}
      <div className="md:col-span-2 p-6 flex flex-col border-b md:border-b-0 md:border-r border-white/10">
        <div className="relative w-full aspect-video bg-black rounded-sm border border-white/5 overflow-hidden mb-6 flex flex-col justify-end group">
          {activeMedia.type === 'video' ? (
            <>
              {/* Fallback image/poster */}
              <img
                src={activeMedia.thumbnail}
                alt={activeMedia.title}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-50'}`}
              />
              <video
                src={activeMedia.videoUrl}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
                playsInline
                muted
                preload="metadata"
                ref={videoRef}
                onClick={togglePlay}
              />
            </>
          ) : (
             <div className="absolute inset-0 w-full h-full bg-zinc-900 flex items-center justify-center">
                 <div className="w-full h-32 px-8 flex items-end justify-center space-x-2">
                     {/* Mock Frequency Visualizer */}
                     {[...Array(12)].map((_, i) => (
                         <motion.div
                            key={i}
                            animate={isPlaying ? { height: ['10%', '100%', '10%'] } : { height: '10%' }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                            className={`w-3 rounded-t-sm ${isPlaying ? 'bg-yellow-electric' : 'bg-[#4ade80]'}`}
                         />
                     ))}
                 </div>
             </div>
          )}

          {/* Custom Controls Panel */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-void/90 backdrop-blur-md border-t border-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlay}
                className="text-yellow-electric hover:text-white transition-colors focus:outline-none"
              >
                <SafeIcon name={isPlaying ? "Pause" : "Play"} className="w-6 h-6" />
              </button>
              <button className="text-yellow-electric hover:text-white transition-colors focus:outline-none">
                <SafeIcon name="VolumeX" className="w-5 h-5" />
              </button>
            </div>
            <div className="font-mono text-[10px] text-yellow-electric tracking-widest uppercase">
              {isPlaying ? 'Playing...' : 'Standby'}
            </div>
          </div>

          {/* Play Overlay Button (when paused) */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-yellow-electric/20 backdrop-blur-sm border border-yellow-electric flex items-center justify-center">
                <SafeIcon name="Play" className="w-8 h-8 text-yellow-electric ml-1" />
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold mb-2 flex items-center space-x-2">
            <SafeIcon name={activeMedia.type === 'video' ? 'Video' : 'Mic'} className="w-4 h-4" />
            <span>Now {activeMedia.type === 'video' ? 'Watching' : 'Playing'}</span>
          </div>
          <h2 className="font-editorial font-bold text-2xl text-white mb-2 leading-tight">
            {activeMedia.title}
          </h2>
          <div className="flex items-center text-zinc-500 font-mono text-[10px] uppercase tracking-widest space-x-4">
            <span>{new Date(activeMedia.date).toLocaleDateString()}</span>
            <span>{activeMedia.duration}</span>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10">
          <h3 className="font-editorial font-bold text-xs text-white uppercase tracking-widest mb-4">
            Subscribe On
          </h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => trackEvent('syndication_click', { platform: 'spotify' })}
              className="px-4 py-2 border border-white/10 hover:border-yellow-electric text-white hover:text-yellow-electric transition-colors text-xs font-editorial uppercase tracking-widest flex items-center space-x-2"
            >
              <span>Spotify</span>
            </button>
            <button
              onClick={() => trackEvent('syndication_click', { platform: 'apple_podcasts' })}
              className="px-4 py-2 border border-white/10 hover:border-yellow-electric text-white hover:text-yellow-electric transition-colors text-xs font-editorial uppercase tracking-widest flex items-center space-x-2"
            >
              <span>Apple Podcasts</span>
            </button>
            <button
              onClick={() => trackEvent('syndication_click', { platform: 'youtube' })}
              className="px-4 py-2 border border-white/10 hover:border-yellow-electric text-white hover:text-yellow-electric transition-colors text-xs font-editorial uppercase tracking-widest flex items-center space-x-2"
            >
              <span>YouTube</span>
            </button>
          </div>
        </div>

      </div>

      {/* Playlist (Right Pane) md:col-span-1 */}
      <div className="md:col-span-1 h-[500px] overflow-y-auto custom-scrollbar flex flex-col p-4 bg-surface">
        <h3 className="font-editorial font-bold text-sm text-white uppercase tracking-widest mb-4 px-2">
          Up Next
        </h3>
        <div className="flex flex-col space-y-2">
          {mockPlaylist.map((media) => (
            <button
              key={media.id}
              onClick={() => handleMediaSelect(media)}
              className={`flex items-start text-left p-3 rounded-sm transition-colors duration-200 group ${
                activeMedia.id === media.id
                  ? 'bg-yellow-electric/10 border-l-2 border-yellow-electric'
                  : 'hover:bg-white/5 border-l-2 border-transparent'
              }`}
            >
              <div className="flex-shrink-0 w-24 aspect-video bg-void rounded-sm border border-white/10 overflow-hidden relative mr-4">
                <img src={media.thumbnail} alt={media.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <SafeIcon name={media.type === 'video' ? 'Video' : 'Mic'} className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex flex-col flex-grow">
                <h4 className={`font-editorial font-bold text-xs mb-1 line-clamp-2 ${activeMedia.id === media.id ? 'text-yellow-electric' : 'text-white'}`}>
                  {media.title}
                </h4>
                <div className="font-mono text-[9px] text-zinc-500 tracking-widest uppercase">
                  {media.duration}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MediaPlaylist;
