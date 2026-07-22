import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';

const UpdatePrompt = () => {
  const { updateAvailable, setUpdateAvailable } = useAppStore();

  const handleRefresh = () => {
    setUpdateAvailable(false);
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1000] bg-void/90 backdrop-blur-md border border-yellow-electric text-white font-mono text-[10px] tracking-widest uppercase px-6 py-4 shadow-[0_0_20px_rgba(253,224,71,0.15)] flex flex-col items-center gap-3 w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-sm"
        >
          <div className="flex items-center gap-3 w-full">
            <div className="w-1.5 h-1.5 bg-yellow-electric rounded-full animate-pulse shrink-0"></div>
            <span className="truncate flex-1">A new version of the platform is available.</span>
          </div>
          <div className="w-full mt-2">
            <button
              onClick={handleRefresh}
              className="w-full bg-yellow-electric text-black font-bold uppercase tracking-widest text-xs py-2 hover:bg-white transition-colors rounded-sm shadow-[0_0_15px_rgba(253,224,71,0.2)] text-center"
            >
              Refresh Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdatePrompt;
