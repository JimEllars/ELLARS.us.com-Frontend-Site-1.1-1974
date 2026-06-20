import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';

const Toast = () => {
  const { toastMessage } = useAppStore();

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-void/90 backdrop-blur-md border border-yellow-electric text-yellow-electric font-mono text-[10px] tracking-widest uppercase px-8 py-4 shadow-[0_0_20px_rgba(253,224,71,0.15)] pointer-events-none flex items-center gap-3"
        >
          <div className="w-1.5 h-1.5 bg-yellow-electric rounded-full animate-pulse"></div>
          {toastMessage}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
