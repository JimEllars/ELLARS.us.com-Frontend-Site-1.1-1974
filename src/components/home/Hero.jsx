import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '@/common/SafeIcon';

const Hero = () => {
  return (
    <header className="relative min-h-[95vh] flex items-center pt-24 pb-12 overflow-hidden bg-grid">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center relative z-10 w-full"
      >
        
        <div className="lg:col-span-7 order-2 lg:order-1">
          <div className="inline-flex items-center space-x-3 mb-8 border border-white/20 rounded-sm px-4 py-1.5 bg-white/5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-phthalo-glow animate-pulse"></span>
            <span className="font-editorial text-[10px] font-bold uppercase tracking-widest text-gray-300">UNITED STATES OF AMERICA</span>
          </div>
          
          <h1 className="font-editorial font-black text-5xl md:text-7xl lg:text-[85px] leading-[0.95] text-white mb-8">
            COMMUNITY. <br />
            POLITICS. <br />
            <span className="text-electric-gold">CONSCIOUS IDEAS.</span>
          </h1>
          
          <p className="text-xl md:text-2xl font-light text-text-muted mb-12 max-w-2xl leading-relaxed">
            Leading the modernization of American civic infrastructure through <span className="text-white font-medium">private-sector rigor</span> and algorithmic economic equity.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6">
            <Link to="/rants" className="bg-white text-black px-10 py-5 font-editorial font-bold text-xs uppercase tracking-widest hover:bg-gradient-to-r hover:from-phthalo-glow hover:to-purple-neon hover:text-white hover:border-transparent transition-all duration-300 text-center rounded-sm shadow-xl">
              Listen to Rants
            </Link>
            <Link to="/platform" className="btn-gold flex items-center justify-center group">
              Explore Platform <SafeIcon name="ArrowRight" className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
        
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="relative">
            <div className="aspect-[3/4] overflow-hidden rounded-sm glass-panel p-2 relative group shadow-2xl">
              <div className="w-full h-full relative overflow-hidden bg-black rounded-sm">
                <img 
                  src="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp"
                  alt="James Ellars" 
                  className="w-full h-full object-cover grayscale contrast-125  group-hover:scale-105 transition-all duration-1000 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
              </div>
            </div>
            <div className="absolute -bottom-8 -left-8 glass-panel p-6 shadow-2xl border-l-2 border-phthalo-glow w-64 hidden md:block z-20">
              <p className="font-editorial text-[10px] text-phthalo-glow uppercase tracking-widest font-bold mb-1">Mission</p>
              <p className="text-white font-medium text-sm leading-snug">Building Strong and Healthy Communities through Forward-Thinking Systems and Infrastructure.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </header>
  );
};

export default Hero;