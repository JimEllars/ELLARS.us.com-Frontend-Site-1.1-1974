import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';

const Toast = () => {
  const { toastMessage } = useAppStore();

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-zinc-900 border border-yellow-electric text-yellow-electric font-mono text-[10px] tracking-widest uppercase px-6 py-3 shadow-[0_0_15px_rgba(250,204,21,0.2)] pointer-events-none"
        >
          {toastMessage}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
