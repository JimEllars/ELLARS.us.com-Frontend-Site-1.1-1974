import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import SafeIcon from '@/common/SafeIcon';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalAudioPlayer = () => {
  const audioRef = useRef(null);

  const audioIsPlaying = useAppStore(state => state.audioIsPlaying);
  const setAudioIsPlaying = useAppStore(state => state.setAudioIsPlaying);
  const showToast = useAppStore(state => state.showToast);
  const audioActiveTrack = useAppStore(state => state.audioActiveTrack);
  const setAudioActiveTrack = useAppStore(state => state.setAudioActiveTrack);
  const audioVolume = useAppStore(state => state.audioVolume);

  useEffect(() => {
    if (audioActiveTrack && audioRef.current) {
      if (audioRef.current.src !== audioActiveTrack.url) {
         audioRef.current.src = audioActiveTrack.url;
         if (audioIsPlaying) {
             audioRef.current.play().catch(e => {
             console.error("Playback failed", e);
             setAudioIsPlaying(false);
             showToast("// STREAM_UNAVAILABLE: Check network connection");
         });
         }
      }
    }
  }, [audioActiveTrack, audioIsPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      if (audioIsPlaying) {
        audioRef.current.play().catch(e => {
            console.error("Playback failed", e);
            setAudioIsPlaying(false);
            showToast("// STREAM_UNAVAILABLE: Check network connection");
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [audioIsPlaying, setAudioIsPlaying]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  useEffect(() => {
    if ('mediaSession' in navigator && audioActiveTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: audioActiveTrack.title || 'Ellars Rants',
        artist: audioActiveTrack.artist || 'James Ellars',
        album: audioActiveTrack.album || 'The Ellars Rants Show',
        artwork: [
          { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setAudioIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setAudioIsPlaying(false));
      navigator.mediaSession.setActionHandler('stop', () => {
          setAudioIsPlaying(false);
          setAudioActiveTrack(null);
      });
    }
  }, [audioActiveTrack, setAudioIsPlaying, setAudioActiveTrack]);

  const togglePlay = () => setAudioIsPlaying(!audioIsPlaying);

  return (
    <>
      <audio ref={audioRef} onEnded={() => setAudioIsPlaying(false)} />

      <AnimatePresence>
        {audioActiveTrack && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[150] bg-void/90 backdrop-blur-md border-t border-yellow-electric/30 p-4"
          >
             <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-black rounded-sm flex items-center justify-center border border-yellow-electric/30">
                    <span className="font-editorial font-bold text-yellow-electric text-sm">E</span>
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{audioActiveTrack.title}</div>
                    <div className="text-yellow-electric text-[10px] font-editorial uppercase tracking-widest animate-pulse">
                        [ TRANSMITTING SIGNAL... ]
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button onClick={togglePlay} className="bg-white/5 border border-yellow-electric/20 p-2 hover:bg-yellow-electric/10 transition-colors">
                      <SafeIcon name={audioIsPlaying ? "Pause" : "Play"} className="w-5 h-5 text-yellow-electric" />
                  </button>
                  <button onClick={() => setAudioActiveTrack(null)} className="text-gray-400 hover:text-white transition-colors">
                      <SafeIcon name="X" className="w-5 h-5" />
                  </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalAudioPlayer;
