import React from 'react';
import { Link } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';

const Footer = () => {
  return (
    <footer className="bg-black border-t border-white/10 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8 text-center md:text-left">
          <div>
            <span className="font-editorial font-black text-2xl tracking-tighter text-white block mb-2">
              JAMES <span className="text-gradient-gold">ELLARS</span>
            </span>
            <span className="text-text-muted text-sm">Builder of Systems. Challenger of the Status Quo.</span>
          </div>
          
          <div className="flex space-x-8">
            <a href="#" className="text-text-muted hover:text-white transition-colors">
              <SafeIcon name="Twitter" className="w-6 h-6" />
            </a>
            <a href="#" className="text-text-muted hover:text-white transition-colors">
              <SafeIcon name="Linkedin" className="w-6 h-6" />
            </a>
            <a href="#" className="text-white hover:text-gold-base transition-colors">
              <SafeIcon name="Youtube" className="w-6 h-6" />
            </a>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-600 text-[10px] uppercase tracking-widest font-editorial font-bold">
            &copy; {new Date().getFullYear()} James Ellars. All Rights Reserved.
          </div>
          <div className="flex space-x-6 text-gray-600 text-[10px] uppercase tracking-widest font-editorial font-bold">
            <Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-white transition-colors">System Logistics</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;