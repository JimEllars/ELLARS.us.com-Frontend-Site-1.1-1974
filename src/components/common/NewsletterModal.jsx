import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { useAppStore } from '@/store/useAppStore';
import SafeIcon from '@/common/SafeIcon';
import Honeypot from '@/components/common/Honeypot';
import { subscribeToNewsletter } from '@/lib/email';
import { useTelemetry } from '@/hooks/useTelemetry';

const NewsletterModal = () => {
  const { isNewsletterModalOpen, setNewsletterModalOpen, showToast } = useAppStore();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [botValue, setBotValue] = useState('');
  const [success, setSuccess] = useState(false);

  const modalRef = useRef(null);
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);
  const { trackEvent } = useTelemetry();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNewsletterModalOpen(false);
      }
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="email"], input[type="radio"], input[type="checkbox"], select, input[type="number"]'
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

    if (isNewsletterModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        const focusableElements = modalRef.current?.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="email"], input[type="radio"], input[type="checkbox"], select, input[type="number"]'
        );
        if (focusableElements && focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }, 100);

      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
          'expired-callback': () => {
            if (widgetIdRef.current) {
              window.turnstile.reset(widgetIdRef.current);
            }
          }
        });
      }
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNewsletterModalOpen, setNewsletterModalOpen]);

  useEffect(() => {
    if (!isNewsletterModalOpen) {
      setEmail('');
      setBotValue('');
      setHasError(false);
      setSuccess(false);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    }
  }, [isNewsletterModalOpen]);

  useEffect(() => {
    if (isNewsletterModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isNewsletterModalOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (botValue) {
      setNewsletterModalOpen(false);
      return;
    }

    const sanitizedEmail = DOMPurify.sanitize(email, { ALLOWED_TAGS: [] })
      .replace(/<\/?script.*?>/gi, "")
      .replace(/[<>&"']/g, function(m) { return "&#" + m.charCodeAt(0) + ";"; })
      .trim()
      .toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
        setHasError(true);
        showToast('Please enter a valid email address.');
        return;
    }

    setIsSubmitting(true);
    setHasError(false);

    try {
      const turnstileToken = window.turnstile && widgetIdRef.current ? window.turnstile.getResponse(widgetIdRef.current) : null;

      const payload = { email: sanitizedEmail, turnstileToken, source: 'navbar_modal' };
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Submission timed out')), 8000)
      );

      await Promise.race([
        subscribeToNewsletter(payload),
        timeoutPromise
      ]);

      trackEvent('newsletter_subscribed', { source: 'navbar_modal' });
      setSuccess(true);
      showToast('Successfully subscribed to the newsletter!');

      setTimeout(() => {
        setNewsletterModalOpen(false);
      }, 2000);

    } catch (error) {
      console.error("Newsletter modal subscription error:", error);
      setHasError(true);
      if (error.message === 'Submission timed out') {
         showToast("[NETWORK_TIMEOUT_RETRY]");
      } else {
         showToast("Failed to subscribe. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isNewsletterModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-void/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Newsletter Subscription"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            ref={modalRef}
            className="relative w-full max-w-md bg-void border border-yellow-electric shadow-[0_0_40px_rgba(250,204,21,0.15)] rounded-sm p-8 deco-frame"
          >
            <button
              onClick={() => setNewsletterModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-yellow-electric transition-colors"
              aria-label="Close Newsletter Modal"
            >
              <SafeIcon name="X" className="w-6 h-6" />
            </button>

            <form onSubmit={handleSubmit} name="navbar-newsletter" method="POST">
              <Honeypot value={botValue} onChange={(e) => setBotValue(e.target.value)} />
              <div ref={turnstileRef} className="hidden" />

              <div className="text-center mb-8">
                <h2 className="font-editorial text-2xl font-black text-white uppercase tracking-tighter mb-2">
                  JOIN THE <span className="text-yellow-electric">NEWSLETTER</span>
                </h2>
                <p className="font-mono text-xs text-zinc-400 tracking-widest uppercase">
                  Strategic Access & Technical Dispatches
                </p>
              </div>

              <div className="mb-8 relative">
                <label htmlFor="modal-email" className="block font-mono text-[10px] text-zinc-500 tracking-widest uppercase mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="modal-email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (hasError) setHasError(false);
                  }}
                  className={`w-full bg-transparent border p-4 font-editorial text-xl text-white placeholder-zinc-700 focus:outline-none transition-colors ${
                    hasError ? 'border-red-500' : 'border-white/20 focus:border-yellow-electric'
                  }`}
                  placeholder="name@domain.com"
                  disabled={isSubmitting || success}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email || success}
                className={`w-full py-4 font-editorial font-black text-lg tracking-widest uppercase transition-all duration-300 flex items-center justify-center space-x-2 ${
                  email && !isSubmitting && !success
                    ? 'bg-yellow-electric text-black hover:bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <AnimatePresence mode="wait">
                  {isSubmitting ? (
                    <motion.span
                      key="submitting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center space-x-2"
                    >
                      <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
                      <span>ENCRYPTING...</span>
                    </motion.span>
                  ) : success ? (
                    <motion.span
                      key="success"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      VERIFIED
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      SECURE ACCESS
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewsletterModal;
