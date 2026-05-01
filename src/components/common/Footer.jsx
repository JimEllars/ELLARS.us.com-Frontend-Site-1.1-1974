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
              JAMES <span className="text-electric-gold">ELLARS</span>
            </span>
            <span className="text-text-muted text-sm">James Ellars // Systems & Strategy</span>
          </div>
          
          <div className="flex space-x-8">
            <a href="https://twitter.com/ellars" target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-electric transition-colors">
              <SafeIcon name="Twitter" className="w-6 h-6" />
            </a>
            <a href="https://www.instagram.com/ellarsjames" target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-electric transition-colors">
              <SafeIcon name="Instagram" className="w-6 h-6" />
            </a>
            <a href="https://www.tiktok.com/@ellars" target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-electric transition-colors">
              <SafeIcon name="Video" className="w-6 h-6" />
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
