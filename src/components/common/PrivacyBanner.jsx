import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';

const PrivacyBanner = () => {
  const { privacyConsent, setPrivacyConsent } = useAppStore();

  const handleAcknowledge = () => {
    setPrivacyConsent(true);
  };

  return (
    <AnimatePresence>
      {!privacyConsent && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed bottom-6 left-6 z-[100] max-w-sm bg-void/90 backdrop-blur-md border border-white/20 p-4 shadow-2xl"
        >
          <p className="text-text-main text-xs font-mono mb-4 leading-relaxed tracking-wide">
            // STRICT PRIVACY PROTOCOL. We utilize decentralized, anonymized telemetry to optimize this platform. No corporate trackers. No sold data.
          </p>
          <button
            onClick={handleAcknowledge}
            className="text-yellow-electric hover:bg-yellow-electric/10 px-4 py-2 border border-yellow-electric text-[10px] font-mono tracking-widest transition-colors uppercase"
          >
            Acknowledge
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrivacyBanner;
