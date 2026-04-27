import React, { useState } from 'react';
import { toast } from 'react-toastify';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API delay
    setTimeout(() => {
      toast.success("Transmission Received. Welcome to the Vanguard.", {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        style: {
          background: '#050505',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif'
        }
      });
      setEmail('');
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <section className="py-32 border-t border-white/5 relative z-10">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <span className="font-editorial text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-6">Strategic Access</span>
        <h2 className="font-editorial font-black text-4xl md:text-6xl text-white mb-8">
          JOIN THE <span className="text-electric-gold">VANGUARD.</span>
        </h2>
        <p className="text-xl text-text-muted font-light mb-12 max-w-2xl mx-auto">
          Gain exclusive access to technical dispatches and strategic insight before public release.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="YOUR EMAIL ADDRESS" 
            className="flex-grow bg-white/5 border border-white/10 text-white px-6 py-5 font-editorial text-xs tracking-widest outline-none focus:border-gold-base transition-colors rounded-sm disabled:opacity-50"
            required 
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-white text-black font-editorial font-bold text-xs uppercase tracking-widest px-10 py-5 hover:bg-gold-bright transition-colors rounded-sm shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
          >
            {isSubmitting ? 'TRANSMITTING...' : 'Join the Newsletter'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;