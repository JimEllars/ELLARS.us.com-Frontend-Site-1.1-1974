import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasError, setHasError] = useState(false);


  const handleSubmit = (e) => {
    e.preventDefault();

    // Clean strings and check email pattern
    const sanitizedEmail = DOMPurify.sanitize(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
        setHasError(true);
        return;
    }

    setIsSubmitting(true);
    setHasError(false);


    const payload = {
      email: sanitizedEmail,
      lead_origin: "frontend_brand_hub_v5.10"
    };
    console.log("Telemetry Payload:", payload);

    // Simulate API call with potential error simulation or just success
    setTimeout(() => {
      setEmail('');
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  return (
    <section className="py-32 border-t border-white/5 relative z-10">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <span className="font-editorial text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-6">Strategic Access</span>
        <h2 className="font-editorial font-black text-4xl md:text-6xl text-white mb-8">
          JOIN THE <span className="text-yellow-electric">NEWSLETTER.</span>
        </h2>
        <p className="text-xl text-text-muted font-light mb-12 max-w-2xl mx-auto">
          Gain exclusive access to technical dispatches and strategic insight before public release.
        </p>
        <div className="min-h-[80px]">

          <AnimatePresence mode="wait">
            {!success ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto"
                name="newsletter-signup"
                method="POST"
                action="/api/leads/submit"
              >
                <div className="flex-grow relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (hasError) setHasError(false);
                    }}
                    placeholder="YOUR EMAIL ADDRESS"
                    className={`w-full bg-white/5 border text-white px-6 py-5 font-editorial text-xs tracking-widest outline-none focus:border-yellow-electric transition-colors rounded-sm ${hasError ? 'border-red-500' : 'border-white/10'}`}
                    required
                    disabled={isSubmitting}
                  />
                  {hasError && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute left-0 -bottom-6 text-red-500 text-[10px] font-mono tracking-widest uppercase"
                    >
                      [INVALID_TRANSMISSION]
                    </motion.span>
                  )}
                </div>
                <button
                  disabled={isSubmitting}
                  type="submit"
                  name="submit"
                  className="bg-white text-black font-editorial font-bold text-xs uppercase tracking-widest px-10 py-5 hover:bg-yellow-electric transition-colors rounded-sm shadow-[0_0_15px_rgba(253,224,71,0.4)] disabled:opacity-50 relative overflow-hidden"
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
                        <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
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
                className="deco-frame border border-yellow-electric/30 bg-surface px-8 py-6 max-w-2xl mx-auto rounded-sm animate-pulse shadow-[0_0_15px_rgba(253,224,71,0.4)] will-change-transform"
              >
                <div className="font-mono text-lg tracking-widest text-[#4ade80] uppercase">
                  [SIGNAL_RECEIVED_THANK_YOU]
                </div>
                <div className="text-[10px] text-text-muted font-editorial uppercase tracking-widest mt-2">
                  SECURE TRANSMISSION CONFIRMED
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </section>
  );
};

export default Newsletter;
