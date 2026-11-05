import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

const PrivacyBanner = () => {
  const { privacyConsent, setPrivacyConsent } = useAppStore();
  const { pathname } = useLocation();
  // The banner is mounted by Layout on every route. On /privacy itself the
  // affordance pointed at the page the reader was already on, so it is dropped.
  const onPolicyPage = pathname.replace(/\/+$/, '') === '/privacy';

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
            // PRIVACY. First-party telemetry, cookie-less analytics, bot protection, and
            Google-served fonts. No ad networks. No sold data.{' '}
            {!onPolicyPage && (
              <Link to="/privacy" className="text-yellow-electric underline decoration-yellow-electric/30 hover:decoration-yellow-electric">
                Read the policy
              </Link>
            )}
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
