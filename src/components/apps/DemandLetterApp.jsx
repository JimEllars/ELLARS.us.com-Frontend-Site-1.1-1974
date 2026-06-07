import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '@/common/SafeIcon';

const DemandLetterApp = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    partyName: '',
    partyAddress: '',
    grievanceDetails: '',
    resolutionDemands: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Stub API call
    console.log("Demand Letter Payload (AXIM Core Staging):", formData);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      // Reset form after success delay if needed, but for now just show success
    }, 2500);
  };

  // Thematic loading state matching the IRON MAN / DR DOOM requirement
  if (isSubmitting) {
    return (
      <div className="deco-frame p-8 sm:p-12 bg-void/90 backdrop-blur-md min-h-[400px] flex flex-col items-center justify-center border border-yellow-electric/30">
        <div className="relative flex flex-col items-center">
           <div className="w-20 h-20 border-2 border-yellow-electric/30 rounded-sm mb-8 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-yellow-electric/10 animate-pulse"></div>
             <motion.div
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               className="w-12 h-12 border-t-2 border-r-2 border-yellow-electric rounded-full"
             />
             <div className="absolute inset-2 border border-yellow-electric/20 rounded-full"></div>
           </div>
           <p className="font-mono text-yellow-electric text-sm tracking-[0.2em] uppercase blink">
             [SYNTHESIZING LEGAL DIRECTIVE]
           </p>
           <p className="font-mono text-text-muted text-[10px] tracking-widest mt-3 uppercase">
             Transmitting to Axim Core
           </p>
           <div className="w-48 h-1 bg-white/5 mt-6 relative overflow-hidden rounded-full">
             <motion.div
               initial={{ x: "-100%" }}
               animate={{ x: "100%" }}
               transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
               className="absolute top-0 left-0 w-1/2 h-full bg-yellow-electric/50"
             />
           </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="deco-frame p-8 sm:p-12 bg-void/90 backdrop-blur-md min-h-[400px] flex flex-col items-center justify-center border border-[#4ade80]/30 text-center">
        <div className="w-16 h-16 bg-[#4ade80]/10 border border-[#4ade80]/50 rounded-full flex items-center justify-center mb-6">
           <SafeIcon name="Check" className="w-8 h-8 text-[#4ade80]" />
        </div>
        <h3 className="font-editorial text-2xl text-white uppercase tracking-wider mb-2">Directive Executed</h3>
        <p className="text-text-muted text-sm font-light mb-8 max-w-md">
          The demand letter parameters have been securely stored in the Axim Core ledger. Awaiting formal generation protocol.
        </p>
        <button
          onClick={() => {
            setIsSuccess(false);
            setStep(1);
            setFormData({ partyName: '', partyAddress: '', grievanceDetails: '', resolutionDemands: '' });
          }}
          className="border border-yellow-electric/30 text-yellow-electric text-xs tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors px-6 py-3"
        >
          Initialize New Directive
        </button>
      </div>
    );
  }

  return (
    <div className="deco-frame p-6 sm:p-10 bg-void/60 backdrop-blur-md border border-white/10 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
        <div
          className="h-full bg-yellow-electric transition-all duration-500 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="flex justify-between items-center mb-10 mt-2">
        <div>
          <h2 className="tracking-[0.2em] uppercase font-deco font-normal text-xs text-yellow-electric mb-1">
            Micro-App Payload
          </h2>
          <h3 className="font-editorial text-2xl text-white">Demand Letter Generator</h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Step {step} of 3</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h4 className="font-mono text-sm text-white uppercase tracking-widest border-b border-white/10 pb-2 mb-4">
                01. Opposing Party Details
              </h4>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-widest mb-2">Party Name / Entity</label>
                <input
                  type="text"
                  name="partyName"
                  value={formData.partyName}
                  onChange={handleChange}
                  required
                  className="w-full bg-surface border border-white/10 focus:border-yellow-electric/50 focus:ring-1 focus:ring-yellow-electric/50 text-white p-3 rounded-sm text-sm outline-none transition-all"
                  placeholder="e.g. Acme Corporation"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-widest mb-2">Party Address</label>
                <input
                  type="text"
                  name="partyAddress"
                  value={formData.partyAddress}
                  onChange={handleChange}
                  required
                  className="w-full bg-surface border border-white/10 focus:border-yellow-electric/50 focus:ring-1 focus:ring-yellow-electric/50 text-white p-3 rounded-sm text-sm outline-none transition-all"
                  placeholder="e.g. 123 Corporate Blvd, Suite 100"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h4 className="font-mono text-sm text-white uppercase tracking-widest border-b border-white/10 pb-2 mb-4">
                02. Grievance Parameters
              </h4>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-widest mb-2">Factual Basis</label>
                <textarea
                  name="grievanceDetails"
                  value={formData.grievanceDetails}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full bg-surface border border-white/10 focus:border-yellow-electric/50 focus:ring-1 focus:ring-yellow-electric/50 text-white p-3 rounded-sm text-sm outline-none transition-all resize-none"
                  placeholder="Detail the exact nature of the dispute..."
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h4 className="font-mono text-sm text-white uppercase tracking-widest border-b border-white/10 pb-2 mb-4">
                03. Resolution Protocol
              </h4>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-widest mb-2">Demands for Resolution</label>
                <textarea
                  name="resolutionDemands"
                  value={formData.resolutionDemands}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full bg-surface border border-white/10 focus:border-yellow-electric/50 focus:ring-1 focus:ring-yellow-electric/50 text-white p-3 rounded-sm text-sm outline-none transition-all resize-none"
                  placeholder="State the specific remedies required..."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
          <button
            type="button"
            onClick={prevStep}
            className={`border border-white/20 text-white text-xs tracking-widest uppercase px-6 py-2 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'hover:bg-white/5'}`}
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="border border-yellow-electric/30 text-yellow-electric text-xs tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors px-6 py-2"
            >
              Proceed
            </button>
          ) : (
            <button
              type="submit"
              className="bg-yellow-electric text-void font-bold text-xs tracking-widest uppercase hover:bg-yellow-electric/90 transition-colors px-6 py-2 border border-yellow-electric"
            >
              Generate Protocol
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DemandLetterApp;
