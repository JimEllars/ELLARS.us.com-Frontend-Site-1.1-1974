import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import SafeIcon from '@/common/SafeIcon';
import Honeypot from '@/components/common/Honeypot';

// Mock hook since useTelemetry wasn't explicitly provided, falling back gracefully
const useTelemetry = () => {
  return {
    trackEvent: (eventName, data) => {
      console.log(`[Telemetry Mock] ${eventName}`, data);
    }
  };
};

const DonateModal = () => {
  const { isDonateModalOpen, setDonateModalOpen } = useAppStore();
  const [selectedTier, setSelectedTier] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDonateModalOpen(false);
      }
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, input[type="number"]'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    if (isDonateModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // set focus to the first element when modal opens
      setTimeout(() => {
        const focusableElements = modalRef.current?.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, input[type="number"]'
        );
        if (focusableElements && focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }, 100);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDonateModalOpen, setDonateModalOpen]);
  const [botValue, setBotValue] = useState('');
  const { trackEvent } = useTelemetry();

  const tiers = [10, 25, 50, 100];

  useEffect(() => {
    if (!isDonateModalOpen) {
      setSelectedTier(null);
      setCustomAmount('');
      setBotValue('');
    }
  }, [isDonateModalOpen]);

  useEffect(() => {
    if (isDonateModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isDonateModalOpen]);

  const handleTierSelect = (tier) => {
    setSelectedTier(tier);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    setCustomAmount(e.target.value);
    setSelectedTier(null);
  };

  const handleConfirm = () => {
    if (botValue) {
      setDonateModalOpen(false);
      return;
    }
    const amount = selectedTier || customAmount;
    if (!amount) return;

    console.log(`[DonateModal] Processing contribution: $${amount}`);
    trackEvent('Initiate_Contribution', { amount });

    const donationLink = import.meta.env.VITE_DONATION_LINK || 'https://example.com/donate';

    // Attempting external routing
    window.open(donationLink, '_blank', 'noopener,noreferrer');

    // Optional: close modal after confirming
    setDonateModalOpen(false);
  };

  return (
    <AnimatePresence>
      {isDonateModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-void/95 backdrop-blur-xl"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            ref={modalRef}
            className="relative w-full max-w-md bg-void border border-yellow-electric shadow-[0_0_40px_rgba(250,204,21,0.15)] rounded-sm p-8"
          >
            <button
              onClick={() => setDonateModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-yellow-electric transition-colors"
            >
              <SafeIcon name="X" className="w-6 h-6" />
            </button>

            <Honeypot value={botValue} onChange={(e) => setBotValue(e.target.value)} />

            <div className="text-center mb-8">
              <h2 className="font-editorial text-2xl font-black text-white uppercase tracking-tighter mb-2">
                Fund The <span className="text-yellow-electric">Vision</span>
              </h2>
              <p className="font-mono text-xs text-zinc-400 tracking-widest uppercase">
                Support The All-American Tax Credit
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {tiers.map((tier) => (
                <button
                  key={tier}
                  onClick={() => handleTierSelect(tier)}
                  className={`py-4 border font-editorial font-black text-xl transition-all duration-200 ${
                    selectedTier === tier
                      ? 'bg-yellow-electric border-yellow-electric text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]'
                      : 'border-white/20 text-white hover:border-yellow-electric/50 hover:bg-yellow-electric/10'
                  }`}
                >
                  ${tier}
                </button>
              ))}
            </div>

            <div className="mb-8">
              <label className="block font-mono text-[10px] text-zinc-500 tracking-widest uppercase mb-2">
                Custom Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-editorial text-xl text-zinc-400">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="w-full bg-transparent border border-white/20 p-4 pl-10 font-editorial text-xl text-white placeholder-zinc-700 focus:outline-none focus:border-yellow-electric transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={!selectedTier && !customAmount}
              className={`w-full py-4 font-editorial font-black text-lg tracking-widest uppercase transition-all duration-300 ${
                selectedTier || customAmount
                  ? 'bg-yellow-electric text-black hover:bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              Confirm Contribution
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DonateModal;
