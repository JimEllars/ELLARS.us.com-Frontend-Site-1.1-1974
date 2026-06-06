import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '@/common/SafeIcon';

const Podcast = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true);
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  return (
    <section className="py-32 bg-void border-y border-white/5 relative z-10">
      
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center relative z-10">
        <motion.div
          className="order-2 lg:order-1 relative"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="glass-panel p-2 rounded-sm relative group cursor-pointer" onClick={togglePlay}>
            <div className="aspect-video bg-void border border-white/5 rounded-sm overflow-hidden relative">

              {!isVideoLoaded && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-void z-10">
                  <div className="text-yellow-electric font-editorial uppercase tracking-widest text-xs animate-pulse">
                    [ INITIALIZING FEED ]
                  </div>
                </div>
              )}

              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-void z-10 border border-yellow-electric/20">
                  <div className="text-center">
                    <SafeIcon name="AlertTriangle" className="w-8 h-8 text-yellow-electric/50 mx-auto mb-2" />
                    <div className="text-yellow-electric font-editorial uppercase tracking-widest text-[10px]">
                      SIGNAL DISRUPTED
                    </div>
                  </div>
                </div>
              )}

              <video
                ref={videoRef}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                playsInline
                muted={isMuted}
                preload="metadata"
                onLoadedData={handleVideoLoaded}
                onError={handleVideoError}
              >
                <source src="https://www.w3schools.com/html/mov_bbb.webm" type="video/webm" />
                Your browser does not support the video tag.
              </video>

              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
                <div className="w-20 h-20 bg-void/40 backdrop-blur-md rounded-full flex items-center justify-center border border-yellow-electric/30 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(253,224,71,0.1)]">
                  <SafeIcon name="Play" className="w-8 h-8 text-yellow-electric ml-1" />
                </div>
              </div>

              {/* Media Controls Flush Bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-void to-transparent flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                 <div className="flex space-x-2">
                    <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="bg-void/80 backdrop-blur-sm border border-yellow-electric/20 p-2 hover:bg-yellow-electric/10 transition-colors">
                      <SafeIcon name={isPlaying ? "Pause" : "Play"} className="w-4 h-4 text-yellow-electric" />
                    </button>
                    <button onClick={toggleMute} className="bg-void/80 backdrop-blur-sm border border-yellow-electric/20 p-2 hover:bg-yellow-electric/10 transition-colors">
                      <SafeIcon name={isMuted ? "VolumeX" : "Volume2"} className="w-4 h-4 text-yellow-electric" />
                    </button>
                 </div>
                 <div className="text-[10px] font-editorial text-yellow-electric tracking-widest uppercase bg-void/80 backdrop-blur-sm border border-yellow-electric/20 px-3 py-1">
                    [ WEBM.HQ ]
                 </div>
              </div>

            </div>
            
            <div className="mt-4 px-2 pb-2 flex items-center justify-between z-10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-black rounded-sm flex items-center justify-center border border-white/10">
                  <span className="font-editorial font-bold text-white text-lg">E</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-white font-bold text-sm">Ellars Rants: Episode 04</p>
                    {isPlaying && (
                      <span className="text-electric-gold text-[10px] font-editorial uppercase tracking-widest animate-pulse ml-2">
                        [ TRANSMITTING SIGNAL... ]
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs">The Ethics of Algorithms</p>
                </div>
              </div>
              </div>
          </div>
        </motion.div>

        <div className="order-1 lg:order-2">
          <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold block mb-6">The Ellars Rants Show</span>
          <h2 className="font-editorial font-black text-4xl md:text-6xl text-white mb-8 leading-tight">
            HIGH-RESOLUTION <br />
            <span className="text-electric-gold">DISCOURSE.</span>
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
