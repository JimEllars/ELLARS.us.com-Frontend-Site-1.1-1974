import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import SafeIcon from '@/common/SafeIcon';
import Honeypot from '@/components/common/Honeypot';
import { subscribeToNewsletter } from '@/lib/email';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [botValue, setBotValue] = useState('');
  const [startTime, setStartTime] = useState(Date.now());

  const handleSubmit = async (e) => {
    e.preventDefault();

        if (Date.now() - startTime < 1500) {
      setEmail('');
      setBotValue('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      return;
    }

    if (botValue) {
      setEmail('');
      setBotValue('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      return;
    }

    const sanitizedEmail = DOMPurify.sanitize(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      setHasError(true);
      return;
    }

    setIsSubmitting(true);
    setHasError(false);    try {
      const payload = { email: sanitizedEmail };
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Submission timed out')), 8000)
      );
      await Promise.race([
        subscribeToNewsletter(payload),
        timeoutPromise
      ]);
      setEmail('');
      setBotValue('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      setHasError('TIMEOUT'); // Custom error state instead of true for timeout
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-void border-t border-white/10 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-12 mb-16">

          {/* Brand Anchor (Left) - Spans 4 cols */}
          <div className="lg:col-span-4 flex flex-col">
            <span className="font-editorial font-black text-2xl tracking-tighter text-white block mb-2">
              JAMES <span className="text-yellow-electric">ELLARS</span>
            </span>
            <span className="text-text-muted text-sm mb-6 max-w-sm">
              Leading American Innovation through Sustainable Systems, Forward-Thinking Ideas and a Blue-Collar Work Ethic.
            </span>
            <div className="flex space-x-6">
              <a href="https://x.com/JamesEllars" target="_blank" rel="noopener noreferrer" className="group relative inline-block text-white hover:text-yellow-electric hover:-translate-y-1 transition-all duration-300 external-link" aria-label="X (Twitter)">
                <SafeIcon name="Twitter" className="w-5 h-5" />
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 absolute -top-1 -right-2 text-yellow-electric/70 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
              </a>
              <a href="https://linkedin.com/in/jamesellars" target="_blank" rel="noopener noreferrer" className="group relative inline-block text-white hover:text-yellow-electric hover:-translate-y-1 transition-all duration-300 external-link" aria-label="LinkedIn">
                <SafeIcon name="Linkedin" className="w-5 h-5" />
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 absolute -top-1 -right-2 text-yellow-electric/70 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
              </a>
              <a href="https://youtube.com/@JamesEllars" target="_blank" rel="noopener noreferrer" className="group relative inline-block text-white hover:text-yellow-electric hover:-translate-y-1 transition-all duration-300 external-link" aria-label="YouTube">
                <SafeIcon name="Youtube" className="w-5 h-5" />
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 absolute -top-1 -right-2 text-yellow-electric/70 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
              </a>
            </div>
          </div>
          
          {/* Sitemap (Center) - Spans 4 cols */}
          <div className="lg:col-span-4 flex flex-col">
            <h3 className="font-editorial font-bold text-xs uppercase tracking-widest text-white mb-6">Sitemap</h3>
            <nav className="flex flex-col space-y-4">
              <Link to="/about" className="text-zinc-500 hover:text-yellow-electric transition-colors uppercase tracking-widest text-xs font-deco" aria-label="About Page">About</Link>
              <Link to="/platform" className="text-zinc-500 hover:text-yellow-electric transition-colors uppercase tracking-widest text-xs font-deco" aria-label="Platform Page">Platform</Link>
              <Link to="/news-media" className="text-zinc-500 hover:text-yellow-electric transition-colors uppercase tracking-widest text-xs font-deco" aria-label="News & Media Page">News & Media</Link>
            </nav>
          </div>

          {/* Global Capture (Right) - Spans 4 cols */}
          <div className="lg:col-span-4 flex flex-col">
            <h3 className="font-editorial font-bold text-xs uppercase tracking-widest text-white mb-6">Stay Informed</h3>
            <div className="min-h-[80px]">
              <AnimatePresence mode="wait">
                {!success ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-3"
                    name="footer-newsletter-signup"
                    method="POST"
                  >
                    <Honeypot value={botValue} onChange={(e) => setBotValue(e.target.value)} />
                    <div className="relative">
                      <input
                        type="email"
                        id="footer-email"
                        name="email"
                        autoComplete="email"
                        autoCapitalize="off"
                        spellCheck="false"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (hasError) setHasError(false);
                        }}
                        onFocus={(e) => {
                          setTimeout(() => {
                            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                            e.target.scrollIntoView({
                              behavior: prefersReducedMotion ? "auto" : "smooth",
                              block: "center"
                            });
                          }, 300);
                        }}
                        placeholder="YOUR EMAIL ADDRESS"
                        className={`w-full bg-white/5 border text-white px-4 py-3 font-editorial text-xs tracking-widest outline-none transition-colors rounded-sm ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-white/10 focus:border-yellow-electric'}`}
                        required
                        disabled={isSubmitting}
                      />
                      {hasError && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute left-0 -bottom-5 text-red-500 text-[9px] font-mono tracking-widest uppercase"
                        >
                          [INVALID_TRANSMISSION]
                        </motion.span>
                      )}
                    </div>
                    <button
                      disabled={isSubmitting}
                      type="submit"
                      name="submit"
                      aria-label="Submit Newsletter Subscription"
                      className="bg-white text-black font-editorial font-bold text-xs uppercase tracking-widest px-6 py-3 hover:bg-yellow-electric transition-colors rounded-sm shadow-[0_0_15px_rgba(253,224,71,0.2)] disabled:opacity-50 relative overflow-hidden text-center mt-2"
                    >
                      <AnimatePresence mode="wait">
                        {isSubmitting ? (
                          <motion.span
                            key="submitting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center space-x-2"
                          >
                            <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></span>
                            <span>ENCRYPTING...</span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            Join the Newsletter
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="deco-frame border border-yellow-electric/30 bg-white/5 px-4 py-4 rounded-sm animate-pulse text-center will-change-transform"
                  >
                    <div className="font-mono text-[10px] tracking-widest text-[#4ade80] uppercase mb-1">
                      [SIGNAL_RECEIVED]
                    </div>
                    <div className="text-[9px] text-text-muted font-editorial uppercase tracking-widest">
                      TRANSMISSION CONFIRMED
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-zinc-600 text-[10px] uppercase tracking-widest font-editorial font-bold">
            &copy; {new Date().getFullYear()} James Ellars. All Rights Reserved. An independent policy and advocacy initiative.
          </div>
          <div className="flex space-x-6 text-zinc-600 text-[10px] uppercase tracking-widest font-editorial font-bold">
            <Link to="#" className="hover:text-white transition-colors" aria-label="Privacy Policy">Privacy Policy</Link>
            <Link to="#" className="hover:text-white transition-colors" aria-label="System Logistics">System Logistics</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
