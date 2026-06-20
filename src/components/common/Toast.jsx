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
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-void border-2 border-yellow-electric text-yellow-electric font-mono text-[10px] tracking-widest uppercase px-8 py-4 shadow-none rounded-none pointer-events-none"
        >
          {toastMessage}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
