import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import Honeypot from '@/components/common/Honeypot';
import { submitVolunteerForm } from '@/lib/volunteer';
import { toast } from 'react-toastify';

const Volunteer = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    zipCode: '',
    interests: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [botValue, setBotValue] = useState('');

  const interestOptions = [
    'Phone Banking',
    'Door Knocking',
    'Data/Tech',
    'Event Support',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleInterestToggle = (interest) => {
    setFormData(prev => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests };
    });
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (botValue) {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(true);
        setFormData({ firstName: '', lastName: '', email: '', phone: '', zipCode: '', interests: [], message: '' });
      }, 500);
      return;
    }

    // Sanitize basic inputs
    const sanitizedFirstName = DOMPurify.sanitize(formData.firstName).trim();
    const sanitizedLastName = DOMPurify.sanitize(formData.lastName).trim();
    const sanitizedEmail = DOMPurify.sanitize(formData.email).trim().toLowerCase();
    const sanitizedPhone = DOMPurify.sanitize(formData.phone).trim();
    const sanitizedZipCode = DOMPurify.sanitize(formData.zipCode).trim();

    // Basic Validation
    if (!sanitizedFirstName || !sanitizedLastName || !sanitizedEmail || !sanitizedZipCode) {
      setErrorMessage("Required fields are missing.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      setErrorMessage("Invalid email format.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        zipCode: sanitizedZipCode,
        interests: formData.interests
      };

      await submitVolunteerForm(payload);

      setIsSubmitting(false);
      setIsSuccess(true);
      toast.success("Enlistment confirmed.", {
        theme: "dark",
        style: { border: '1px solid #fde047', background: '#0a0a0a', color: '#fde047' }
      });
    } catch (error) {
      console.error("Volunteer form submission error:", error);
      setIsSubmitting(false);
      setErrorMessage(error.message || "Transmission failed. Please try again later.");
      toast.error("Transmission failed.", {
        theme: "dark",
        style: { border: '1px solid #ef4444', background: '#0a0a0a', color: '#ef4444' }
      });
    }
  };

  return (
    <div className="min-h-screen bg-void pt-32 pb-24 px-6 relative w-full overflow-hidden flex flex-col items-center">
      <Helmet>
        <title>Volunteer | James Ellars | Official</title>
        <meta name="description" content="Join the initiative. Grassroots action and community-driven infrastructure to fight corporate monopolies." />
        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid opacity-30 z-0 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-yellow-electric/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="max-w-3xl w-full relative z-10">

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex justify-center mb-6">
            <span className="text-yellow-electric font-mono text-[10px] tracking-[0.3em] uppercase border border-yellow-electric/20 px-3 py-1 bg-yellow-electric/5">
              Initiative Enlistment
            </span>
          </div>
          <h1 className="font-editorial font-black text-4xl md:text-5xl text-white tracking-tighter uppercase mb-6">
            JOIN THE <span className="text-yellow-electric">INITIATIVE</span>
          </h1>
          <p className="text-text-muted text-sm md:text-base max-w-2xl mx-auto font-inter font-light leading-relaxed">
            Grassroots action is the foundation of our movement. We must build community-driven infrastructure to fight corporate monopolies and implement the People-First Economy. Enlist today to secure the future of American innovation.
          </p>
          <div className="deco-divider mx-auto w-1/2"></div>
        </motion.div>

        {/* Form Container */}
        <div className="w-full relative">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="form-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="deco-frame bg-surface/50 backdrop-blur-md p-8 md:p-12 relative"
              >
                 <div className="deco-brackets"></div>

                 <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                    {/* Name Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col">
                        <label htmlFor="firstName" className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-2">First Name *</label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          required
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="bg-zinc-900 border border-white/10 text-white px-4 py-3 font-inter text-sm outline-none focus:border-yellow-electric transition-colors"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label htmlFor="lastName" className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-2">Last Name *</label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          required
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="bg-zinc-900 border border-white/10 text-white px-4 py-3 font-inter text-sm outline-none focus:border-yellow-electric transition-colors"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Contact Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col">
                        <label htmlFor="email" className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-2">Email Address *</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="bg-zinc-900 border border-white/10 text-white px-4 py-3 font-inter text-sm outline-none focus:border-yellow-electric transition-colors"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label htmlFor="phone" className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-2">Phone Number (Optional)</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="bg-zinc-900 border border-white/10 text-white px-4 py-3 font-inter text-sm outline-none focus:border-yellow-electric transition-colors"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex flex-col">
                      <label htmlFor="zipCode" className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-2">Zip Code *</label>
                      <input
                        type="text"
                        id="zipCode"
                        name="zipCode"
                        required
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className="bg-zinc-900 border border-white/10 text-white px-4 py-3 font-inter text-sm outline-none focus:border-yellow-electric transition-colors md:w-1/2"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Interests */}
                    <div className="flex flex-col mt-4">
                      <label className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-4">Areas of Interest</label>
                      <div className="flex flex-wrap gap-3">
                        {interestOptions.map(interest => (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => handleInterestToggle(interest)}
                            disabled={isSubmitting}
                            className={`px-4 py-2 text-xs font-inter uppercase tracking-wider transition-all duration-300 border ${
                              formData.interests.includes(interest)
                                ? 'bg-yellow-electric/10 border-yellow-electric text-yellow-electric shadow-[0_0_10px_rgba(253,224,71,0.2)]'
                                : 'bg-transparent border-white/10 text-text-muted hover:border-white/30'
                            }`}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Error Display */}
                    {errorMessage && (
                       <motion.div
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         className="text-red-500 text-[10px] font-mono tracking-widest uppercase mt-2 p-3 bg-red-500/10 border border-red-500/20"
                       >
                         [ERROR] {errorMessage}
                       </motion.div>
                    )}

                    {/* Submit Button */}
                    <div className="mt-8">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-transparent text-yellow-electric border border-yellow-electric px-8 py-4 font-editorial font-bold uppercase tracking-[0.2em] text-xs transition-all duration-300 hover:bg-yellow-electric/10 disabled:opacity-50 relative overflow-hidden text-center"
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
                              <span className="w-1.5 h-1.5 bg-yellow-electric rounded-full animate-pulse"></span>
                              <span>TRANSMITTING...</span>
                            </motion.span>
                          ) : (
                            <motion.span
                              key="idle"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              ENLIST NOW
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>

                 </form>
              </motion.div>
            ) : (
              <motion.div
                key="success-container"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="deco-frame border border-yellow-electric/30 bg-surface/80 p-12 text-center will-change-transform"
              >
                <div className="deco-brackets"></div>
                <div className="flex justify-center mb-6">
                   <div className="w-12 h-12 rounded-full bg-phthalo-glow/20 flex items-center justify-center border border-[#4ade80]/50 animate-pulse">
                     <div className="w-4 h-4 bg-[#4ade80] rounded-full"></div>
                   </div>
                </div>
                <div className="font-mono text-sm md:text-base tracking-widest text-[#4ade80] uppercase mb-4">
                  // ENLISTMENT CONFIRMED. TRANSMISSION SECURED.
                </div>
                <div className="text-xs text-text-muted font-inter uppercase tracking-widest leading-loose">
                  Your data has been securely logged in our systems. <br className="hidden md:block" />
                  Stand by for further operational directives.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default Volunteer;
